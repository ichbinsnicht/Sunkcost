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
var xScale  = 1
var yScale  = 1
var mouseX  = 50
var mouseY  = 50
var mouseDown = false
var cost1 = 0
var cost2 = 0
var prob1 = 0
var prob2 = 0
var maxCost1 = 10        // marginal cost of the probability in period 1
var maxCost2High = 15    // cost2 = sunk cost in period 2 (high cost shock)
var maxCost2Low = 10    // calibrate the high costs!
var countdown = 60      // seconds

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
    setInterval(update, 10)    
})
socket.on("serverUpdateClient", function(msg){
    state   = msg.state
    countdown = msg.countdown
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
    mouseX = (e.offsetX-yScale/2)*100/yScale                                    // save mouse pos
    mouseY = (yScale - e.offsetY)*100/yScale                         // offsetY diff of pos of mouse and canvas in pixels
}
canvas1.onmousedown = function(e){                                  // debug log
    console.log(mouseX,mouseY)
    mouseDown = true
}
window.onmouseup = function(e){
    mouseDown = false
}
setupCanvas = function(){                                           // square canvas in %
    xScale = 0.95*window.innerWidth
    yScale = 0.95*window.innerHeight                                        // Classes are capitalized. Math is a unique class.
    canvas1.width = xScale
    canvas1.height = yScale
    var xTranslate = yScale/2
    var yTranslate = yScale                                         // movement down                                        
    context1.setTransform(yScale/100,0,0,yScale/100,xTranslate,yTranslate) // number of pixels per unit (1 => 1 unit = 1 pixel)
}
draw = function(){
    setupCanvas()
    requestAnimationFrame(draw)
    if(state=="investment1") draw1()
}
draw1 = function(){
    context1.clearRect(0,0,canvas1.width,canvas1.height)
    context1.strokeStyle = "black"
    context1.lineWidth = 0.25
    var graphWidth = 80
    var graphHeight = 70
    var graphX = 13
    var graphY = -20
    context1.beginPath()
    context1.moveTo(graphX,graphY-graphHeight)
    context1.lineTo(graphX,graphY)
    context1.lineTo(graphX+graphWidth,graphY)
    context1.lineTo(graphX+graphWidth,graphY-graphHeight)
    context1.stroke()
    var numTicks = 11
    var tickSpaceX = graphWidth/(numTicks-1)
    var tickLength = 3
    context1.font = "2pt monospace"
    context1.textAlign = "center"
    context1.textBaseline = "top"
    context1.fillStyle = "black"                
    range(numTicks).forEach(i => {
        context1.beginPath()
        context1.moveTo(graphX+i*tickSpaceX,graphY)
        context1.lineTo(graphX+i*tickSpaceX,graphY+tickLength)
        context1.stroke()
        var xlabel = (i/10).toFixed(1)
        context1.fillText(xlabel,graphX+i*tickSpaceX,graphY+tickLength+1)     
    })
    context1.textAlign = "right" 
    context1.textBaseline = "middle"
    var yMax = Math.max(maxCost1,maxCost2High,maxCost2Low)    // Math is a singleton class (capitalize!)
    var tickSpaceY = graphHeight/(yMax)
    range(yMax+1).forEach(i => {
        context1.beginPath()
        context1.moveTo(graphX,graphY-i*tickSpaceY)
        context1.lineTo(graphX-tickLength,graphY-i*tickSpaceY)
        context1.stroke()
        context1.fillText(i,graphX-tickLength-1,graphY-i*tickSpaceY)     
    })
    context1.textAlign = "left" 
    range(yMax+1).forEach(i => {
        context1.beginPath()
        context1.moveTo(graphX+graphWidth,graphY-i*tickSpaceY)
        context1.lineTo(graphX+graphWidth+tickLength,graphY-i*tickSpaceY)
        context1.stroke()
        context1.fillText(i,graphX+graphWidth+tickLength+1,graphY-i*tickSpaceY)     
    })
    context1.lineWidth = 1
    context1.lineCap = "round"
    context1.strokeStyle = "blue"     
    context1.beginPath()        
    context1.moveTo(graphX,graphY)
    context1.lineTo(graphX+graphWidth,graphY-maxCost1*graphHeight/yMax)
    context1.stroke()
    if(mouseDown){
        prob1 = Math.max(0,Math.min(1,(mouseX - graphX)/graphWidth))
        cost1 = prob1*maxCost1
    }
    context1.lineWidth = 2        
    context1.strokeStyle = "red"
    context1.beginPath()
    context1.moveTo(graphX+prob1*graphWidth,graphY) 
    context1.lineTo(graphX+prob1*graphWidth,graphY-cost1*graphHeight/yMax)
    context1.stroke()
    context1.textAlign = "center"
    context1.save()
    context1.translate(graphX-10,graphY-graphHeight/2)
    context1.rotate(-Math.PI/2)
    context1.fillText("Cost 1",0,0)
    context1.restore()
    context1.fillText("Probability of Receiving Ticket 1", graphX+graphWidth/2, graphY+10)
    context1.fillText(`Countdown: ${countdown}`, graphX+graphWidth/2, graphY+15)       // `` backquote
}
draw()