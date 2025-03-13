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
    //players.set(socket.id, {piece: 1, x:1, z:1, x_change:0, z_change:0});
    //socket.broadcast.emit("new_player", {id:socket.id, x:1, z:1});
    console.log("new player " + socket.id);
    console.log(players);
    socket.on("desired_player_pos", desiredPos => {
        //let old_xchange = players.get(socket.id)?.x_change;
        //let old_zchange = players.get(socket.id)?.z_change;
        //en gros, on rajoute le delta position demandé par le client au delata P deja existant.
        let player = players.get(socket.id);
        if (!player)
            throw Error("no player in function desired player pos");
        player.x_change += desiredPos.x;
        player.z_change += desiredPos.z;
        players.set(socket.id, player);
        //
        socket.broadcast.emit("desired_player_pos", socket.id, desiredPos.x, desiredPos.z);
        console.log("broadcasted:" + socket.id + " x: " + desiredPos.x + " z: " + desiredPos.z);
    });
    socket.on("player_init", (x, z) => {
        players.set(socket.id, { piece: 1, x: x, z: z, x_change: 0, z_change: 0, speed: 0 });
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
    players.forEach((value, key1) => {
        //on delete les players qui se touchent
        players.forEach((player, key2) => {
            if (value != player && Math.round(player.x) == Math.round(value.x) && Math.round(player.z) == Math.round(value.z)) {
                sockets.forEach((sock) => {
                    if (sock.id == key1 || sock.id == key2) {
                        sock.emit("u_dead");
                    }
                    else {
                        sock.emit("player_left", key1);
                        sock.emit("player_left", key2);
                    }
                });
                players.delete(key1);
                players.delete(key2);
            }
        });
        //on met à jour le tableau interne des positions des joeurs
        if (value.x_change != 0) {
            console.log(value.x);
            console.log("change " + value.x_change);
            if (value.x_change > 0) {
                if ((value.x_change - delta) < 0) { //si la valeur de changementy est proche de 0 on arrondit la position et on la met à 0, evite les osilements 
                    value.x = Math.round(value.x);
                    value.x_change = 0;
                }
                else {
                    value.x += (delta);
                    value.x_change -= (delta);
                }
            }
            else if (value.x_change < 0) {
                if ((value.x_change + delta) > 0) { //idem ici, on arrondit pour éviter les oscilations
                    value.x = Math.round(value.x);
                    value.x_change = 0;
                }
                else {
                    value.x -= (delta);
                    value.x_change += (delta);
                }
            }
        }
    });
    //on syncronise tout toutes les 2s 
    if (accumulator > 2) {
        let syncArray = [];
        players.forEach((value, key) => {
            syncArray.push({ id: key, x: value.x, z: value.z, x_change: value.x_change, z_change: value.z_change });
        });
        sockets.forEach((sock) => {
            sock.emit("sync", syncArray);
        });
        accumulator -= 10;
        console.log("Synchro");
        console.log(syncArray);
    }
    accumulator += delta;
    //////////////////////////////////////////////////////////
    //on relance la fonction 
    setTimeout(gameLoop, 10);
    //setImmediate(gameLoop) //plus rapide mais pas envie de surchgarger le serveur pour l'instant
}
//on lance le gameloop
gameLoop();
