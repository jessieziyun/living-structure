// USER HAND BLOB INTERACTS WITH CENTRAL UNDULATING FORM

import * as THREE from '../three/three.module.js';
import Stats from '../three/stats.module.js';
import { OrbitControls } from '../three/OrbitControls.js';
import { MarchingCubes } from '../three/MarchingCubes.js';

const video = document.getElementById("video");
let videoWidth, videoHeight;

let container, stats;
let camera, scene, renderer;
let light, pointLight, ambientLight;
const lightXPos = 0.5;
const lightYPos = 0.5;
const lightZPos = 1;

let model = null;
const modelParams = {
    flipHorizontal: true, // flip e.g for video  
    maxNumBoxes: 1, // maximum number of boxes to detect
    iouThreshold: 0.5, // ioU threshold for non-max suppression
    scoreThreshold: 0.6, // confidence threshold for predictions.
}
let user_hand = {
    x: 0.5,
    y: 0.5
}

const resolution = 32;
let effect;
let time = 0;
const clock = new THREE.Clock();
const blobSpeed = 2;

let numusers = 1;
const numblobs = 8;

init();

function init() {
    handTrack.load(modelParams).then(lmodel => {
        model = lmodel
    });
    handTrack.startVideo(video).then( status => {
        console.log("video started", status);
        videoWidth = video.width;
        videoHeight = video.height;
        if (status) {
            main();
        } else {
        }
    });
}

function main() {

    container = document.getElementById('container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    createCamera();
    createLights();
    createRenderer();
    createControls();

    createMeatballs();

    stats = new Stats();
    container.appendChild(stats.dom);

    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function animate() {
    runDetection();
    render();
    requestAnimationFrame(animate);
}

function runDetection() {
    model.detect(video).then(predictions => {
        if (predictions[0]) {
            let handX = ((predictions[0].bbox[0] + (predictions[0].bbox[2] / 2)) / videoWidth) * 0.6 + 0.2;
            let handY = ((((predictions[0].bbox[1] + (predictions[0].bbox[3] / 2)) * -1) + videoHeight) / videoHeight) * 0.6 + 0.2;
            user_hand.x = handX;
            user_hand.y = handY;
        }
    });
}

function render() {
    const delta = clock.getDelta();
    time += delta * blobSpeed * 0.5;
    updateCubes(effect, time, numblobs, numusers, user_hand);
    // updateCubes(effect, time, numblobs);
    renderer.render(scene, camera);
    stats.update();
}

function updateCubes(object, time, numblobs, numusers, hand) {
    object.reset();
    const subtract = 12;
    const strength = 1.2 / ((Math.sqrt(numblobs) - 1) / 4 + 1);
    for (let i = 0; i < numblobs; i++) {
        const ballx = (Math.sin(i + 1.26 * time * (1.03 + 0.5 * Math.cos(0.21 * i))) * 0.27 + 0.5) * 0.4 + 0.3;
        const bally = (Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.27 + 0.5) * 0.4 + 0.25;
        const ballz = (Math.cos(i + 1.32 * time * 0.1 * Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5) * 0.4 + 0.3;
        object.addBall(ballx, bally, ballz, strength, subtract);
    }
    for (let j = 0; j < numusers; j++) {
        // min 0.2 max 0.8
        const ballx = hand.x; 
        const bally = hand.y;
        const ballz = 0.5;
        object.addBall(ballx, bally, ballz, strength, subtract);
    }
}

function createMeatballs() {
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

function createCamera(){
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(-500, 500, 1500);
}

function createLights(){
    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(lightXPos, lightYPos, lightZPos);
    light.position.normalize();
    scene.add(light);

    pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(0, 0, 100);
    scene.add(pointLight);

    ambientLight = new THREE.AmbientLight(0x080808);
    scene.add(ambientLight);
}

function createRenderer(){
    renderer = new THREE.WebGLRenderer();
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
}

function createControls(){
    const controls = new OrbitControls(camera, renderer.domElement);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}