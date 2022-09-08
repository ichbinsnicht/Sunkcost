var startupDiv = document.getElementById("startupDiv")
var instructionsDiv = document.getElementById("instructionsDiv")
var idInput = document.getElementById("idInput")
var pleaseWaitDiv = document.getElementById("pleaseWaitDiv")
var investment1Div = document.getElementById("investment1Div")
var feedback1Div = document.getElementById("feedback1Div")
var investment2Div = document.getElementById("investment2Div")
var feedback2Div = document.getElementById("feedback2Div")
var outcomeDiv = document.getElementById("outcomeDiv")
var canvas1 = document.getElementById("canvas1")
var context1 = canvas1.getContext("2d")
var canvas2 = document.getElementById("canvas2")
var context2 = canvas2.getContext("2d")

socket = io()       // browser based socket
var arange = n => [...Array(n).keys()]

// graphical parameters
const yMax = 10
const graphWidth = 70
const graphX = 0.5*(100-graphWidth)
const graphHeight = 60
const graphY = -35
const tickFont = "1.5pt monospace"
const feedbackFont = "1.5pt monospace"
const titleFont = "3pt monospace"
const fullRange = true

// variables
var state   = "startup"
var id      = null
var numPeriods = 0
var joined  = false
var xScale  = 1
var yScale  = 1
var mouseX  = 50
var mouseY  = 50
var mouseDown = false
var countdown = 60      // seconds
var outcomePeriod = 1
var outcomeRandom = [0,0]
var period = 1
var stage = 1
var choice = {1:0,2:0}
var prob = {1:0,2:0}
var cost = {1:0,2:0}
var minProb = {1:0,2:0}
var maxCost = {1:0,2:0}
var maxCost1 = 0                           // marginal cost of the probability in period 1
var maxCost2 = 0
var minProb1 = 0
var hist = {}
var message = {}
var selectProb = 0

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
    if(period != msg.period){
        console.log(period,msg.period)
        cost = {1:0, 2:0}
        prob = {1:0, 2:0}
        selectProb = 0
    }
    message = msg
    state = msg.state
    stage = msg.stage
    countdown = msg.countdown
    period = msg.period
    outcomePeriod = msg.outcomePeriod
    outcomeRandom = msg.outcomeRandom
    endowment = msg.endowment
    winTicket1 = msg.winTicket1
    winTicket2 = msg.winTicket2
    winPrize = msg.winPrize
    totalCost = msg.totalCost
    earnings = msg.earnings 
    hist = msg.hist
    maxCost = msg.hist[msg.period].maxCost
    minProb = msg.hist[msg.period].minProb
})
socket.on("clicked",function(msg){
    console.log(`The server says: clicked`, msg)
    console.log(`State:`, state)
})


update = function(){
    var msg = {
        id,
        period,
        stage,
        currentChoice: choice[stage],
        currentProb: prob[stage],
        currentCost: cost[stage],
        maxCost2,
        minProb1,                    
    }
    socket.emit("clientUpdate",msg)
    startupDiv.style.display = "none"
    instructionsDiv.style.display = "none"
    pleaseWaitDiv.style.display = "none"
    investment1Div.style.display = "none"
    feedback1Div.style.display = "none"
    investment2Div.style.display = "none"
    feedback2Div.style.display = "none"    
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
    if(joined&&state=="feedback1"){
        var text = ""
        text += `<b>Period ${period} - Stage 1 Feedback</b><br><br><br>`
        text += `&nbsp; Your probability of receiving ticket 1: <font color="green">${(prob[1]*100).toFixed(0)}%</font> <br><br>`
        text += `&nbsp; Your cost in stage 1: <font color="red">$${cost[1].toFixed(2)}</font><br><br><br>`
        text += `Stage 2 will begin in ${countdown} seconds.`
        feedback1Div.innerHTML = text
        feedback1Div.style.display = "block"        
    }    
    if(joined&&state=="investment2"){
        investment2Div.style.display = "block"
    }
    if(joined&&state=="feedback2"){
        const periodEarnings = endowment-cost[1] -cost[2]       
        var text = ""
        text += `<b>Period ${period} - Stage 2 Feedback</b><br><br><br>`
        text += `&nbsp; Your probability of receiving ticket 1: <font color="green">${(prob[1]*100).toFixed(0)}%</font> <br><br>`
        text += `&nbsp; Your probability of receiving ticket 2: <font color="green">${(prob[2]*100).toFixed(0)}%</font> <br><br>`
        text += `&nbsp; Your probability of winning the prize: <font color="green">${(prob[1]*prob[2]*100).toFixed(0)}%</font><br><br>`
        text += `&nbsp; Your cost in stage 1: <font color="red">$${cost[1].toFixed(2)}</font><br><br>`
        text += `&nbsp; Your cost in stage 2: <font color="red">$${cost[2].toFixed(2)}</font><br><br>`
        text += `&nbsp; Your total cost: <font color="red">$${(cost[1]+cost[2]).toFixed(2)}</font><br><br>`
        text += `&nbsp; Your earnings for this period: $${periodEarnings.toFixed(2)}<br><br><br>`  
        if(period!=numPeriods) text += `The next period will begin in ${countdown} seconds.`
        else text += `Payment will begin in ${countdown} seconds.`
        feedback2Div.innerHTML = text
        feedback2Div.style.display = "block"
    }
    if(joined&&state=="outcome"){
        var ticket1Message = winTicket1 ? "received" : "did not receive" 
        var ticket2Message = winTicket2 ? "received" : "did not receive"
        var prizeMessage = winPrize ? "will" : "will not"  
        var text = ""
        text += `Period ${outcomePeriod} was randomly selected. <br><br><br><br>`
        text += `&nbsp; You ${ticket1Message} ticket 1.<br><br>`
        text += `&nbsp; You ${ticket2Message} ticket 2.<br><br>`
        text += `&nbsp; You <b>${prizeMessage}</b> receive the prize.<br><br><br><br>`
        //text += `&nbsp; Your total cost was <font color="red">${totalCost.toFixed(2)}</font><br><br>`
        text += `&nbsp; Your final payment will be <b>$${earnings.toFixed(2)}</b>.<br><br><br><br>`
        text += `Please wait while we prepare your payment.` 
        outcomeDiv.innerHTML = text
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
window.onmousemove = function(e){
    const canvas = state == "investment1" ? canvas1 : canvas2
    const x0 = canvas.width/2-canvas.height/2
    const y0 = canvas.height
    mouseX = (e.offsetX-x0)*100/canvas.height
    mouseY = (y0 - e.offsetY)*100/canvas.height
}
window.onmousedown = function(e){
    mouseDown = true
    var xRatio = Math.max(0,Math.min(1,e.offsetX/window.innerWidth))
    console.log("Stage:",stage)
    choice[stage] = xRatio
    prob[stage] = Math.max(minProb[stage],choice[stage])
    cost[stage] = prob[stage]*maxCost[stage]
    console.log("Choice",choice)
    console.log("minProb",minProb)
    console.log("Prob:",prob)       // issue: prob not kept over stages
    console.log("maxCost:",maxCost)  
    console.log("cost:",cost)       
    selectProb = prob[stage]
}
window.onmouseup = function(e){
    mouseDown = false
}

/*
setupCanvas = function(canvas,context){
    xScale = 1*window.innerWidth
    yScale = 1*window.innerHeight                                  // Classes are capitalized. Math is a unique class.
    canvas.width = xScale
    canvas.height = yScale
    var xTranslate = xScale/2 - yScale/2
    var yTranslate = yScale                                                                          
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
    context1.textAlign = "center"
    context1.textBaseline = "bottom"
    context1.font = titleFont   
    context1.fillText(`Period ${period} - Stage 1`, graphX+0.5*graphWidth, graphY-graphHeight)      
    drawGraph(context1,minProb1)
    drawLines(context1,maxCost1,1,minProb1)
    drawAxisLabels(context1,1) 
    context1.textAlign = "left"
    context1.textBaseline = "middle"
    context1.font = feedbackFont
    context1.fillText(`Your probability of receiving ticket 1: `, graphX, graphY+15)   
    context1.fillStyle = "green" 
    context1.fillText(`${(prob[1]*100).toFixed(0)}%`, graphX+graphWidth*0.65, graphY+15) 
    context1.fillStyle = "black"    
    context1.fillText(`Your cost in stage 1: `, graphX, graphY+17.5)
    context1.fillStyle = "red"      
    context1.fillText(`$${cost[1].toFixed(2)}`,  graphX+graphWidth*0.35, graphY+17.5)
    context1.textAlign = "center"
    context1.fillStyle = "black"
    context1.fillText(`Countdown: ${countdown}`, graphX+graphWidth/2, graphY+32)
}
draw2 = function(){
    setupCanvas(canvas2,context2)    
    context2.clearRect(0,0,canvas2.width,canvas2.height)
    context2.textAlign = "center"
    context2.textBaseline = "bottom"
    context2.font = titleFont   
    context2.fillText(`Period ${period} - Stage 2`, graphX+0.5*graphWidth, graphY-graphHeight)      
    drawGraph(context2,0)
    drawLines(context2,maxCost2,2,0)
    drawAxisLabels(context2,2)
    context2.textAlign = "left"
    context2.textBaseline = "middle"
    context2.font = feedbackFont
    context2.fillText(`Your probability of receiving ticket 1: `, graphX, graphY+15)   
    context2.fillStyle = "green" 
    context2.fillText(`${(prob[1]*100).toFixed(0)}%`, graphX+graphWidth*0.65, graphY+15) 
    context2.fillStyle = "black"    
    context2.fillText(`Your probability of receiving ticket 2: `, graphX, graphY+17.5)
    context2.fillStyle = "green" 
    context2.fillText(`${(prob[2]*100).toFixed(0)}%`,  graphX+graphWidth*0.65, graphY+17.5) 
    context2.fillStyle = "black"        
    context2.fillText(`Your probability of receiving the prize: `, graphX, graphY+20)
    context2.fillStyle = "green" 
    context2.fillText(`${(prob[1]*prob[2]*100).toFixed(0)}%`,  graphX+graphWidth*0.65, graphY+20)     
    context2.fillStyle = "black"    
    context2.fillText(`Your cost in stage 1: `, graphX, graphY+22.5)
    context2.fillStyle = "red"      
    context2.fillText(`$${cost[1].toFixed(2)}`,  graphX+graphWidth*0.35, graphY+22.5)
    context2.fillStyle = "black"    
    context2.fillText(`Your cost in stage 2: `, graphX, graphY+25)
    context2.fillStyle = "red"
    context2.fillText(`$${cost[2].toFixed(2)}`,  graphX+graphWidth*0.35, graphY+25)
    context2.fillStyle = "black"    
    context2.fillText(`Your total cost: `, graphX, graphY+27.5)
    context2.fillStyle = "red"      
    context2.fillText(`$${(cost[1]+cost[2]).toFixed(2)}`,  graphX+graphWidth*0.35, graphY+27.5)             
    context2.textAlign = "center"
    context2.fillStyle = "black"        
    context2.fillText(`Countdown: ${countdown}`, graphX+graphWidth/2, graphY+32)
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
    context.font = tickFont
    context.textAlign = "center"
    context.textBaseline = "top"
    context.fillStyle = "black"                
    arange(numTicks).forEach(i => {
        context.beginPath()
        context.moveTo(graphX+i*tickSpaceX,graphY)
        context.lineTo(graphX+i*tickSpaceX,graphY+tickLength)
        context.stroke()
        const minXRange = fullRange ? 0 : minProb
        var xnum = Math.max(minProb,(minXRange+i/10*(1-minXRange)))
        var xlabel = (xnum*100).toFixed(0) + "%"
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
        var ylabel = "$" + i.toFixed(0)
        context.fillText(ylabel,graphX-tickLength-1,graphY-i*tickSpaceY)     
    })
    context.textAlign = "left" 
    arange(yMax+1).forEach(i => {
        context.beginPath()
        context.moveTo(graphX+graphWidth,graphY-i*tickSpaceY)
        context.lineTo(graphX+graphWidth+tickLength,graphY-i*tickSpaceY)
        context.stroke()
        var ylabel = "$" + i.toFixed(0)
        context.fillText(ylabel,graphX+graphWidth+tickLength+1,graphY-i*tickSpaceY)     
    })
}
drawLines = function(context,maxCostDraw,stage,minProbDraw){
    const minXRange = fullRange ? 0 : minProbDraw
    context.lineWidth = 1
    context.lineCap = "round"
    context.strokeStyle = "blue"
    if(fullRange){
        context.beginPath()
        context.moveTo(graphX,graphY-minProbDraw*maxCostDraw*graphHeight/yMax)
        context.lineTo(graphX+minProbDraw*graphWidth,graphY-minProbDraw*maxCostDraw/yMax*graphHeight)
        context.lineTo(graphX+graphWidth,graphY-maxCostDraw/yMax*graphHeight)
        context.stroke()    
    }else{
        context.beginPath()
        context.moveTo(graphX,graphY-minXRange*maxCostDraw/yMax*graphHeight)
        context.lineTo(graphX+graphWidth,graphY-maxCostDraw/yMax*graphHeight)
        context.stroke()            
    }
    context.lineWidth = 2        
    context.strokeStyle = "red"
    context.beginPath()
    var xRatio = (selectProb-minXRange)/(1-minXRange)
    context.moveTo(graphX+xRatio*graphWidth,graphY) 
    context.lineTo(graphX+xRatio*graphWidth,graphY-cost[stage]*graphHeight/yMax)
    context.stroke()
}
drawAxisLabels = function(context,stage){
    context.textAlign = "center"
    context.save()
    context.translate(graphX-10,graphY-graphHeight/2)
    context.rotate(-Math.PI/2)
    context.fillText(`Cost ${stage}`,0,0)
    context.restore()
    context.fillText(`Probability of Receiving Ticket ${stage}`, graphX+graphWidth/2, graphY+10)
}
draw()
*/