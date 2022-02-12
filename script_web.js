import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.135.0/examples/jsm/controls/OrbitControls.js';
import {OBJLoader} from 'https://cdn.jsdelivr.net/npm/three@0.135.0/examples/jsm/loaders/OBJLoader.js';

let camera, controls, scene, renderer;
let input = document.querySelector('input');

let i,j;
let gx,gy,gz,delta;
let plot_scale = 3;
let current = 0;
let plot_events;
let matrix;
let trace_matrix = createMatrix ();
let event;
let semafor = true;
let m = 0;
let step_counter = 0;
let polyps = [];
let polyp_depth = 1;
let next = 10000;

// =====================================================

input.addEventListener('change', () => {
  let files = input.files;
  if (files.length == 0) return;

  const file = files[0];
  let reader = new FileReader();

  reader.onload = (e) => {
    // renderer.clear();
    const file = e.target.result;
    let sim = file.split(";\n");
    let sim_lines = [];
    for (i = 0; i < sim.length; i++) {
        sim_lines.push(sim[i].split(" , "));
    }
    // console.log(sim_lines);
    plot_events = getEvents(sim_lines);
    current = 0;
    main();
    setTimeout(()=> {
      requestAnimationFrame(render);
      // drawStatic();
    },600);

  window.addEventListener( 'resize', onWindowResize );
  };
  reader.onerror = (e) => alert(e.target.error.name);
  reader.readAsText(file);
});

// =====================================================
// =====================================================
// =====================================================

function main() {
    {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xeeeeee );
    scene.add( new THREE.GridHelper( 400, 10 ) );
    }

    {
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    }

    {
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1;
    const far = 1000;
    camera = new THREE.PerspectiveCamera(fov, aspect,near, far);
    camera.position.set(0, 70, 100);
    }

    {
      const dirLight1 = new THREE.DirectionalLight( 0xffffff );
      dirLight1.position.set( 1, 1, 1 );
      scene.add( dirLight1 );

      const dirLight2 = new THREE.DirectionalLight( 0x002288 );
      dirLight2.position.set( - 1, - 1, - 1 );
      scene.add( dirLight2 );

      const ambientLight = new THREE.AmbientLight( 0x222222 );
      scene.add( ambientLight );

      // const light = new THREE.AmbientLight(  0x404040,2.5 ); // soft white light
      // scene.add( light );
      // console.log("BBB",String(light.type));
    }
    
    const loader = new OBJLoader(); //0xffffff
    loader.load( 'sclerite.obj', function( sclerite ) { 
      // { color: 0xFF8133 * Math.random() } 
      let sclerite_material = new THREE.MeshBasicMaterial( { color: "red" } );
      sclerite.material = sclerite_material;
      sclerite.traverse( function (obj) {
          if (obj.isMesh){
            obj.material.color.set(0xFF8133);
            //  FFB6C1 
          }
        } );
      sclerite.scale.set(0.01,0.01,0.01);
      sclerite.name = "sclerite_template";
      scene.add( sclerite );
      sclerite.position.y =  10000;
      // let o1 = scene.getObjectByName("sclerite_temp")
      // console.log(1,o1);
    })

    const polyp_geometry = new THREE.CylinderGeometry( 4, 4, 14, 10, 10 );
    const polyp_material = new THREE.MeshPhongMaterial( { color: 0xAAB7B8 } );
    const polyp_mesh_master = new THREE.Mesh( polyp_geometry, polyp_material );
    polyp_mesh_master.scale.set(0.4,0.4,0.4);
    polyp_mesh_master.name = "polyp_template";
    polyp_mesh_master.position.x = 10000;
    scene.add(polyp_mesh_master);

    // controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.listenToKeyEvents( window ); // optional
}

// =====================================================
// =====================================================
// =====================================================
// =====================================================

// requestAnimationFrame passes the time since the page loaded to our function.
// That time is passed in milliseconds. I find it's much easier to work with seconds
// so here we're converting that to seconds.

function render(time) {
  time *= 1;  // convert unit of time to 1000*0.001 of a second
  scene.rotation.y = time/10000;
  // event = plot_events.shift();
  // doEvent(event);
  while(current < time && semafor)
  {
    try {
      // if (time > next){
        // next += 10;
        // camera.position.y += 0.01;
        // console.log(time,camera.position);        
      // };
      step_counter++;
      event = plot_events.shift();
      doEvent(event);
      current = event[1];
    } catch {
      // console.log("End time (ms):",time);
      semafor = false;
    }
  }
  
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

// =====================================================
// =====================================================
// =====================================================
// =====================================================

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

// =====================================================
// =====================================================
// =====================================================

function doEvent(event){
  let type,x1,y1,z1,x2,y2,z2;
  type = event[0];
  // time = event[1];
  x1 = event[2][0];
  y1 = event[2][1];
  z1 = event[2][2];
  x2 = event[3][0];
  y2 = event[3][1];
  z2 = event[3][2];
  switch (type)
  { // ---------------------
    // 1 -> (* diffusion  *)
    case "1" :
    moveObject(x1,y1,z1,x2,y2,z2,true);
    trace_matrix[x1][y1][1] -= 1;
    trace_matrix[x2][y2][1] += 1;
    if (trace_matrix[x1][y1][0] > 0) {
      moveObject(x1,y1,z1,x1,y1,Math.min(z1-1,m)-polyp_depth,false);
    };
    if (trace_matrix[x2][y2][0] > 0) {
      moveObject(x2,y2,z2,x2,y2,Math.min(z2+1,m)-polyp_depth,false);
    }
    break;
    // ---------------------
    // 2 -> (*  budding   *)
    case "2" :
    let polyp_template = scene.getObjectByName("polyp_template");
    drawObject(x2,y2,z2,polyp_template,false);
    trace_matrix[x2][y2][0] = 1;
    break;
    // ---------------------
    // 3 -> (* deposition *)
    case "3" :
    let sclerite_template = scene.getObjectByName("sclerite_template");
    drawObject(x2,y2,z2,sclerite_template,true);
    trace_matrix[x2][y2][1] += 1;
    break;
  } // ---------------------
}

// =====================================================

function drawObject(x,y,z,object_mesh,sclerite){
  let clone_mesh = object_mesh.clone();
  let object_kind;
  if (sclerite){
    object_kind = "sclerite"
    clone_mesh.name = "my_" + object_kind + "_" + String(x) + "_" + String(y) + "_" + String(z);
  } else {
    object_kind = "polyp"
    polyps.push([x,y]);
    clone_mesh.name = "my_" + object_kind + "_" + String(x) + "_" + String(y) + "_0";
    // clone_mesh.color = "black";
  };
  clone_mesh.position.x = (x-50)*plot_scale;
  clone_mesh.position.z = (y-50)*plot_scale;
  // ~~~~~~~~~~~~~~~~~~~~~~
  if (z>m){ 
    clone_mesh.position.y = z*plot_scale*0.3*100000; } 
  else { 
    clone_mesh.position.y = z*plot_scale*0.3; }
  // ~~~~~~~~~~~~~~~~~~~~~~  
  if (sclerite){
    clone_mesh.rotation.set(Math.PI*Math.random(),Math.PI*Math.random(),Math.PI*Math.random()); }
  // ~~~~~~~~~~~~~~~~~~~~~~
  scene.add( clone_mesh );
}

// =====================================================

function moveObject(x,y,z,new_x,new_y,new_z,sclerite_flag){
  let object_kind;
  let obj;
  if (sclerite_flag){
    object_kind = "sclerite";
    obj = scene.getObjectByName("my_" + object_kind + "_" + String(x) + "_" + String(y) + "_" + String(z));
    obj.name = "my_" + object_kind + "_" + String(new_x) + "_" + String(new_y) + "_" + String(new_z);
  } else {
    object_kind = "polyp"; 
    obj = scene.getObjectByName("my_" + object_kind + "_" + String(x) + "_" + String(y) + "_0" );
    obj.name = "my_" + object_kind + "_" + String(x) + "_" + String(y) + "_0" ; 
  }
  obj.position.x = (new_x-50)*plot_scale;
  obj.position.z = (new_y-50)*plot_scale;
  if (new_z > m){ obj.position.y = new_z*plot_scale*0.3*100000; 
  } else {
    obj.position.y = new_z*plot_scale*0.3;
  }
  if (sclerite_flag) {
    obj.rotation.set(Math.PI*Math.random(),Math.PI*Math.random(),Math.PI*Math.random()); 
  }
}

// =====================================================

function getEvents(simulation){
  let matrix = createMatrix();
  let time, event, x1,y1,z1,x2,y2,z2;
  let events = [];
  for (i = 0;i < simulation.length;i++){
    event = simulation[i];
    time = parseInt(1000*parseFloat(event[0]));
    x1 = event[2];
    y1 = event[3];
    x2 = event[4];
    y2 = event[5];
    // console.log(event[1],time,x1,y1,x2,y2);
    switch (event[1])
    {
      // 1 -> (* diffusion  *)
      case "1" :
      // console.log(event[0],"diffusion");
      z1 = matrix[x1][y1][0];
      matrix[x1][y1][0]--;
      matrix[x2][y2][0]++
      z2 = matrix[x2][y2][0];
      events.push(["1",time,[x1,y1,z1],[x2,y2,z2]]);
      break;
      // 2 -> (*  budding   *)
      case "2" :
      // console.log(event[0],"budding");
      matrix[x2][y2][1] = 1;
      events.push(["2",time,[0,0,0],[x2,y2,0]]);
      break;
      // 3 -> (* deposition *)
      case "3":
      // console.log(event[0],"deposition");
      matrix[x2][y2][0]++;
      z2 = matrix[x2][y2][0];
      events.push(["3",time,[0,0,0],[x2,y2,z2]]);
      break;
    }
  };
  m += matrix[50][45][0];
  m += matrix[45][50][0];
  m += matrix[55][50][0];
  m += matrix[50][55][0];
  m += matrix[50][50][0];
  m = Math.round(m/5);
  return events;
}

// =====================================================

function createMatrix (){
  let row;
  let mat = [];
  for (i = 0;i <= 100;i++){
    row = [];
    for (j = 0;j <= 100;j++){
      row.push([0,0])
    };
    mat.push(row)
  }
  return mat
}

// =====================================================
// =====================================================
