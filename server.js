const express = require("express");
const http = require("http");
const socket = require("socket.io");

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = socket.listen(server);

let clienthands = [];

app.use(express.static("public"));

app.get("/", (request, response) => {
    response.sendFile(__dirname + "/views/index.html");
});

const listener = server.listen(port, () => {
    console.log(`Server is listening on port ${listener.address().port}`);
});

io.on("connection", socket => {
    console.log(`New connection: ${socket.id}`);

    let handposition = {
        id: socket.id,
        x: -100,
        y: -100
    }
    clienthands.push(handposition);

    socket.on("handmoved", data => {
        handposition.x = data.x;
        handposition.y = data.y;

        io.emit("moving", clienthands);
    });

    socket.on("disconnect", () => {
        console.log(`Disconnected: ${socket.id}`);
        removeClient(socket.id);
    });
});

function removeClient(socket_id) {
    const index = clienthands.map(e => e.id).indexOf(socket_id);
    clienthands.splice(index, 1);
}