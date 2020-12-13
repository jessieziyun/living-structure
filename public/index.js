import * as THREE from '../three/three.module.js';
import { MarchingCubes } from '../three/MarchingCubes.js';

// SCENE SETUP
let container;
let camera, scene, renderer;
let light, pointLight, ambientLight;
const lightXPos = 1.5;
const lightYPos = 0.5;
const lightZPos = 0.8;

// LANDING PAGE
const blobSpeed = 0.1;
const numBlobs = 10;
const clock = new THREE.Clock();
let time = 0;
let landingpage = true;

// MARCHING CUBES
const resolution = 48;
let effect;

// HAND TRACKING
const video = document.getElementById("video");
let videoWidth, videoHeight;
let model = null;
const modelParams = {
    flipHorizontal: true, // flip for video  
    maxNumBoxes: 1, // maximum number of boxes to detect
    iouThreshold: 0.5, // ioU threshold for non-max suppression
    scoreThreshold: 0.6, // confidence threshold for predictions.
}

// SOCKET.IO
const socket = io();
let hands = [];

// ARCHIVE
let active = true;

// RUN CODE
main();

// LANDING PAGE
function main() {

    startThree();
    renderLoadingGraphic();

    // display number of connections
    socket.on('numclients', data => {
        $("#numclients").text(`>number of connections: ${data}`);
    });

    // load archive of screenshots
    socket.on('allscreenshots', data => {
        console.log("received archived screenshots");
        for (let i = 0; i < data.length; i++) {
            const newdiv = $( "<div class='captioned-image left'></div>" );
            newdiv.append($("<img>", {
                class: "archive-image",
                src: data[i].img
            }), `<p>>${data[i].time}</p>`)
            for (let j = 0; j < data[i].people.length; j ++) {
                newdiv.append(`<p> ${data[i].people[j].name}, ${data[i].people[j].location}</p>`);
            }
            $("#gallery").prepend(newdiv);
        }
    })

    // landing page
    $("#start-button").click(() => {
        $("#landing-page").addClass("fadeOut");
        setTimeout(() => {
            $("#landing-page").addClass("hidden");
          }, 500);
        $("#input-text").addClass("fadeIn");
    });
    
    // input name and location
    $("#enter-button").click(() => {
        getUserInput();   
        $("#input-text").removeClass("fadeIn");
        $("#input-text").addClass("fadeOut");
        updateScene();
        setTimeout(() => {
            $("#input-text").addClass("hidden");
          }, 500);
        $("#loading-screen").addClass("fadeIn");

        // start
        init();
    })
}

function getUserInput(){
    const name = $("#username").val();
    const location = $("#location").val();
    const user_info = {name, location};
    socket.emit('userinfo', user_info);
}

// INITIALISE HANDTRACK.JS THEN CALL MAIN()
function init() {
    scene.add(pointLight);
    handTrack.load(modelParams).then(lmodel => {
        model = lmodel
        handTrack.startVideo(video).then(status => {
            console.log("video started", "handtrack status: " + status);
            videoWidth = video.width;
            videoHeight = video.height;
            if (status) {
                startHandtrack();
                handleDomElems();
            }
        });
    });
}

function startThree() {
    container = document.getElementById('scene-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d0c);

    createCamera();
    createLights();
    createRenderer();
    createMetaballs();
    window.addEventListener('resize', onWindowResize, false);
}

// CREATE THREE.JS SCENE AND LISTEN FOR SERVER DATA
function startHandtrack() {

    animate();

    // display number of connections
    socket.on('clientconnected', data => {
        $("#numclients").text(`>number of connections: ${data.num}`);
        $("#connections").append(`<p>>${data.name} connected from ${data.location}</p>`);
        $("#connection-events").animate({ scrollTop: $("#connections").height() }, 800);
    });

    socket.on('newscreenshot', data => {
        console.log("new screenshot received");
        const newdiv = $( "<div class='captioned-image left'></div>" );
        newdiv.append($("<img>", {
            class: "archive-image",
            src: data.img
        }), `<p>>${data.time}</p>`)
        for (let i = 0; i < data.people.length; i ++) {
            newdiv.append(`<p> ${data.people[i].name}, ${data.people[i].location}</p>`);
        }
        $("#gallery").prepend(newdiv);
    })

    socket.on('clientdisconnected', data => {
        $("#numclients").text(`>number of connections: ${data.num}`);
        $("#connections").append(`<p>>${data.name} disconnected from ${data.location}</p>`);
        $("#connection-events").animate({ scrollTop: $("#connections").height() }, 800);
    });

    // receive all connected clients' hand position data
    socket.on('moving', data => {
        hands = data;
    });
}

// RENDER LOADING SCREEN GRAPHIC
function renderLoadingGraphic() {
    if (landingpage) {
        requestAnimationFrame(renderLoadingGraphic);
        const delta = clock.getDelta();
        time += delta * blobSpeed * 0.5;
        effect.reset();
        const subtract = 12;
        const strength = 1.2 / ((Math.sqrt(numBlobs) - 1) / 4 + 1);
        for (let i = 0; i < numBlobs; i++) {
            const ballx = Math.sin(i + 1.26 * time * (1.03 + 0.5 * Math.cos(0.21 * i))) * 0.27 + 0.5;
            const bally = Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.27 + 0.5;
            const ballz = Math.cos(i + 1.32 * time * 0.1 * Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5;
            effect.addBall(ballx, bally, ballz, strength, subtract);
        }
        renderer.render(scene, camera);
    } else if (landingpage == false) {
        effect.reset();
        renderer.render(scene, camera);
    }
}

// MOVE SCENE CONTAINER TO BACK AND UPDATE SCENE
function updateScene(){
    landingpage = false;
    $("#scene-container").css('z-index', '0');
    camera.position.set(0, 0, 1500);
    scene.add(pointLight);
    light.intensity = 1;
}

// ANIMATION LOOP
function animate() {
    runDetection();
    render();
    if (active) requestAnimationFrame(animate);
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
    camera.position.set(0, 250, 1500);
}

// CREATE LIGHTS
function createLights(){
    light = new THREE.DirectionalLight(0xebebae, 0.5);
    light.position.set(lightXPos, lightYPos, lightZPos);
    light.position.normalize();
    scene.add(light);

    pointLight = new THREE.PointLight(0xfff7d6);
    pointLight.position.set(0, 0, 75);

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

// UPDATE IF WINDOW RESIZED
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// FADE OUT THE LOADING SCREEN AND HANDLE ALL CLICKS
function handleDomElems() {
    
    // fade out loading screen
    $("#loading-screen").removeClass("fadeIn");
    $("#loading-screen").addClass("fadeOut");
    setTimeout(() => {
        $("#loading-screen").addClass("hidden");
      }, 500);
    
    // fade in main
    $("#main").addClass("fadeIn");

    // toggle about
    $("#about").click(() => {
        // $("#about").removeClass("fadeIn");
        $("#exit-about").css('display', 'block');
        $("#about-dropdown").css('display', 'block');
        $("#about").css({'display': 'none', 'opacity': '1'});
    });
    $("#exit-about").click(() => {
        $("#about-dropdown").css('display', 'none');
        $("#about").css('display', 'block');
        $("#exit-about").css('display', 'none');
    });

    // toggle archive
    $("#enter-archive").click(() => {
        $("#archive").css('display', 'block');
        active = false;
    });
    $("#exit-archive").click(() => {
        $("#archive").css('display', 'none');
        active = true;
        animate();
    });
    
    let dataURL;

    // take screenshot
    $("#take-screenshot").click(() => {

        // display screenshot and save options
        $("#screenshot").empty();
        render();
        dataURL = renderer.domElement.toDataURL('image/png');
        $("#screenshot").append(
            $("<img>", {
                class: "small-image",
                src: dataURL
            })
        );
        
        $("#save-screenshot").css('display', 'block');
        active = false;
    });

    // download screenshot
    $("#download").click(() => {
        saveDataURI(defaultFileName('.png'), dataURL);
        $("#download").text(">downloaded");
        $("#download").removeClass("link");
    });

    // save screenshot to archive
    $("#save-archive").click(() => {
        socket.emit('screenshot', dataURL);
        $("#save-archive").text(">saved to archive");
        $("#save-archive").removeClass("link");
    });

    // exit save screenshot window
    $("#exit-screenshot").click(() => {
        $("#save-screenshot").css('display', 'none');
        $("#save-archive").text(">save to archive");
        $("#save-archive").addClass("link");
        $("#download").text(">download");
        $("#download").addClass("link");
        active = true;
        animate();
    });
}

function dataURIToBlob(dataURI) {
    const binStr = window.atob(dataURI.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
    }
    return new window.Blob([arr]);
}

function saveDataURI(name, dataURI) {
    const blob = dataURIToBlob(dataURI);

    // force download
    const link = document.createElement('a');
    link.download = name;
    link.href = window.URL.createObjectURL(blob);
    link.onclick = () => {
        window.setTimeout(() => {
            window.URL.revokeObjectURL(blob);
            link.removeAttribute('href');
        }, 500);

    };
    link.click();
}

function defaultFileName(ext) {
    const str = `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}${ext}`;
    return str.replace(/\//g, '-').replace(/:/g, '.');
}