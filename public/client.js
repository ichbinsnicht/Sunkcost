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
This is an experiment about individual decision making. If you pay attention to these instructions, you can earn a significant amount of money. If you have any questions, raise your hand and we will come to assist you. Your earnings will depend on the decisions you make during the experiment.<br><br>

At the beginning of the experiment, you will receive an endowment of $20.<br> 
At the end of the experiment, depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

This experiment will consist of several periods. Each period has two stages. <br><br>
<div style="padding-left: 5vh">
    During stage 1, you will choose a number from 0 to 0.5. At the end of stage 1, a number will be randomly selected from 0 to 0.5. Your stage 1 score will be either the number you chose or the randomly selected number. Both are equally likely. Your stage 1 cost will be your stage 1 score times $5.<br><br>

    At the beginning of stage 2, a cost multiplier will be randomly selected to be either 1 or 5 and revealed to you. During stage 2, you will choose another number from 0 to 0.5. Your stage 2 score will always be the number you chose. Your stage 2 cost will be your stage 2 score times the randomly selected cost multiplier.<br><br>

    At the end of the period, your probability of winning the $15 Starbucks gift card will be your stage 1 score plus your stage 2 score. Your total cost will be your stage 1 cost plus your stage 2 cost.<br><br>
</div>
At the end of the experiment one period will be randomly selected to be the critical period. You will receive the $15 Starbucks giftcard if you won it in the critical period. You will also receive your $20 endowment minus your total cost from the critical period.<br><br>`

var readyInstructionsString = baseInstructionsString + `The experiment is about to begin. One of the following periods will be randomly selected to determine your final earnings and whether you receive the $15 Starbucks gift card.`

// graphical parameters
const yMax = 10
const graphWidth = 70
const graphX = 0.5*(100-graphWidth)
const graphHeight = 50
const graphY = -22
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
        var practiceInstructionsString = baseInstructionsString + `First, you will participate in ${numPracticePeriods} practice periods. The practice periods will not affect your final earnings. They are just for practice.`      
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
            const xCostLabel = `${0.5*weight*multiplier[1]}`
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
        const xScoreLabel = `${weight*50}%`
        context.textBaseline = "top"
        context.fillText(xScoreLabel,x,yBottom+tickSpace)
    })
    context.font = labelFont
    if(stage==2){
        context.textBaseline = "top"
        context.fillStyle = "rgb(0,158,115)"
        context.textBaseline = "bottom"
        context.fillText("Cost 1",graphX+graphWidth*2*score[1],lineY-tickLength-tickSpace-2.5)
        context.textBaseline = "top"
        context.fillText("Score 1",graphX+graphWidth*2*score[1],lineY+tickLength+tickSpace+2.5)
        context.beginPath()
        context.arc(graphX+graphWidth*2*score[1],lineY,1.5,0,2*Math.PI)
        context.fill()
    }
    context.fillStyle = "rgb(0,114,178)"
    context.textBaseline = "top"
    const choice1Y = stage==1 ? 4 : 5.5
    context.fillText("Choice 1",graphX+graphWidth*2*choice[1],lineY+tickLength+tickSpace+choice1Y)
    context.beginPath()
    context.arc(graphX+graphWidth*2*choice[1],lineY,1,0,2*Math.PI)
    context.fill()
}
drawStage1Text = function(){
    context.fillStyle = "black"
    context.textBaseline = "top"
    context.textAlign = "center"
    const choice1String = `${(choice[1]*100).toFixed(0)}%`
    context.fillText(`Countdown: ${countdown}`,graphX+0.5*graphWidth,lineY+14)
    context.fillStyle = "rgb(0,114,178)"
    context.fillText(`Choice 1: ${choice1String}`,graphX+0.5*graphWidth,lineY+20)
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
    context.fillText(line1,graphX+0.5*graphWidth,lineY+30)
    context.fillText(line2,graphX+0.5*graphWidth,lineY+34)
    context.fillText(line3,graphX+0.5*graphWidth,lineY+38)
    context.fillText(line4,graphX+0.5*graphWidth,lineY+42)
    context.fillText(line5,graphX+0.5*graphWidth,lineY+46)
    context.fillText(line6,graphX+0.5*graphWidth,lineY+54)
    context.fillText(line7,graphX+0.5*graphWidth,lineY+58)
    context.fillText(line8,graphX+0.5*graphWidth,lineY+62)
    context.fillText(line9,graphX+0.5*graphWidth,lineY+70)
    context.fillText(line10,graphX+0.5*graphWidth,lineY+74)
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
    context.moveTo(graphX,graphY-graphHeight*score[1])
    context.lineTo(graphX+graphWidth,graphY-graphHeight*(score[1]+0.5))
    context.stroke()   
    context.fillStyle = "rgb(0,114,178)"
    context.beginPath()
    context.arc(graphX+graphWidth*2*score[2],graphY-graphHeight*(score[1]+score[2]),1.5,0,2*Math.PI)
    context.fill() 
    context.fillStyle = "rgb(0,0,0)"
    context.textAlign = "left"
    let string1 = `Score 1: ${(score[1]*100).toFixed(0)}%    `
    string1 += `Cost Multiplier: $${(multiplier[2]).toFixed(0)}`
    let string2 = `Score 2: ${(score[2]*100).toFixed(0)}%    `
    string2 += `Total Cost: $${(cost[1]+cost[2]).toFixed(2)}    `
    string2 += `Win Probability: ${((score[1]+score[2])*100).toFixed(0)}%`
    context.fillText(string1,graphX-0.1*graphWidth,lineY+graphHeight+30)
    context.fillText(string2,graphX-0.1*graphWidth,lineY+graphHeight+34)
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
        const xScoreLabel = `${weight*50}%`
        context.textBaseline = "top"
        context.textAlign = "center"
        context.fillText(xScoreLabel,x,yBottom+tickSpace) 
    })
    context.font = labelFont
    context.fillStyle = "rgb(0,158,115)"
    context.textBaseline = "top"
    context.fillText("Score 2",graphX+graphWidth*2*score[2],graphY+tickLength+tickSpace+2.5)
}
drawBottomLabelsLeftY = function(){
    const numTicks = 6
    const tickLength = 2
    const tickSpace = 1    
    baseline = score[1]*(5-multiplier[2])
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
        const yCostLabel = `$${(baseline+multiplier[2]*weight).toFixed(2)}`
        context.textBaseline = "middle"
        context.textAlign = "right"
        context.fillText(yCostLabel,graphX-tickLength-tickSpace,y) 
    })
    context.font = labelFont
    context.fillStyle = "rgb(0,158,115)"
    context.textBaseline = "middle"
    context.textAlign = "right"
    context.fillText("Total Cost",graphX-tickLength-tickSpace-10,graphY-graphHeight*(score[1]+score[2]))
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
        const yCostLabel = `${(weight*100).toFixed(0)}%`
        context.textBaseline = "middle"
        context.textAlign = "left"
        context.fillText(yCostLabel,graphX+graphWidth+tickLength+tickSpace,y) 
    })
    context.font = labelFont
    context.fillStyle = "rgb(0,158,115)"
    context.textBaseline = "middle"
    context.textAlign = "left"
    context.fillText("Win Probability",graphX+graphWidth+tickLength+tickSpace+6,graphY-graphHeight*(score[1]+score[2]))
}
drawFeedback = function(){
    context.fillStyle = "rgb(0,0,0)"
    context.textAlign = "center"
    context.strokeStyle = "black"
    context.font = feedbackFont
    context.lineWidth = 0.25
    const line1practice = "This is a practice period. In this period: "
    const line1real = "In this period: "
    const line1 = practiceComplete ? line1real : line1practice
    const line2 = `You have a ${((score[1]+score[2])*100).toFixed(0)}% chance of winning the $15 Starbucks gift card.`
    const line3 = `Your total cost is $${(cost[1]+cost[2]).toFixed(2)}.`
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
    const line3A = "You won the $15 Starbucks gift card"
    const line3B = "You did not win the $15 Starbucks gift card"
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