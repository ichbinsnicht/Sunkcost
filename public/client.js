var startupDiv = document.getElementById("startupDiv")
var instructionsDiv = document.getElementById("instructionsDiv")
var idInput = document.getElementById("idInput")
var pleaseWaitDiv = document.getElementById("pleaseWaitDiv")
var investment1Div = document.getElementById("investment1Div")
var investment2Div = document.getElementById("investment2Div")
var outcomeDiv = document.getElementById("outcomeDiv")
var canvas1 = document.getElementById("canvas1")
var context1 = canvas1.getContext("2d")

socket = io()       // browser based socket

var state   = "startup"
var id      = null
var joined  = false
var scale   = 1
var scaleX  = 1
var scaleY  = 1
var mouseX  = 50
var mouseY  = 50
var cost1   = 10        // marginal cost of the probability in period 1
var cost2   = 15        // cost2 = sunk cost in period 2

range = n => [...Array(n).keys()]      // spread operator ...

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
    joined = true
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
    startupDiv.style.display = "none"
    instructionsDiv.style.display = "none"
    pleaseWaitDiv.style.display = "none"
    investment1Div.style.display = "none"
    investment2Div.style.display = "none"
    outcomeDiv.style.display = "none"       
    if(!joined){
        startupDiv.style.display = "block"
    }
    if(joined&&state=="startup"){
        pleaseWaitDiv.style.display = "block"
    }   
    if(joined&&state=="instructions"){
        instructionsDiv.style.display = "block"
    }
    if(joined&&state=="investment1"){
        investment1Div.style.display = "block"
    }
    if(joined&&state=="investment2"){
        investment2Div.style.display = "block"
    }
    if(joined&&state=="outcome"){
        outcomeDiv.style.display = "block"
    }
}
joinGame = function(){
    id = parseInt(idInput.value)
    if (id>0) {
        console.log(`joinGame`)
        console.log(`subjectId`, id)
        msg = {id}
        socket.emit("joinGame",msg)
    } else {
        alert("Please enter subject id.")
    }
}
canvas1.onmousemove = function(e){                                  // e - mouse-event
    mouseX = e.offsetX*100/scale                                    // save mouse pos
    mouseY = (scale - e.offsetY)*100/scale                                      // offsetY diff of pos of mouse and canvas in pixels
}
canvas1.onmousedown = function(e){                                  // debug log
    console.log(mouseX,mouseY)
}
setupCanvas = function(){                                           // square canvas in %
    scaleX = window.innerWidth
    scaleY = window.innerHeight
    scale = 0.95*Math.min(scaleX,scaleY)                             // Classes are capitalized. Math is a unique class.
    canvas1.width = scale
    canvas1.height = scale
    var xTranslate = 0
    var yTranslate = scale                                          // movement down
    var xScale = scale/100
    var yScale = scale/100                                         // number of pixels per unit (1 => 1 unit = 1 pixel)
    context1.setTransform(xScale,0,0,yScale,xTranslate,yTranslate)
}
draw = function(){
    setupCanvas()
    requestAnimationFrame(draw)
    if(state=="investment1"){
        context1.clearRect(0,0,canvas1.width,canvas1.height)
        context1.fillStyle = "blue"
        context1.fillRect(mouseX,-mouseY,5,5)
        context1.strokeStyle = "black"
        context1.lineWidth = 0.25
        var graphWidth = 80
        var graphHeight = -80
        var graphX = 10
        var graphY = -10
        context1.beginPath()
        context1.moveTo(graphX,graphY+graphHeight)
        context1.lineTo(graphX,graphY)
        context1.lineTo(graphX+graphWidth,graphY)
        context1.lineTo(graphX+graphWidth,graphY+graphHeight)
        context1.stroke()
        var numTicks = 11
        var tickSpace = graphWidth/(numTicks-1)
        var tickLength = 3
        context1.font = "2pt monospace"
        context1.textAlign = "center"
        context1.textBaseline = "top"
        context1.fillStyle = "black"                
        range(numTicks).forEach(i => {
            context1.beginPath()
            context1.moveTo(graphX+i*tickSpace,graphY)
            context1.lineTo(graphX+i*tickSpace,graphY+tickLength)
            context1.stroke()
            context1.fillText(i,graphX+i*tickSpace,graphY+tickLength+1)     
        })
    }
}
draw()