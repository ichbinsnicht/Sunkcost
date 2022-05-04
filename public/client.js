var startupDiv = document.getElementById("startupDiv")
var instructionsDiv = document.getElementById("instructionsDiv")
var idInput = document.getElementById("idInput")
var pleaseWaitDiv = document.getElementById("pleaseWaitDiv")
var investment1Div = document.getElementById("investment1Div")
var investment2Div = document.getElementById("investment2Div")
var outcomeDiv = document.getElementById("outcomeDiv")
var canvas1 = document.getElementById("canvas1")
var context1 = canvas1.getContext("2d")
var canvas2 = document.getElementById("canvas2")
var context2 = canvas2.getContext("2d")

socket = io()       // browser based socket

// parameters
var maxCost1 = 10                           // marginal cost of the probability in period 1
var maxCost2High = 15                       // cost2 = sunk cost in period 2 (high cost shock)
var maxCost2Low = 10                        // calibrate the high costs!
var maxCost2 = maxCost2Low
var yMax = Math.max(maxCost1,maxCost2High,maxCost2Low)    // Math is a singleton class (capitalize!)
var graphWidth = 80
var graphHeight = 70
var graphX = 13
var graphY = -20 
var potMinProb1 = 0.5

// variables
var state   = "startup"
var id      = null
var joined  = false
var cost = [0, 0]
var prob = [0, 0]
var xScale  = 1
var yScale  = 1
var mouseX  = 50
var mouseY  = 50
var mouseDown = false
var countdown = 60      // seconds
var shock = 0
var treatment = -1
var minProb1 = 0                             // floor in t=1

var arange = n => [...Array(n).keys()]      // spread operator ...

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
    treatment = msg.treatment
    state   = msg.state
    countdown = msg.countdown
    shock = msg.shock
    if(shock==0) maxCost2 = maxCost2Low
    if(shock==1) maxCost2 = maxCost2High       
    if(treatment==1) {
        minProb1 = potMinProb1        
        if(state=="startup"){
            prob = [potMinProb1,0]
            cost = [minProb1*maxCost1,0]
        }
    }
})
socket.on("clicked",function(msg){
    console.log(`The server says: clicked`, msg)
    console.log(`State:`, state)
})


update = function(){
    var msg = {id}                                        // empty object {}
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
window.onmousemove = function(e){                                  // e - mouse-event
    mouseX = (e.offsetX-yScale/2)*100/yScale                                    // save mouse pos
    mouseY = (yScale - e.offsetY)*100/yScale                         // offsetY diff of pos of mouse and canvas in pixels
}
window.onmousedown = function(e){                                  // debug log
    mouseDown = true
}
window.onmouseup = function(e){
    mouseDown = false
}
setupCanvas = function(canvas,context){                                           // square canvas in %
    xScale = 0.95*window.innerWidth
    yScale = 0.95*window.innerHeight                                        // Classes are capitalized. Math is a unique class.
    canvas.width = xScale
    canvas.height = yScale
    var xTranslate = yScale/2
    var yTranslate = yScale                                         // movement down                                        
    context.setTransform(yScale/100,0,0,yScale/100,xTranslate,yTranslate) // number of pixels per unit (1 => 1 unit = 1 pixel)
}
draw = function(){
    requestAnimationFrame(draw)
    if(state=="investment1") draw1()
    if(state=="investment2") draw2()    
}
draw1 = function(){
    setupCanvas(canvas1,context1)    
    context1.clearRect(0,0,canvas1.width,canvas1.height)
    drawGraph(context1,minProb1)
    drawLines(context1,maxCost1,1,minProb1)
    drawAxisLabels(context1,1,minProb1)
    context1.fillText(`Countdown: ${countdown}`, graphX+graphWidth/2, graphY+15)       // `` backquote
}
draw2 = function(){
    setupCanvas(canvas2,context2)    
    context2.clearRect(0,0,canvas2.width,canvas2.height)
    drawGraph(context2,0)
    drawLines(context2,maxCost2,2,0)
    drawAxisLabels(context2,2,0)
    context2.fillText(`Countdown: ${countdown}`, graphX+graphWidth/2, graphY+15)       // `` backquote
}
drawGraph = function(context,minProb){
    context.strokeStyle = "black"
    context.lineWidth = 0.25
    context.beginPath()
    context.moveTo(graphX,graphY-graphHeight)
    context.lineTo(graphX,graphY)
    context.lineTo(graphX+graphWidth,graphY)
    context.lineTo(graphX+graphWidth,graphY-graphHeight)
    context.stroke()
    var numTicks = 11
    var tickSpaceX = graphWidth/(numTicks-1)
    var tickLength = 3
    context.font = "2pt monospace"
    context.textAlign = "center"
    context.textBaseline = "top"
    context.fillStyle = "black"                
    arange(numTicks).forEach(i => {
        context.beginPath()
        context.moveTo(graphX+i*tickSpaceX,graphY)
        context.lineTo(graphX+i*tickSpaceX,graphY+tickLength)
        context.stroke()
        var xlabel = (minProb+i/10*(1-minProb)).toFixed(2)
        context.fillText(xlabel,graphX+i*tickSpaceX,graphY+tickLength+1)     
    })
    context.textAlign = "right" 
    context.textBaseline = "middle"
    var tickSpaceY = graphHeight/(yMax)
    arange(yMax+1).forEach(i => {
        context.beginPath()
        context.moveTo(graphX,graphY-i*tickSpaceY)
        context.lineTo(graphX-tickLength,graphY-i*tickSpaceY)
        context.stroke()
        context.fillText(i,graphX-tickLength-1,graphY-i*tickSpaceY)     
    })
    context.textAlign = "left" 
    arange(yMax+1).forEach(i => {
        context.beginPath()
        context.moveTo(graphX+graphWidth,graphY-i*tickSpaceY)
        context.lineTo(graphX+graphWidth+tickLength,graphY-i*tickSpaceY)
        context.stroke()
        context.fillText(i,graphX+graphWidth+tickLength+1,graphY-i*tickSpaceY)     
    })
}
drawLines = function(context,maxCost,stage,minProb){
    context.lineWidth = 1
    context.lineCap = "round"
    context.strokeStyle = "blue"     
    context.beginPath()        
    context.moveTo(graphX,graphY-minProb*maxCost/yMax*graphHeight)
    context.lineTo(graphX+graphWidth,graphY-maxCost/yMax*graphHeight)
    context.stroke()
    if(mouseDown){
        var xRatio = Math.max(0,Math.min(1,(mouseX - graphX)/graphWidth))
        prob[stage-1] = minProb + xRatio*(1-minProb)
        cost[stage-1] = prob[stage-1]*maxCost  
    }
    context.lineWidth = 2        
    context.strokeStyle = "red"
    context.beginPath()
    var xRatio = (prob[stage-1]-minProb)/(1-minProb)
    context.moveTo(graphX+xRatio*graphWidth,graphY) 
    context.lineTo(graphX+xRatio*graphWidth,graphY-cost[stage-1]*graphHeight/yMax)
    context.stroke()
}
drawAxisLabels = function(context,stage,minProb){
    context.textAlign = "center"
    context.save()
    context.translate(graphX-10,graphY-graphHeight/2)
    context.rotate(-Math.PI/2)
    context.fillText(`Cost ${stage}`,0,0)
    context.restore()
    context.fillText(`Probability of Receiving Ticket ${stage}`, graphX+graphWidth/2, graphY+10)
}
draw()