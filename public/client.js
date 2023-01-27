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

var baseInstructionsString = `
This is an experiment about individual decision making. If you pay attention to these instructions, you can earn a significant amount of money. Your earnings will depend on the decisions you make during the experiment.<br><br>

At the beginning of the experiment, you will receive an endowment of $15.<br> 
At the end of the experiment, depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

This experiment has two stages. In each stage you will receive a score and pay a cost. At the end of the experiment, your probability of winning the $15 Starbucks gift card will be score 1 plus score 2. Your final payment will be your $15 endowment minus cost 1 and cost 2.<br><br>

At the beginning of stage 1, multiplier 1 will be randomly selected to be either $1 or $10. During stage 1, you will choose a number from 0 to 0.5. At the end of stage 1, a number will be randomly selected from 0 to 0.5. Score 1 will be either the number you chose or the randomly selected number. Both are equally likely. Cost 1 will be score 1 times multiplier 1.<br><br>

At the beginning of stage 2, multiplier 2 will be randomly selected to be either $1 or $10. During stage 2, you will choose another number from 0 to 0.5. Score 2 will always be the number you chose. Cost 2 will be score 2 times the multiplier 2.<br><br>

<br><br>`

var readyInstructionsString = baseInstructionsString + `The experiment is about to begin. One of the following periods will be randomly selected to determine your final earnings and whether you receive the $15 Starbucks gift card. If you have any questions, raise your hand and we will come to assist you.`

// graphical parameters
const yMax = 10
const graphWidth = 70
const graphX = 0.5*(100-graphWidth)
const graphHeight = 50
const graphY = -22
const lineY1 = -90
const lineY2 = -65
const tickFont = "1.5pt monospace"
const labelFont = "2pt monospace"
const feedbackFont = "3pt monospace"
const titleFont = "3pt monospace"
const fullRange = true
const black = "rgb(0,0,0)"
const green = "rgb(0,200,0)"
const darkGreen = "rgb(0,150,0)"
const red = "rgb(256,0,0)"
const darkRed = "rgb(150,0,0)"
const blue = "rgb(0,50,256)"

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
var baseline = 0
var countdown = 60      // seconds
var outcomePeriod = 1
var outcomeRandom = [0,0]
var period = 1
var stage = 1
var experimentStarted = false
var practiceComplete = false
var numPracticePeriods = 0
var choice = {1:0,2:0}
var score = {1:0,2:0}
var forcedScore = {1:0,2:0}
var forced = {1:0,2:0}
var cost = {1:0,2:0}
var multiplier = {1:0,2:0}
var hist = {}
var message = {}
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
    score = hist[period].score
    cost = hist[period].cost
    forcedScore = hist[period].forcedScore
    multiplier = hist[period].multiplier
    console.log("hist",hist)
    setInterval(update, 10)
})
socket.on("serverUpdateClient", function(msg){
    if(period != msg.period){
        console.log("mouseEvent",mouseEvent)
        console.log("period",period)
        console.log("choice",choice)
        console.log("score",score)
        console.log("cost",cost)
        console.log(period,msg.period)
        cost = {1:0, 2:0}
        score = {1:0, 2:0}
    }
    message = msg
    stage = msg.stage
    experimentStarted = msg.experimentStarted
    practiceComplete = msg.practiceComplete
    numPracticePeriods = msg.numPracticePeriods
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
    multiplier = msg.hist[msg.period].multiplier
    forcedScore = msg.hist[msg.period].forcedScore
    forced = msg.hist[msg.period].forced
    if(state!=msg.state){
        var practiceInstructionsString = baseInstructionsString + `First, you will participate in ${numPracticePeriods} practice periods. The practice periods will not affect your final earnings. They are just for practice. If you have any questions, raise your hand and we will come to assist you.`      
        instructionsDiv.innerHTML = practiceComplete ? readyInstructionsString : practiceInstructionsString
    }
    state = msg.state
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
        currentScore: score[stage],
        currentCost: cost[stage],                  
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
        choice[stage] = 0.5*Math.max(0,Math.min(1,mouseGraphX))
        score[stage] = forced[stage]*forcedScore[stage] + (1-forced[stage])*choice[stage]
        cost[stage] = score[stage]*multiplier[stage]  
    }
}
window.onmousedown = function(e){
    mouseDown = true
    console.log("Choice",choice)   
    console.log("Score", score)
    console.log("Forced",forced)  
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
    drawTop()
    if(stage==1) drawStage1Text()
    if(stage>=2) drawBottom()
    if(stage>=2) drawStage2Text()
    if(stage>=2) drawBarTotalCost()
    if(stage>=2) drawBarWinProb()    
    //if(stage==3) drawFeedback()
}
drawTop = function(){
    context.fillStyle = black
    context.strokeStyle = "black"
    context.lineWidth = 0.25
    context.beginPath()
    context.moveTo(graphX,lineY1)
    context.lineTo(graphX+graphWidth,lineY1) 
    context.stroke()
    const numTicks = 6
    const tickLength = 2
    const tickSpace = 1    
    context.font = tickFont
    context.textAlign = "center"
    context.textBaseline = "top"
    //if(stage==2){
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const x = (1-weight)*graphX+weight*(graphX+graphWidth)
        const yTop = lineY1-tickLength
        context.beginPath()
        context.moveTo(x,lineY1)
        context.lineTo(x,yTop) 
        context.stroke()
        const xCostLabel = `$${(0.5*weight*multiplier[1]).toFixed(2)}`
        context.textBaseline = "bottom"
        context.fillText(xCostLabel,x,yTop-tickSpace)    
    })
    //}
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const x = (1-weight)*graphX+weight*(graphX+graphWidth)
        const yTop = lineY1-tickLength
        const yBottom = lineY1+tickLength
        context.beginPath()
        context.moveTo(x,lineY1)
        context.lineTo(x,yBottom) 
        context.stroke()  
        const xScoreLabel = `${weight*50}%`
        context.textBaseline = "top"
        context.fillText(xScoreLabel,x,yBottom+tickSpace)
    })
    context.font = labelFont
    if(stage==2){
        context.textBaseline = "top"
        context.fillStyle = darkGreen
        context.fillText("Score 1",graphX+graphWidth*2*score[1],lineY1+tickLength+tickSpace+2.5)
        context.beginPath()
        context.arc(graphX+graphWidth*2*score[1],lineY1,1.5,0,2*Math.PI)
        context.fill()
        context.fillStyle = darkRed
        context.textBaseline = "bottom"
        context.fillText("Cost 1",graphX+graphWidth*2*score[1],lineY1-tickLength-tickSpace-2.5)
        context.textBaseline = "top"        
        context.beginPath()
        context.arc(graphX+graphWidth*2*score[1],lineY1,1.5,Math.PI,2*Math.PI)
        context.fill()        
    }
    context.fillStyle = blue
    context.textBaseline = "top"
    const choice1Y = stage==1 ? 4 : 5.5
    context.fillText("Choice 1",graphX+graphWidth*2*choice[1],lineY1+tickLength+tickSpace+choice1Y)
    context.beginPath()
    context.arc(graphX+graphWidth*2*choice[1],lineY1,1,0,2*Math.PI)
    context.fill()
    context.fillStyle = "black"
    context.textBaseline = "middle"
    context.textAlign = "left"
    const multiplier1String = `Multiplier 1: $${(multiplier[1]).toFixed(0)}`
    context.fillText(multiplier1String,graphX+graphWidth+10,lineY1)    
}
drawBottom = function(){
    context.fillStyle = black
    context.strokeStyle = "black"
    context.lineWidth = 0.25
    context.beginPath()
    context.moveTo(graphX,lineY2)
    context.lineTo(graphX+graphWidth,lineY2) 
    context.stroke()
    const numTicks = 6
    const tickLength = 2
    const tickSpace = 1    
    context.font = tickFont
    context.textAlign = "center"
    context.textBaseline = "top"
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const x = (1-weight)*graphX+weight*(graphX+graphWidth)
        const yTop = lineY2-tickLength
        context.beginPath()
        context.moveTo(x,lineY2)
        context.lineTo(x,yTop) 
        context.stroke()
        const xCostLabel = `$${(0.5*weight*multiplier[2]).toFixed(2)}`
        context.textBaseline = "bottom"
        context.fillText(xCostLabel,x,yTop-tickSpace)    
    })
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const x = (1-weight)*graphX+weight*(graphX+graphWidth)
        const yTop = lineY2-tickLength
        const yBottom = lineY2+tickLength
        context.beginPath()
        context.moveTo(x,lineY2)
        context.lineTo(x,yBottom) 
        context.stroke()  
        const xScoreLabel = `${weight*50}%`
        context.textBaseline = "top"
        context.fillText(xScoreLabel,x,yBottom+tickSpace)
    }) 
    context.font = labelFont
    context.textBaseline = "top"
    context.fillStyle = green    
    context.fillText("Score 2",graphX+graphWidth*2*score[2],lineY2+tickLength+tickSpace+2.5)
    context.beginPath()
    context.arc(graphX+graphWidth*2*score[2],lineY2,1.5,0,2*Math.PI)
    context.fill()
    context.fillStyle = red
    context.textBaseline = "bottom"
    context.fillText("Cost 2",graphX+graphWidth*2*score[2],lineY2-tickLength-tickSpace-2.5)
    context.textBaseline = "top"
    context.beginPath()
    context.arc(graphX+graphWidth*2*score[2],lineY2,1.5,Math.PI,2*Math.PI)
    context.fill()
    context.fillStyle = blue
    context.textBaseline = "top"
    const choice2Y = 5.5
    context.fillText("Choice 2",graphX+graphWidth*2*choice[2],lineY2+tickLength+tickSpace+choice2Y)
    context.beginPath()
    context.arc(graphX+graphWidth*2*choice[2],lineY2,1,0,2*Math.PI)
    context.fill()
    context.fillStyle = "black"
    context.textBaseline = "middle"
    context.textAlign = "left"
    const multiplier2String = `Multiplier 2: $${(multiplier[2]).toFixed(0)}`
    context.fillText(multiplier2String,graphX+graphWidth+10,lineY2)    
}
drawStage1Text = function(){
    context.fillStyle = "black"
    context.textBaseline = "top"
    context.textAlign = "center"
    const choice1String = `${(choice[1]*100).toFixed(0)}%`
    context.fillText(`Countdown: ${countdown}`,graphX+0.5*graphWidth,lineY1+14)
    context.fillStyle = blue
    context.fillText(`Choice 1: ${choice1String}`,graphX+0.5*graphWidth,lineY1+20)
    context.fillStyle = "black"
    const line1 = "You are currently selecting Choice 1."
    const line2 = "A number will be randomly selected from 0 to 0.5."    
    const line3 = "Score 1 will be either Choice 1 or the randomly selected number." 
    const line4 = "Both options are equally likely."
    const line5 = `Your Cost 1 will be $${multiplier[1].toFixed(2)} times Score 1.`
    const line6 = "In the next stage you will choose Score 2."
    const line7 = "Your Cost Multiplier will be 1 or 5. Both options are equally likely."
    const line8 = `Your Cost 2 will be the Cost Multiplier times Score 2.`
    const line9 = `Your Total Cost will be Cost 1 plus Cost 2.`
    const line10 = "Your probability of winning the $15 Starbucks gift card will be Score 1 plus Score 2."
    context.fillText(line1,graphX+0.5*graphWidth,lineY1+30)
    context.fillText(line2,graphX+0.5*graphWidth,lineY1+34)
    context.fillText(line3,graphX+0.5*graphWidth,lineY1+38)
    context.fillText(line4,graphX+0.5*graphWidth,lineY1+42)
    context.fillText(line5,graphX+0.5*graphWidth,lineY1+46)
    context.fillText(line6,graphX+0.5*graphWidth,lineY1+54)
    context.fillText(line7,graphX+0.5*graphWidth,lineY1+58)
    context.fillText(line8,graphX+0.5*graphWidth,lineY1+62)
    context.fillText(line9,graphX+0.5*graphWidth,lineY1+70)
    context.fillText(line10,graphX+0.5*graphWidth,lineY1+74)    
}
drawStage2Text = function(){
    context.fillStyle = "black"
    context.textBaseline = "top"
    context.textAlign = "center"
    const choice2String = `${(choice[2]*100).toFixed(0)}%`
    context.fillText(`Countdown: ${countdown}`,graphX+0.5*graphWidth,lineY2+14)
    context.fillStyle = blue
    context.fillText(`Choice 2: ${choice2String}`,graphX+0.5*graphWidth,lineY2+20)
    context.fillStyle = "black"
}
drawBarTotalCost = function(){
    context.fillStyle = black
    context.strokeStyle = "black"
    context.lineWidth = 0.25
    context.beginPath() 
    const barX = 30
    const baseY = -10
    const barWidth = 10
    const barHeight = 25
    context.moveTo(barX-0.5*barWidth,baseY-barHeight)
    context.lineTo(barX-0.5*barWidth,baseY)
    context.lineTo(barX+0.5*barWidth,baseY)
    context.lineTo(barX+0.5*barWidth,baseY-barHeight)
    context.stroke()
    context.fillStyle = red 
    const totalCost = cost[1]+cost[2]
    const barLevelTotal = barHeight*totalCost/10
    context.fillRect(barX-0.5*barWidth,baseY-barLevelTotal,barWidth,barLevelTotal)
    context.fillStyle = darkRed 
    const cost1 = cost[1]
    const barLevel1 = barHeight*cost1/10
    context.fillRect(barX-0.5*barWidth,baseY-barLevel1,barWidth,barLevel1)    
    const numTicks = 3
    const tickLength = 2
    const tickSpace = 1
    context.font = tickFont
    context.fillStyle = black
    context.textAlign = "center"
    context.textBaseline = "top"
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const y = (1-weight)*baseY+weight*(baseY-barHeight)
        const xRight1 = barX-0.5*barWidth
        const xLeft1 = barX-0.5*barWidth-tickLength
        context.beginPath()
        context.moveTo(xRight1,y)
        context.lineTo(xLeft1,y) 
        context.stroke()      
        const xRight2 = barX+0.5*barWidth+tickLength
        const xLeft2 = barX+0.5*barWidth
        context.beginPath()
        context.moveTo(xRight2,y)
        context.lineTo(xLeft2,y) 
        context.stroke()              
        const yCostLabel = `$${(10*weight).toFixed(2)}`
        context.textBaseline = "middle"
        context.textAlign = "left"
        context.fillText(yCostLabel,barX+0.5*barWidth+tickLength+tickSpace,y) 
        context.textAlign = "right"
        context.fillText(yCostLabel,barX-0.5*barWidth-tickLength-tickSpace,y)          
    })    
    context.fillStyle = darkRed  
    context.textAlign = "center"    
    const totalCostString = `Total Cost: $${totalCost.toFixed(0)}`
    context.fillText(totalCostString,barX,baseY+5)    
}
drawBarWinProb = function(){
    context.fillStyle = black
    context.strokeStyle = "black"
    context.lineWidth = 0.25
    context.beginPath() 
    const barX = 70
    const baseY = -10
    const barWidth = 10
    const barHeight = 25
    context.moveTo(barX-0.5*barWidth,baseY-barHeight)
    context.lineTo(barX-0.5*barWidth,baseY)
    context.lineTo(barX+0.5*barWidth,baseY)
    context.lineTo(barX+0.5*barWidth,baseY-barHeight)
    context.stroke()
    context.fillStyle = green
    const winProb = (score[1]+score[2])*100    
    const barLevelTotal = barHeight*winProb/100
    context.fillRect(barX-0.5*barWidth,baseY-barLevelTotal,barWidth,barLevelTotal)    
    context.fillStyle = darkGreen
    const score1 = score[1]*100    
    const barLevel1 = barHeight*score1/100
    context.fillRect(barX-0.5*barWidth,baseY-barLevel1,barWidth,barLevel1)       
    const numTicks = 3
    const tickLength = 2
    const tickSpace = 1
    context.font = tickFont
    context.fillStyle = black
    context.textAlign = "center"
    context.textBaseline = "top"
    arange(numTicks).forEach(i => {
        const weight = i/(numTicks-1)
        const y = (1-weight)*baseY+weight*(baseY-barHeight)
        const xRight1 = barX-0.5*barWidth
        const xLeft1 = barX-0.5*barWidth-tickLength
        context.beginPath()
        context.moveTo(xRight1,y)
        context.lineTo(xLeft1,y) 
        context.stroke()      
        const xRight2 = barX+0.5*barWidth+tickLength
        const xLeft2 = barX+0.5*barWidth
        context.beginPath()
        context.moveTo(xRight2,y)
        context.lineTo(xLeft2,y) 
        context.stroke()              
        const yWinProbLabel = `${100*weight}%`
        context.textBaseline = "middle"
        context.textAlign = "left"
        context.fillText(yWinProbLabel,barX+0.5*barWidth+tickLength+tickSpace,y) 
        context.textAlign = "right"
        context.fillText(yWinProbLabel,barX-0.5*barWidth-tickLength-tickSpace,y)          
    })    
    context.fillStyle = darkGreen  
    context.textAlign = "center"    
    const winProbString = `Win Prob: ${winProb.toFixed(0)}%`
    context.fillText(winProbString,barX,baseY+5)    
}
drawFeedback = function(){
    context.fillStyle = black
    context.textAlign = "center"
    context.strokeStyle = "black"
    context.font = feedbackFont
    context.lineWidth = 0.25
    const line1practice = "This is a practice period. In this period: "
    const line1real = "In this period: "
    const line1 = practiceComplete ? line1real : line1practice
    const line2 = `You have a ${((score[1]+score[2])*100).toFixed(0)}% chance of winning the $15 Starbucks gift card.`
    const line3 = `Your total cost is $${(cost[1]+cost[2]).toFixed(2)}.`
    context.fillText(line1,graphX+0.5*graphWidth,lineY1+24)
    context.fillText(line2,graphX+0.5*graphWidth,lineY1+34)
    context.fillText(line3,graphX+0.5*graphWidth,lineY1+42)
    const line4 = `Countdown: ${countdown}`
    context.fillText(line4,graphX+0.5*graphWidth,lineY1+60)
}
drawOutcome = function(){
    console.log("drawOutcome")
    context.fillStyle = black
    context.textAlign = "center"
    context.strokeStyle = "black"
    context.font = feedbackFont
    context.lineWidth = 0.25
    const line1 = "The experiment is complete"
    const line2 = `Period ${outcomePeriod} was randomly selected`
    const line3A = "You won the $15 Starbucks gift card"
    const line3B = "You did not win the $15 Starbucks gift card"
    const line3 = winPrize == 1 ? line3A : line3B
    const line4 = `You earned $${earnings.toFixed(2)}`
    const line5 = "Please wait while your payment is prepared"
    context.fillText(line1,graphX+0.5*graphWidth,lineY1+14)
    context.fillText(line2,graphX+0.5*graphWidth,lineY1+22)
    context.fillText(line3,graphX+0.5*graphWidth,lineY1+42)
    context.fillText(line4,graphX+0.5*graphWidth,lineY1+50)
    context.fillText(line5,graphX+0.5*graphWidth,lineY1+58)
}
draw()