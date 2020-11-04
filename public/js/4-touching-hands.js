// CONNECTED USERS HANDS

import * as THREE from '../three/three.module.js';
import Stats from '../three/stats.module.js';
import { OrbitControls } from '../three/OrbitControls.js';
import { MarchingCubes } from '../three/MarchingCubes.js';

// SCENE SETUP
let container, stats;
let camera, scene, renderer;
let light, pointLight, ambientLight;
const lightXPos = 1.5;
const lightYPos = 0.5;
const lightZPos = 0.8;

// MARCHING CUBES
const resolution = 48;
let effect;

// HAND TRACKING
const video = document.getElementById("video");
let videoWidth, videoHeight;
let model = null;
const modelParams = {
    flipHorizontal: true, // flip e.g for video  
    maxNumBoxes: 1, // maximum number of boxes to detect
    iouThreshold: 0.5, // ioU threshold for non-max suppression
    scoreThreshold: 0.6, // confidence threshold for predictions.
}

// SOCKET.IO
const socket = io();
let hands = [];

// RUN CODE
init();

// INITIALISE HANDTRACK.JS THEN CALL MAIN()
function init() {

    socket.on("connect", () => {
        console.log("my id: " + socket.id);
    });

    handTrack.load(modelParams).then(lmodel => {
        model = lmodel
    });

    handTrack.startVideo(video).then( status => {
        console.log("video started", status);
        videoWidth = video.width;
        videoHeight = video.height;
        if (status) {
            main();
        }
    });
}

// CREATE THREE.JS SCENE AND LISTEN FOR SERVER DATA
function main() {

    container = document.getElementById('container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    createCamera();
    createLights();
    createRenderer();
    // createControls();

    createMetaballs();

    // display framerate
    stats = new Stats();
    // container.appendChild(stats.dom);

    window.addEventListener('resize', onWindowResize, false);

    animate();

    // receive all connected clients' hand position data
    socket.on('moving', data => {
        hands = data;
    });
}

// ANIMATION LOOP
function animate() {
    runDetection();
    render();
    requestAnimationFrame(animate);
}

// DETECT HAND POSITION AND SEND TO SERVER
function runDetection() {
    model.detect(video).then(predictions => {
        if (predictions[0]) {

            // detect + normalise x coord
            const min_x = predictions[0].bbox[0];
            const bbox_width = predictions[0].bbox[2];
            const hand_x = min_x + bbox_width / 2;
            const n_hand_x = hand_x / videoWidth;

            // detect + normalise y coord
            const min_y =  - predictions[0].bbox[1];
            const bbox_height = - predictions[0].bbox[3];
            const hand_y = min_y + bbox_height / 2 + videoHeight;
            const n_hand_y = hand_y / videoHeight;

            // send to server
            const user_hand = {
                x: n_hand_x,
                y: n_hand_y
            }
            socket.emit('handmoved', user_hand);
        }
    });
}

// RENDER
function render() {
    updateCubes(effect, hands);
    renderer.render(scene, camera);
    stats.update();
}

// DISPLAY METABALLS AT CONNECTED CLIENTS' HAND POSITIONS
function updateCubes(object, hand) {
    object.reset();
    const subtract = 12;
    const strength = 0.8;
    for (let i = 0; i < hand.length; i++) {
        const ballx = hand[i].x; 
        const bally = hand[i].y;
        const ballz = 0.75;
        object.addBall(ballx, bally, ballz, strength, subtract);
    }
}

// CREATE MARCHING CUBES METABALLS AND ADD TO SCENE
function createMetaballs() {
    const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            specular: 0xffffff,
            shininess: 2,
            vertexColors: true
    });
    effect = new MarchingCubes(resolution, material, false, true);
    effect.position.set(0, 0, 0);
    effect.scale.set(700, 700, 700);
    effect.isolation = 150;
    scene.add(effect);
}

// CREATE CAMERA
function createCamera(){
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 0, 1500);
}

// CREATE LIGHTS
function createLights(){
    light = new THREE.DirectionalLight(0xebebae);
    light.position.set(lightXPos, lightYPos, lightZPos);
    light.position.normalize();
    scene.add(light);

    pointLight = new THREE.PointLight(0xfff7d6);
    pointLight.position.set(0, 0, 75);
    scene.add(pointLight);

    ambientLight = new THREE.AmbientLight(0x080808);
    scene.add(ambientLight);
}

// CREATE RENDERER
function createRenderer(){
    renderer = new THREE.WebGLRenderer();
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
}

// CREATE ORBIT CONTROLS
function createControls(){
    const controls = new OrbitControls(camera, renderer.domElement);
}

// UPDATE IF WINDOW RESIZED
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}