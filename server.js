require("dotenv").config();
const express = require("express");
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

// LINK TO DATABASE
const admin = require("firebase-admin");
admin.initializeApp({
    credential: admin.credential.cert({
        "project_id": process.env.FIREBASE_PROJECT_ID,
        "private_key": process.env.FIREBASE_PRIVATE_KEY,
        "client_email": process.env.FIREBASE_CLIENT_EMAIL
      }),
  databaseURL: "https://living-structure.firebaseio.com"
});

const db = admin.firestore();

let clients = [];
let numclients = 0;

app.use(express.static("public"));

app.get("/", (request, response) => {
    response.sendFile(__dirname + "/views/index.html");
});

const listener = server.listen(port, () => {
    console.log(`Server is listening on port ${listener.address().port}`);
});

// HANDLE CONNECTIONS
io.on("connection", socket => {
    console.log(`New connection: ${socket.id}`);
    numclients++;
    socket.emit('numclients', numclients);
    
    db.collection('screenshots').get().then(snapshot => {
        let screenshots = [];
        snapshot.docs.forEach(doc => {
            screenshots.push(doc.data());
        });
        socket.emit('allscreenshots', screenshots);
    });

    let clientinfo = {
        num: numclients,
        name: '',
        location: '',
        id: socket.id,
        x: -100,
        y: -100
    }

    // RECEIVE USER NAME AND LOCATION FROM CLIENT
    socket.on("userinfo", data => {
        data.name !== '' ? clientinfo.name = data.name : clientinfo.name = 'Anonymous';
        data.location !== '' ? clientinfo.location = data.location : clientinfo.location = 'Unnamed Location';
        socket.broadcast.emit('clientconnected', clientinfo);
    });

    clients.push(clientinfo);

    // RECEIVE HAND POSITION COORDINATES FROM CLIENT
    socket.on("handmoved", data => {

        // update hand position
        clientinfo.x = data.x;
        clientinfo.y = data.y;

        io.emit("moving", clients);
    });

    // RECEIVE NEW SCREENSHOT FROM CLIENT
    socket.on('screenshot', data => {
        console.log("new screenshot received");
        let audience = [];
        for (let i = 0; i < clients.length; i++) {
            let ppl = {
                name: clients[i].name,
                location: clients[i].location
            }
            audience.push(ppl);
        }
        let screenshotinfo = {
            img: data,
            people: audience,
            time: `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
        }

        const timestamp =  `${new Date().toISOString()}`;
        db.collection('screenshots').doc(timestamp).set(screenshotinfo);
        io.emit("newscreenshot", screenshotinfo);
    })

    // HANDLE DISCONNECTIONS
    socket.on("disconnect", () => {
        console.log(`Disconnected: ${socket.id}`);
        removeClient(socket.id);
        numclients--;
        clientinfo.num = numclients;
        socket.broadcast.emit('clientdisconnected', clientinfo);
    });
});

function removeClient(socket_id) {
    const index = getIndex(socket_id);
    clients.splice(index, 1);
}

function getIndex(socket_id) {
    const index = clients.map(e => e.id).indexOf(socket_id);
    return index;
}