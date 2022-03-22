var startupDiv = document.getElementById("startupDiv")
var instructionsDiv = document.getElementById("instructionsDiv")
var idInput = document.getElementById("idInput")
socket = io()       // browser based socket

var state   = "startup"
var id      = null

document.onmousedown = function(event){
    msg = {
        x : event.x,
        y : event.y,   
    }
    socket.emit("clientClick",msg)
}

// 100 ms interval to send message 
// interval should be higher than ping/latency
// interval motivated by concepts such as  latency, ping
socket.on("connected", function(msg){
    console.log(`connected`)
})
socket.on("clientJoined",function(msg){
    console.log(`client ${msg.id} joined`)
    setInterval(update, 100)    
})
socket.on("serverUpdateClient", function(msg){
    state   = msg.state
})
socket.on("clicked",function(msg){
    console.log(`The server says: clicked`, msg)
    console.log(`State:`, state)
})


update = function(){
    msg = {}                                        // empty object {}
    socket.emit("clientUpdate",msg)
    if(state=="instructions"){
        instructionsDiv.style.display = "block"
        startupDiv.style.display = "none"
    }
}
joinGame = function(){
    console.log(`joinGame`)
    id = parseInt(idInput.value)
    console.log(`subjectId`, id)
    msg = {id}
    socket.emit("joinGame",msg)
}
