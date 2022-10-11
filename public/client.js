var startupDiv = document.getElementById("startupDiv")
var instructionsDiv = document.getElementById("instructionsDiv")
var idInput = document.getElementById("idInput")
var pleaseWaitDiv = document.getElementById("pleaseWaitDiv")
var interfaceDiv = document.getElementById("interfaceDiv")
var outcomeDiv = document.getElementById("outcomeDiv")
var idInput = document.getElementById("idInput")
var canvas = document.getElementById("canvas")
var context = canvas.getContext("2d")

socket = io()       // browser based socket
var arange = n => [...Array(n).keys()]

// graphical parameters
const yMax = 10
const graphWidth = 70
const graphX = 0.5*(100-graphWidth)
const graphHeight = 50
const graphY = -10
const lineY = -90
const tickFont = "1.5pt monospace"
const labelFont = "2pt monospace"
const feedbackFont = "3pt monospace"
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
var mouseGraphX = 0.5
var mouseDown = false
var countdown = 60      // seconds
var outcomePeriod = 1
var outcomeRandom = [0,0]
var period = 1
var stage = 1
var choice = {1:0,2:0}
var prob = {1:0,2:0}
var minProb = {1:0,2:0}
var cost = {1:0,2:0}
var maxCost = {1:0,2:0}
var hist = {}
var message = {}
var selectProb = 0
var mouseEvent = {x:0,y:0}
var earnings = 0
var winPrize = 0

document.onmousedown = function(event){
    msg = {
        x : event.x,
        y : event.y,   
    }
    socket.emit("clientClick",msg)
}

socket.on("connected", function(msg){
    console.log(`connected`)
})
socket.on("clientJoined",function(msg){
    console.log(`client ${msg.id} joined`)
    joined = true 
    period = msg.period
    hist = msg.hist
    choice = hist[period].choice
    prob = hist[period].prob
    cost = hist[period].cost
    minProb = hist[period].minProb
    maxCost = hist[period].maxCost
    console.log("hist",hist)
    setInterval(update, 10)
})
socket.on("serverUpdateClient", function(msg){
    if(period != msg.period){
        console.log("mouseEvent",mouseEvent)
        console.log("period",period)
        console.log("choice",choice)
        console.log("prob",prob)
        console.log("cost",cost)
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
    if(stage<3) updateChoice()
    var msg = {
        id,
        period,
        stage,
        currentChoice: choice[stage],
        currentProb: prob[stage],
        currentCost: cost[stage],
        maxCost2: maxCost[2],
        minProb1: minProb[1],                    
    }
    socket.emit("clientUpdate",msg)
    startupDiv.style.display = "none"
    instructionsDiv.style.display = "none"
    pleaseWaitDiv.style.display = "none"
    interfaceDiv.style.display = "none"
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
    if(joined&&state=="interface"){
        interfaceDiv.style.display = "block"
    }
    if(joined&&state=="end"){
        interfaceDiv.style.display = "block"
    }
}
joinGame = function(){
    id = parseInt(idInput.value)
    console.log(`subjectId`, id)
    if (id>0) {
        console.log(`joinGame`)
        msg = {id}
        socket.emit("joinGame",msg)
    } else {
        alert("Please enter subject id.")
    }
}
window.onmousemove = function(e){
    mouseEvent = e
}
updateChoice = function(){
    const x0 = canvas.width/2-canvas.height/2
    const y0 = canvas.height
    mouseX = (mouseEvent.offsetX-x0)*100/canvas.height
    mouseY = (y0 - mouseEvent.offsetY)*100/canvas.height
    const mouseGraphX = (mouseX - graphX)/graphWidth
    if(stage<3){
        choice[stage] = Math.max(0,Math.min(1,mouseGraphX))
        prob[stage] = Math.max(minProb[stage],choice[stage])
        cost[stage] = prob[stage]*maxCost[stage]
        selectProb = prob[stage]  
    }
}
window.onmousedown = function(e){
    mouseDown = true
    console.log("Choice",choice)   
    console.log("Prob", prob)
}
window.onmouseup = function(e){
    mouseDown = false
}
window.onkeydown = function(e){
    if(e.key=="Enter" && state =="startup") joinGame()
}

draw = function(){
    requestAnimationFrame(draw)
    setupCanvas()
    context.clearRect(0,0,canvas.width,canvas.height)   
    if(state=="interface") drawInterface() 
    if(state=="end") drawOutcome()
}
setupCanvas = function(){
    xScale = 1*window.innerWidth
    yScale = 1*window.innerHeight                                  
    canvas.width = xScale
    canvas.height = yScale
    var xTranslate = xScale/2 - yScale/2
    var yTranslate = yScale                                                                          
    context.setTransform(yScale/100,0,0,yScale/100,xTranslate,yTranslate)
    //console.log("setupCanvas")
}
drawInterface = function(){
    if(stage<3) drawTop()
    if(stage==1) drawStage1Text()
    if(stage==2) drawBottom()
    if(stage==3) drawFeedback()
}
drawTop = function(){
    context.fillStyle = "rgb(0,0,0)"
    context.strokeStyle = "black"
    context.lineWidth = 0.25
    context.beginPath()
    context.moveTo(graphX,lineY)
    context.lineTo(graphX+graphWidth,lineY) 
    context.stroke()
    const numTicks = 6
    const tickLength = 2
    const tickSpace = 1    
    context.font = tickFont
    context.textAlign = "center"
    context.textBaseline = "top"
    if(stage==2){
        arange(numTicks).forEach(i => {
            const weight = i/(numTicks-1)
            const x = (1-weight)*graphX+weight*(graphX+graphWidth)
            const yTop = lineY-tickLength
            context.beginPath()
            context.moveTo(x,lineY)
            context.lineTo(x,yTop) 
            context.stroke()
            const xCostLabel = weight*maxCost[1]
            context.textBaseline = "bottom"
            context.fillText(xCostLabel,x,yTop-tickSpace)    
        })
    }
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const x = (1-weight)*graphX+weight*(graphX+graphWidth)
        const yTop = lineY-tickLength
        const yBottom = lineY+tickLength
        context.beginPath()
        context.moveTo(x,lineY)
        context.lineTo(x,yBottom) 
        context.stroke()  
        const xProbLabel = weight
        context.textBaseline = "top"
        context.fillText(xProbLabel,x,yBottom+tickSpace)
    })
    context.font = labelFont
    if(stage==2){
        context.textBaseline = "top"
        context.fillStyle = "rgb(213,94,0)"
        context.fillText("Bound",graphX+graphWidth*minProb[1],lineY+tickLength+tickSpace+5)
        context.beginPath()
        context.arc(graphX+graphWidth*minProb[1],lineY,2.5,0,2*Math.PI)
        context.fill()        
        context.fillStyle = "rgb(0,158,115)"
        context.textBaseline = "bottom"
        context.fillText("Cost 1",graphX+graphWidth*prob[1],lineY-tickLength-tickSpace-2.5)
        context.textBaseline = "top"
        context.fillText("Probability 1",graphX+graphWidth*prob[1],lineY+tickLength+tickSpace+2.5)
        context.beginPath()
        context.arc(graphX+graphWidth*prob[1],lineY,1.5,0,2*Math.PI)
        context.fill()
    }
    context.fillStyle = "rgb(0,114,178)"
    context.textBaseline = "top"
    context.fillText("Choice 1",graphX+graphWidth*choice[1],lineY+tickLength+tickSpace+7.5)
    context.beginPath()
    context.arc(graphX+graphWidth*choice[1],lineY,1,0,2*Math.PI)
    context.fill()
}
drawStage1Text = function(){
    context.fillStyle = "black"
    context.textBaseline = "top"
    context.textAlign = "center"
    const choice1String = choice[1].toFixed(2)
    context.fillText(`Countdown: ${countdown}`,graphX+0.5*graphWidth,lineY+14)
    context.fillText(`Choice 1: ${choice1String}`,graphX+0.5*graphWidth,lineY+20)
    const line1 = "You are currently selecting Choice 1"
    const line2 = "Probability 1 is your probability of receiving ticket 1."    
    const line3 = "Your Bound will be a randomly selected number."
    const line4 = "Probability 1 will equal the maximum of your Choice 1 and your Bound."
    const line5 = `Your Cost 1 will be equal to ${maxCost[1].toFixed(2)} times Probability 1.`
    const line6 = "In the next stage you will choose Probability 2"
    const line7 = "Your Marginal Cost will be a randomly selected number."
    const line8 = `Your Cost 2 will be equal to Marginal Cost times Probability 2.`
    const line9 = `Your Total Cost is Cost 1 plus Cost 2.`
    const line10 = "Your probability of winning the prize will be will Probability 1 times Probability 2."
    context.fillText(line1,graphX+0.5*graphWidth,lineY+30+4)
    context.fillText(line2,graphX+0.5*graphWidth,lineY+34+4)
    context.fillText(line3,graphX+0.5*graphWidth,lineY+38+4)
    context.fillText(line4,graphX+0.5*graphWidth,lineY+42+4)
    context.fillText(line5,graphX+0.5*graphWidth,lineY+46+4)
    context.fillText(line6,graphX+0.5*graphWidth,lineY+50+4)
    context.fillText(line7,graphX+0.5*graphWidth,lineY+54+4)
    context.fillText(line8,graphX+0.5*graphWidth,lineY+58+4)
    context.fillText(line9,graphX+0.5*graphWidth,lineY+62+4)
    context.fillText(line10,graphX+0.5*graphWidth,lineY+66+4)
}
drawBottom = function(){
    context.fillStyle = "rgb(0,0,0)"
    context.strokeStyle = "black"
    context.lineWidth = 0.25
    context.fillText(`Countdown: ${countdown}`,graphX+0.5*graphWidth,lineY+14)
    context.beginPath()
    context.moveTo(graphX,graphY-graphHeight)
    context.lineTo(graphX,graphY)
    context.lineTo(graphX+graphWidth,graphY)
    context.lineTo(graphX+graphWidth,graphY-graphHeight)
    context.stroke()
    drawBottomLabelsX()
    drawBottomLabelsLeftY()
    drawBottomLabelsRightY()
    context.fillStyle = "rgb(0,0,0)"
    context.strokeStyle = "rgb(0,158,115)"
    context.lineWidth = 1
    context.lineCap = "round"
    context.beginPath()
    context.moveTo(graphX,graphY)
    context.lineTo(graphX+graphWidth,graphY-graphHeight*prob[1])
    context.stroke()   
    context.fillStyle = "rgb(0,114,178)"
    context.beginPath()
    context.arc(graphX+graphWidth*prob[2],graphY-graphHeight*prob[1]*prob[2],1.5,0,2*Math.PI)
    context.fill() 
    context.fillStyle = "rgb(0,0,0)"
    context.textAlign = "center"
    context.fillText(`Probability 1: ${prob[1].toFixed(2)}      Probability 2: ${prob[2].toFixed(2)}`,graphX+0.5*graphWidth,lineY+20)
    context.fillText(`Total Cost: ${(cost[1]+cost[2]).toFixed(2)}    Winning Probability: ${(prob[1]*prob[2]).toFixed(2)}`,graphX+0.5*graphWidth,lineY+24)
}
drawBottomLabelsX = function(){
    const numTicks = 6
    const tickLength = 2
    const tickSpace = 1    
    context.font = tickFont
    context.textAlign = "center"
    context.textBaseline = "top"
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const x = (1-weight)*graphX+weight*(graphX+graphWidth)
        const yTop = graphY
        const yBottom = graphY+tickLength
        context.beginPath()
        context.moveTo(x,yTop)
        context.lineTo(x,yBottom) 
        context.stroke()  
        const xProbLabel = weight
        context.textBaseline = "top"
        context.textAlign = "center"
        context.fillText(xProbLabel,x,yBottom+tickSpace) 
    })
    context.font = labelFont
    context.fillStyle = "rgb(0,158,115)"
    context.textBaseline = "top"
    context.fillText("Probability 2",graphX+graphWidth*prob[2],graphY+tickLength+tickSpace+2.5)
}
drawBottomLabelsLeftY = function(){
    const numTicks = 6
    const tickLength = 2
    const tickSpace = 1    
    context.font = tickFont
    context.fillStyle = "rgb(0,0,0)"
    context.textAlign = "center"
    context.textBaseline = "top"
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const y = (1-weight)*graphY+weight*(graphY-graphHeight)
        const xRight = graphX
        const xLeft = graphX-tickLength
        context.beginPath()
        context.moveTo(xRight,y)
        context.lineTo(xLeft,y) 
        context.stroke()  
        const yCostLabel = ((1-weight)*cost[1]+weight*(maxCost[1]+maxCost[2])).toFixed(2)
        context.textBaseline = "middle"
        context.textAlign = "right"
        context.fillText(yCostLabel,graphX-tickLength-tickSpace,y) 
    })
    context.font = labelFont
    context.fillStyle = "rgb(0,158,115)"
    context.textBaseline = "middle"
    context.textAlign = "right"
    context.fillText("Total Cost",graphX-tickLength-tickSpace-6,graphY-graphHeight*prob[1]*prob[2])
}
drawBottomLabelsRightY = function(){
    const numTicks = 6
    const tickLength = 2
    const tickSpace = 1    
    context.font = tickFont
    context.fillStyle = "rgb(0,0,0)"
    context.textAlign = "center"
    context.textBaseline = "top"
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const y = (1-weight)*graphY+weight*(graphY-graphHeight)
        const xLeft = graphX+graphWidth
        const xRight = graphX+graphWidth+tickLength
        context.beginPath()
        context.moveTo(xRight,y)
        context.lineTo(xLeft,y) 
        context.stroke()  
        const yCostLabel = weight.toFixed(2)
        context.textBaseline = "middle"
        context.textAlign = "left"
        context.fillText(yCostLabel,graphX+graphWidth+tickLength+tickSpace,y) 
    })
    context.font = labelFont
    context.fillStyle = "rgb(0,158,115)"
    context.textBaseline = "middle"
    context.textAlign = "left"
    context.fillText("Winning Probability",graphX+graphWidth+tickLength+tickSpace+6,graphY-graphHeight*prob[1]*prob[2])
}
drawFeedback = function(){
    context.fillStyle = "rgb(0,0,0)"
    context.textAlign = "center"
    context.strokeStyle = "black"
    context.font = feedbackFont
    context.lineWidth = 0.25
    const line1 = "If this stage is randomly selected at the end of the experiment: "
    const line2 = `You will have a ${(prob[1]*prob[2]*100).toFixed(0)}% chance of winning the prize.`
    const line3 = `You will pay a total cost of $${(cost[1]+cost[2]).toFixed(2)} out of your endowment.`
    context.fillText(line1,graphX+0.5*graphWidth,lineY+24)
    context.fillText(line2,graphX+0.5*graphWidth,lineY+34)
    context.fillText(line3,graphX+0.5*graphWidth,lineY+42)
    const line4 = `Countdown: ${countdown}`
    context.fillText(line4,graphX+0.5*graphWidth,lineY+60)
}
drawOutcome = function(){
    console.log("drawOutcome")
    context.fillStyle = "rgb(0,0,0)"
    context.textAlign = "center"
    context.strokeStyle = "black"
    context.font = feedbackFont
    context.lineWidth = 0.25
    const line1 = "The experiment is complete"
    const line2 = `Period ${outcomePeriod} was randomly selected`
    const line3A = "You won the prize"
    const line3B = "You did not win the prize"
    const line3 = winPrize == 1 ? line3A : line3B
    const line4 = `You earned $${earnings.toFixed(2)}`
    const line5 = "Please wait while your payment is prepared"
    context.fillText(line1,graphX+0.5*graphWidth,lineY+14)
    context.fillText(line2,graphX+0.5*graphWidth,lineY+22)
    context.fillText(line3,graphX+0.5*graphWidth,lineY+42)
    context.fillText(line4,graphX+0.5*graphWidth,lineY+50)
    context.fillText(line5,graphX+0.5*graphWidth,lineY+58)
}
draw()