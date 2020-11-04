// SIMPLE MARCHING CUBES METABALLS

import * as THREE from '../three/three.module.js';
import Stats from '../three/stats.module.js';
import { OrbitControls } from '../three/OrbitControls.js';
import { MarchingCubes } from '../three/MarchingCubes.js';

let container, stats;
let camera, scene, renderer;
let materials, current_material;
let light, pointLight, ambientLight;
let effect;
const blobSpeed = 0.1;
const numBlobs = 10;
const resolution = 36;
const lightXPos = 0.5;
const lightYPos = 0.5;
const lightZPos = 1;
let time = 0;
const clock = new THREE.Clock();

init();
animate();

function init() {

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

}

function createMeatballs() {
    materials = generateMaterials();
    current_material = "colors";

    effect = new MarchingCubes(resolution, materials[current_material].m, true, true);
    effect.position.set(0, 0, 0);
    effect.scale.set(700, 700, 700);
    effect.isolation = 50;

    effect.enableUvs = false;
    effect.enableColors = true;

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
    controls.minDistance = 500;
    controls.maxDistance = 5000;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function generateMaterials() {
    const texture = new THREE.TextureLoader().load("./textures/uv_grid_opengl.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const materials = {

        "colors": {
            m: new THREE.MeshPhongMaterial({
                color: 0xffffff,
                specular: 0xffffff,
                shininess: 2,
                vertexColors: true
            }),
            h: 0,
            s: 0,
            l: 1
        },
    };
    return materials;
}

function updateCubes(object, time, numblobs) {
    object.reset();
    const subtract = 12;
    const strength = 1.2 / ((Math.sqrt(numblobs) - 1) / 4 + 1);
    for (let i = 0; i < numblobs; i++) {
        const ballx = Math.sin(i + 1.26 * time * (1.03 + 0.5 * Math.cos(0.21 * i))) * 0.27 + 0.5;
        const bally = Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.27 + 0.5;
        const ballz = Math.cos(i + 1.32 * time * 0.1 * Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5;
        object.addBall(ballx, bally, ballz, strength, subtract);
    }
}

function animate() {
    requestAnimationFrame(animate);
    render();
    stats.update();
}

function render() {
    const delta = clock.getDelta();
    time += delta * blobSpeed * 0.5;

    // marching cubes
    updateCubes(effect, time, numBlobs);

    // materials
    // effect.material.color.setHSL(materialHue, materialSaturation, materialLightness);

    // pointLight.color.setHSL(pointLightHue, pointLightSaturation, pointLightLightness);

    // render
    renderer.render(scene, camera);
}