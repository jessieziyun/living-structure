// SPHERE FOLLOWS POSITION OF USER HAND

import * as THREE from './three/three.module.js';
import Stats from './three/stats.module.js';
import { OrbitControls } from './three/OrbitControls.js';

const video = document.getElementById("video");
const videoInterval = 30;
let halfVideoWidth, halfVideoHeight;

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
let handX, handY;
let user_tracker;

const colour = 0xffffff;

handTrack.load(modelParams).then(lmodel => {
    model = lmodel
});

init();

function init() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        halfVideoWidth = video.width / 2;
        halfVideoHeight = video.height / 2;
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

    user_tracker = new Tracker();
    user_tracker.initialise();
    user_tracker.display();

    // STATS
    stats = new Stats();
    container.appendChild(stats.dom);

    // EVENTS
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function animate() {
    runDetection();
    draw(user_tracker, handX, handY);
    setTimeout(() => {
        requestAnimationFrame(animate);
    }, videoInterval);
    renderer.render(scene, camera);
    stats.update();
}

function runDetection() {
    model.detect(video).then(predictions => {
        if (predictions[0]) {
            handX = predictions[0].bbox[0] + (predictions[0].bbox[2] / 2) - halfVideoWidth;
            handY = (predictions[0].bbox[1] + (predictions[0].bbox[3] / 2)) * -1 + halfVideoHeight;
        }
    });
}

function draw(tracker, x, y) {
    if (x != undefined && y != undefined) {
        tracker.update(x, y); // move out of screen if body part not detected
        tracker.display();
    }
}

function createCamera(){
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 0, 1000);
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
    // controls.minDistance = 500;
    // controls.maxDistance = 5000;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function Tracker() {

    this.position = new THREE.Vector3();
    const geometry = new THREE.SphereBufferGeometry(10, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: colour
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    this.initialise = function () {
        this.position.x = 0;
        this.position.y = 0;
        this.position.z = 0;
    };

    this.update = function (x, y) {
        this.position.x = x;
        this.position.y = y;
        // this.position.z = z;
    };

    this.display = function () {
        sphere.position.x = this.position.x;
        sphere.position.y = this.position.y;
        sphere.position.z = this.position.z;
    };
}

async function setupCamera(w, h) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    const vid = document.getElementById('video');
    vid.width = w;
    vid.height = h;

    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
            width: w,
            height: h,
        },
    });
    vid.srcObject = stream;

    return new Promise((resolve) => {
        vid.onloadedmetadata = () => {
            resolve(vid);
        };
    });
}

async function loadVideo(w, h) {
    const vid = await setupCamera(w, h);
    vid.play();
    return vid;
}