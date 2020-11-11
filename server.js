const express = require("express");
const http = require("http");
const socket = require("socket.io");

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = socket.listen(server);
let clients = [];
let numclients = 0;
let screenshots = [];

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
    socket.emit('allscreenshots', screenshots);

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
        data.name !== '' ? clientinfo.name = data.name : clientinfo.name = 'an anonymous user';
        data.location !== '' ? clientinfo.location = data.location : clientinfo.location = 'an unnamed location';
        socket.broadcast.emit('clientconnected', clientinfo);
    });

    clients.push(clientinfo);
    let stopDisplaying;

    // RECEIVE HAND POSITION COORDINATES FROM CLIENT
    socket.on("handmoved", data => {

        // if user inactive for more than 5 seconds, stop displaying
        clearTimeout(stopDisplaying);
        stopDisplaying = setTimeout(() => {
            removeClient(socket.id);
            console.log(`Stopped displaying ${socket.id} due to inactivity`)
        }, 5 * 1000);
        const index = getIndex(socket.id);
        if (index == -1) {
            clients.push(clientinfo);
            console.log(`${socket.id} active again, displaying hand`)
        }

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
        screenshots.push(screenshotinfo);
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