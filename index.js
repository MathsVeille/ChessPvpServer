const { Server } = require("socket.io");


const io = new Server({
    cors: {
        origin: "https://conduite.fun", // Ensure it matches your frontend URL
        methods: ["GET", "POST"],
    },
});


io.listen(3001);

console.log("listening onnnn " + 3001);

const players = new Set();
const users = new Set();

//on s'est connecté
io.on("connection", (socket)=>{
    
    
    players.add({id:socket.id, x:1, z:1});

    users.forEach(usr => {
        usr.emit("new_player", {id:socket.id, x:1, z:1});
    });

    users.add(socket);
    
    console.log("new player " + socket.id);
    console.log(players);

    socket.on("player_pos", (x, z)=>{
        players.forEach(player => {
            if(player.id == socket.id){
                player.x = x;
                player.z = z;
            }
        });
    socket.broadcast.emit("player_pos", socket.id, x, z); 
    console.log("emmited:" + socket.id + " x: "+x + " z: "+ z);
    });

    

    socket.on("disconnect", ()=>{
        players.forEach(player => {
            if(player.id == socket.id){
                players.delete(player);
            }
        });
        socket.broadcast.emit("player_left", socket.id);
        users.delete(socket);
    })


})

