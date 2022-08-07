import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as colormap from 'colormap'
// init scene

const frequencySamples = 256
const timeSamples = 400
const data = new Uint8Array(frequencySamples)
const nVertices = (frequencySamples + 1) * (timeSamples + 1);
let xSegments = timeSamples;
let ySegments = frequencySamples;
let xSize = 40;
let ySize = 20;
let xHalfSize = xSize / 2;
let yHalfSize = ySize / 2;
let xSegmentSize = xSize / xSegments; //Size of one square
let ySegmentSize = ySize / ySegments;
 

function initialUserInput() {
  return new Promise((resolve) => {
    document.getElementById("btn").addEventListener('click',function() {
        /// do something to process the answer
        let overlay = document.getElementById("overlay")
        overlay.style.opacity = 0;
        setTimeout(()=>{
      
        overlay.style.visibility = "hidden"
      
        },500)
        resolve(true);
    }, {once: true});
  });
}
 
await initialUserInput()
console.log("hello") 
//Init audio 
const ACTX = new AudioContext();
const ANALYSER = ACTX.createAnalyser();
ANALYSER.fftSize = 4 * frequencySamples;
ANALYSER.smoothingTimeConstant = 0.5;

const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false } })

const SOURCE = ACTX.createMediaStreamSource(mediaStream);

SOURCE.connect(ANALYSER);
console.log(SOURCE)

let paused = false

document.body.onkeyup = function(e) {
  if (e.key == " " ||
      e.code == "Space" ||      
      e.keyCode == 32      
  ) { 
    paused = !paused;
  }
}

const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(20, width / height, 1, 1000);

    camera.position.set( 0, 0, 75 );

    
 
    const scene = new THREE.Scene();

    const geometry = new THREE.BufferGeometry();
    let indices = [];
    let heights = [];
    let vertices = [];

    const yPowMax = Math.log(ySize);
    const yBase = Math.E
    // generate vertices for a simple grid geometry
    for (let i = 0; i <= xSegments; i++) {
      let x = (i * xSegmentSize) - xHalfSize; //midpoint of mesh is 0,0
      for (let j = 0; j <= ySegments; j++) {
        let pow = (ySegments - j) / ySegments * yPowMax;
        let y = -Math.pow(yBase, pow) + yHalfSize + 1;
        vertices.push(x, y, 0);
        heights.push(0); // for now our mesh is flat, so heights are zero
      }
    }

    for (let i = 0; i < xSegments; i++) {
      for (let j = 0; j < ySegments; j++) {
        let a = i * (ySegments + 1) + (j + 1);
        let b = i * (ySegments + 1) + j;
        let c = (i + 1) * (ySegments + 1) + j;
        let d = (i + 1) * (ySegments + 1) + (j + 1);
        // generate two faces (triangles) per iteration
        indices.push(a, b, d); // face one
        indices.push(b, c, d); // face two
      }
    }
    geometry.setIndex(indices);
    heights = new Uint8Array(heights);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('displacement', new THREE.Uint8BufferAttribute(heights, 1));

    const colors = colormap({
      //inferno, electric 
      colormap: 'electric',
      nshades: 256,
      format: 'rgba',
      alpha: 1
    })
    colors[0] = [0, 0, 0, 0]
    console.log(colors)
    const lut = colors.map(color => {
      const red = color[0] / 255
      const green = color[1] / 255
      const blue = color[2] / 255

      return new THREE.Vector3(red, green, blue)
    })
    console.log(lut)
    //Grab the shaders from the document
    var vShader = document.getElementById('vertexshader');
    var fShader = document.getElementById('fragmentshader');
    // Define the uniforms. V3V gives us a 3vector for RGB color in out LUT
    var uniforms = {
      vLut: { type: "v3v", value: lut }
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const container = document.getElementById('Spectrogram');

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI/2; 
    controls.minPolarAngle = Math.PI/2;
    controls.minAzimuthAngle = 5*Math.PI/3; 
    controls.maxAzimuthAngle = -5*Math.PI/3; 

    controls.update();
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vShader.text,
      fragmentShader: fShader.text
    });

    const mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);
    //mesh.geometry.computeFaceNormals();
    mesh.geometry.computeVertexNormals();

    
    // ---

    const animate = function () {

      requestAnimationFrame(animate);
      controls.update();
      
      render()
    }

    const render = function () {
      if (!paused) {
        updateGeometry()
      }; 
      
      renderer.render(scene, camera);
    }

    const updateGeometry = function () {
      ANALYSER.getByteFrequencyData(data);
      const startVal = frequencySamples + 1;
      const endVal = nVertices - startVal;
      heights.copyWithin(0, startVal, nVertices + 1);
      heights.set(data, endVal - startVal);
      mesh.geometry.setAttribute('displacement', new THREE.Uint8BufferAttribute(heights, 1));

    }

    animate();




