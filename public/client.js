console.log("client.js")
var startupDiv = document.getElementById("startupDiv")

socket = io()       // browser based socket

document.onmousedown = function(event){
    msg = {
        x : event.x,
        y : event.y,   
    }
    socket.emit("clientClick",msg)
} 

socket.on("clicked",function(msg){
    console.log(`The server says: clicked`)
    startupDiv.innerHTML = `The server says: clicked ${msg.x}, ${msg.y}`
})