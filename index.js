"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const perf_hooks_1 = require("perf_hooks");
let lastTime = perf_hooks_1.performance.now();
let accumulator = 0;
const io = new socket_io_1.Server({
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});
io.listen(3001);
console.log("listening onnnn " + 3001);
const sockets = new Set();
const players = new Map(); //[key: id, value: {piece: letypedelapiece, x:current_x, z:current_z, x_change: Xchange_wanted, z_change: Zchange_wanted, speed:vitesse de deplacement}]
const cases = new Map(); //[key:numero_case, id:id_du_joeurs_occupant_la_case/null si vide] 
//on s'est connecté
io.on("connection", (socket) => {
    sockets.add(socket);
    players.forEach((value, key) => {
        if (key != socket.id)
            socket.emit("new_player", { id: key, x: value.x, z: value.z });
        console.log("emmited:", key, value.x, value.z);
    });
    console.log("new player " + socket.id);
    console.log(players);
    socket.on("desired_player_pos", desiredPos => {
        //en gros, on rajoute le delta position demandé par le client au delata P deja existant.
        let player = players.get(socket.id);
        if (!player)
            throw Error("no player in function desired player pos");
        player.x_change += desiredPos.x;
        player.z_change += desiredPos.z;
        //giga function
        if (desiredPos.x > 0) {
            if (player.direction == "+x")
                player.speed += 0.4;
            else {
                player.speed = 1;
                player.direction = "+x";
            }
        }
        if (desiredPos.x < 0) {
            if (player.direction == "-x")
                player.speed += 0.4;
            else {
                player.speed = 1;
                player.direction = "-x";
            }
        }
        if (desiredPos.z > 0) {
            if (player.direction == "+z")
                player.speed += 0.4;
            else {
                player.speed = 1;
                player.direction = "+z";
            }
        }
        if (desiredPos.z < 0) {
            if (player.direction == "-z")
                player.speed += 0.4;
            else {
                player.speed = 1;
                player.direction = "-z";
            }
        }
        //fin giga function
        players.set(socket.id, player);
        //
        socket.broadcast.emit("desired_player_pos", socket.id, desiredPos.x, desiredPos.z);
        console.log("broadcasted:" + socket.id + " x: " + desiredPos.x + " z: " + desiredPos.z);
    });
    socket.on("player_init", (x, z) => {
        players.set(socket.id, { piece: 1, x: x, z: z, x_change: 0, z_change: 0, speed: 0, direction: "" });
        socket.broadcast.emit("new_player", { id: socket.id, x: x, z: z });
    });
    socket.on("disconnect", () => {
        players.delete(socket.id);
        socket.broadcast.emit("player_left", socket.id);
        socket.emit("player_left", socket.id);
        sockets.delete(socket);
    });
});
function gameLoop() {
    //code to get delat variable
    const now = perf_hooks_1.performance.now();
    const delta = (now - lastTime) / 1000; //delta time in ms
    lastTime = now;
    //GAME LOOP CODE/////
    players.forEach((player1, key1) => {
        //on delete les players qui se touchent
        players.forEach((player2, key2) => {
            if (player1 != player2 && Math.round(player2.x) == Math.round(player1.x) && Math.round(player2.z) == Math.round(player1.z)) {
                let looser1 = null;
                let looser2 = null;
                if (player1.speed > player2.speed) {
                    looser1 = key2;
                }
                else if (player2.speed > player1.speed) {
                    looser1 = key1;
                }
                else { //meme vitesse, autodestruction
                    looser1 = key1;
                    looser2 = key2;
                }
                sockets.forEach((sock) => {
                    if (sock.id === looser1 || sock.id === looser2) {
                        sock.emit("u_dead");
                    }
                    else {
                        sock.emit("player_left", looser1);
                        if (looser2 != null) {
                            sock.emit("player_left", looser2);
                        }
                    }
                });
                players.delete(looser1);
                if (looser2 !== null) { //will not delete if looser2 == null
                    players.delete(looser2);
                }
            }
        });
        //MAJ X player1S
        if (player1.x_change != 0) {
            if (player1.x_change > 0) {
                if ((player1.x_change - delta * player1.speed) < 0) { //si la valeur de changementy est proche de 0 on arrondit la position et on la met à 0, evite les osilements 
                    player1.x = Math.round(player1.x);
                    player1.x_change = 0;
                    player1.speed = 1;
                }
                else {
                    player1.x += (delta * player1.speed);
                    player1.x_change -= (delta * player1.speed);
                }
            }
            else if (player1.x_change < 0) {
                if ((player1.x_change + delta * player1.speed) > 0) { //idem ici, on arrondit pour éviter les oscilations
                    player1.x = Math.round(player1.x);
                    player1.x_change = 0;
                    player1.speed = 1;
                }
                else {
                    player1.x -= (delta * player1.speed);
                    player1.x_change += (delta * player1.speed);
                }
            }
        }
        //MAJ Z player1S
        if (player1.z_change != 0) {
            if (player1.z_change > 0) {
                if ((player1.z_change - delta * player1.speed) < 0) { //si la valeur de changementy est proche de 0 on arrondit la position et on la met à 0, evite les osilements 
                    player1.z = Math.round(player1.z);
                    player1.z_change = 0;
                    player1.speed = 1;
                }
                else {
                    player1.z += (delta * player1.speed);
                    player1.z_change -= (delta * player1.speed);
                }
            }
            else if (player1.z_change < 0) {
                if ((player1.z_change + delta * player1.speed) > 0) { //idem ici, on arrondit pour éviter les oscilations
                    player1.z = Math.round(player1.z);
                    player1.z_change = 0;
                    player1.speed = 1;
                }
                else {
                    player1.z -= (delta * player1.speed);
                    player1.z_change += (delta * player1.speed);
                }
            }
        }
    });
    //on syncronise tout toutes les 2s 
    if (accumulator > 2) {
        let syncArray = [];
        players.forEach((value, key) => {
            syncArray.push({ id: key, x: value.x, z: value.z, x_change: value.x_change, z_change: value.z_change, speed: value.speed, direction: value.direction });
        });
        sockets.forEach((sock) => {
            sock.emit("sync", syncArray);
        });
        accumulator -= 1;
        console.log("Synchro");
        console.log(syncArray);
    }
    accumulator += delta;
    //////////////////////////////////////////////////////////
    //on relance la fonction pepere 10ms de repos pour le serv
    setTimeout(gameLoop, 10);
    //setImmediate(gameLoop) //plus rapide mais pas envie de surchgarger le serveur pour l'instant
}
//on lance le gameloop
gameLoop();
