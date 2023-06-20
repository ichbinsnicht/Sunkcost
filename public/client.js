var startupDiv = document.getElementById("startupDiv")
var instructionsDiv = document.getElementById("instructionsDiv")
var instructionsTextDiv = document.getElementById("instructionsTextDiv")
var idInput = document.getElementById("idInput")
var pleaseWaitDiv = document.getElementById("pleaseWaitDiv")
var preSurveyDiv = document.getElementById("preSurveyDiv")
var beginPracticePeriodsButton = document.getElementById("beginPracticePeriodsButton")
var beginExperimentButton = document.getElementById("beginExperimentButton")
var interfaceDiv = document.getElementById("interfaceDiv")
var typingDiv = document.getElementById("typingDiv")
var typingHeader = document.getElementById("typingHeader")
var targetTextbox = document.getElementById("targetTextbox")
var countdownDiv = document.getElementById("countdownDiv")
var outcomeDiv = document.getElementById("outcomeDiv")
var idInput = document.getElementById("idInput")
var canvas = document.getElementById("canvas")
var preSurveyForm = document.getElementById("preSurveyForm")
var context = canvas.getContext("2d")


socket = io()       // browser based socket
var arange = n => [...Array(n).keys()]

var monetaryInstructionsString = `
This is an experiment about individual decision making. If you pay attention to these instructions, you can earn a significant amount of money. Your earnings will depend on the decisions you make during the experiment.<br><br>

At the beginning of the experiment, you will start with an endowment of $15. At the end of the experiment, depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

This experiment has two stages. In each stage, you will make a choice, choice 1 in stage 1 and choice 2 in stage 2. In each stage, you will receive a score, score 1 in stage 1 and score 2 in stage 2. In each stage, you will pay a cost, cost 1 in stage 1 and cost 2 in stage 2. In each stage, you will have a multiplier, multiplier 1 in stage 1 and multiplier 2 in stage 2. In each stage, your cost will be your score times your multiplier. At the end of the experiment, your probability of winning the $15 Starbucks gift card will be score 1 plus score 2 and you will receive your $15 endowment minus cost 1 and cost 2.<br><br>

At the beginning of stage 1, multiplier 1 will be randomly selected to be either $1 or $10. Both are equally likely. During stage 1, you will select choice 1 from 0 to 0.5. At the end of stage 1, score 1 will be either choice 1 or a randomly selected number from 0 to 0.5. Both are equally likely. Cost 1 will be score 1 times multiplier 1.<br><br>

At the beginning of stage 2, multiplier 2 will be randomly selected to be either $1 or $10. Both are equally likely. During stage 2, you will select choice 2 from 0 to 0.5. Score 2 will always equal choice 2. Cost 2 will be score 2 times multiplier 2.<br><br>`

var realEffortInstructionsString = `
This is an experiment about individual decision making. If you pay attention to these instructions, you can earn a significant amount of money. Your earnings will depend on the decisions you make during the experiment.<br><br>

At the beginning of the experiment, you will start with an endowment of $15. At the end of the experiment, depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

This experiment has two stages. In each stage, you will make a choice, choice 1 in stage 1 and choice 2 in stage 2. In each stage, you will receive a score, score 1 in stage 1 and score 2 in stage 2. In each stage, you will required to complete a typing task, typing task 1 in stage 1 and typing task 2 in stage 2. In each stage, you will have a multiplier, multiplier 1 in stage 1 and multiplier 2 in stage 2. In each stage, the number of characters you have to type will be your score times your multiplier. At the end of the experiment, your probability of winning the $15 Starbucks gift card will be score 1 plus score 2 and you will receive your $15 endowment.<br><br>

At the beginning of stage 1, multiplier 1 will be randomly selected to be either 200 characters or 2,000 characters. Both are equally likely. During stage 1, you will select choice 1 from 0 to 0.5. At the end of stage 1, score 1 will be either choice 1 or a randomly selected number from 0 to 0.5. Both are equally likely. The number of characters you will type in task 1 will be score 1 times multiplier 1.<br><br>

At the beginning of stage 2, multiplier 2 will be randomly selected to be either 200 characters or 2,000 characters. Both are equally likely. During stage 2, you will select choice 2 from 0 to 0.5. Score 2 will always equal choice 2. The number of characters you will type in task 2 will be score 2 times multiplier 2.<br><br>`

var readyString = `The experiment is about to begin. If you have any questions, raise your hand and we will come to assist you.`


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
var realEffort = false
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
var step = 1
var stage = 1
var typingPracticeComplete = false
var experimentStarted = false
var practicePeriodsComplete = false
var experimentComplete = false
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
var typingTarget = ""
var typingProgress = 0
var completeText = ""
var incompleteText = ""
var showTyping = false
var instructionsString = ""
var readyInstructionsString = ""
var practiceLock = true

document.onmousedown = function(event){
    console.log("message",message)
}

document.onkeydown = function(event){
    console.log("showTyping",showTyping)
    const interactiveTyping = practicePeriodsComplete || !typingPracticeComplete
    if(joined && showTyping && interactiveTyping){
        targetLetter = incompleteText.slice(0,1)
        eventLetter = event.key.toUpperCase()
        console.log("eventLetter",eventLetter)
        console.log("targetLetter",targetLetter)
        if(targetLetter == eventLetter) typingProgress += 1
        console.log("typingProgress",typingProgress)
        if(typingProgress >= typingTarget.length && !typingPracticeComplete){
            var msg = {id}
            socket.emit("typingPracticeComplete",msg)
            console.log("typingPracticeComplete")
        }
    }
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
        cost = {1:0, 2:0}
        score = {1:0, 2:0}      
    }
    if(step != msg.step){
        console.log("msg.ExperimentStarted", msg.experimentStarted)
        console.log("msg.period",msg.period)
        console.log("msg.step",msg.step)  
    }
    realEffort = msg.realEffort
    instructionsString = realEffort ? realEffortInstructionsString : monetaryInstructionsString
    readyInstructionsString = instructionsString + readyString
    message = msg
    step = msg.step
    stage = msg.stage
    practiceLock = msg.practiceLock
    experimentStarted = msg.experimentStarted
    typingPracticeComplete = msg.typingPracticeComplete
    practicePeriodsComplete = msg.practicePeriodsComplete
    experimentComplete = msg.experimentComplete
    numPracticePeriods = msg.numPracticePeriods
    countdown = msg.countdown
    period = msg.period
    typingTarget = msg.typingTarget
    outcomePeriod = msg.outcomePeriod
    outcomeRandom = msg.outcomeRandom
    endowment = msg.endowment
    winPrize = msg.winPrize
    totalCost = msg.totalCost
    earnings = msg.earnings 
    hist = msg.hist
    multiplier = msg.hist[msg.period].multiplier
    forcedScore = msg.hist[msg.period].forcedScore
    forced = msg.hist[msg.period].forced
    if(state!=msg.state){
        var practiceInstructionsString = instructionsString + `First, you will participate in ${numPracticePeriods} practice periods. The practice periods will not affect your final earnings. They are just for practice. If you have any questions, raise your hand and we will come to assist you.`      
        instructionsTextDiv.innerHTML = practicePeriodsComplete ? readyInstructionsString : practiceInstructionsString
    }
    state = msg.state
})

const update = function(){
    if(step==1 || step==4) updateChoice()
    var msg = {
        id,
        period,
        step,
        stage,
        typingProgress,
        currentChoice: choice[stage],
        currentScore: score[stage],
        currentCost: cost[stage],
    }
    socket.emit("clientUpdate",msg)
    const showPracticePeriodsButton = !practiceLock && !practicePeriodsComplete
    beginPracticePeriodsButton.style.display = showPracticePeriodsButton ? "inline" : "none"
    beginExperimentButton.style.display = practicePeriodsComplete ? "inline" : "none"
    startupDiv.style.display = "none"
    instructionsDiv.style.display = "none"
    pleaseWaitDiv.style.display = "none"
    preSurveyDiv.style.display = "none"
    interfaceDiv.style.display = "none"
    outcomeDiv.style.display = "none" 
    typingDiv.style.display = "none"

    showTyping = state == "typingPractice"
    showTyping = showTyping || (step == 3 && state == "interface")
    showTyping = showTyping || (step == 5 && state == "interface")
    countdownDiv.innerHTML = ""
    if(joined&&showTyping){
        typingDiv.style.display = "block"
        typingHeader.innerHTML = "Please type the following text:"
        if(typingPracticeComplete&&!experimentStarted){
            typingHeader.innerHTML = `This is a practice period. <br>
                                      If you were in the real period, this is the text you would type.`
            countdownDiv.innerHTML = `Countdown: ${countdown}`
            console.log("typingProgress",typingProgress)
        }
        if(experimentStarted){
            typingHeader.innerHTML = "Please type the following text:"
            console.log("typingProgress",typingProgress)            
        }
        completeText = typingTarget.slice(0,typingProgress)
        incompleteText = typingTarget.slice(typingProgress,typingTarget.length)
        targetTextbox.innerHTML = ``
        targetTextbox.innerHTML += `<text style="color: blue">${completeText}</text>`
        targetTextbox.innerHTML += `<text style="color: red">${incompleteText}</text>`
    }   
    if(!joined){
        startupDiv.style.display = "block"
    }   
    if(joined&&state=="startup"){
        pleaseWaitDiv.style.display = "block"
    }   
    if(joined&&state=="preSurvey"){
        preSurveyDiv.style.display = "block"
    }
    if(joined&&state=="instructions"){
        instructionsDiv.style.display = "block"
    }
    if(joined&&state=="interface"&&!showTyping){
        typingProgress = 0
        interfaceDiv.style.display = "block"
    }
    if(joined&&experimentComplete){
        interfaceDiv.style.display = "none"
        outcomeDiv.style.display = "block"
        const line1 = "The experiment is complete"
        const line2 = `Period ${outcomePeriod} was randomly selected`
        const line3A = "You won the $15 Starbucks gift card"
        const line3B = "You did not win the $15 Starbucks gift card"
        const line3 = winPrize == 1 ? line3A : line3B
        const line4 = `You earned $${earnings.toFixed(2)}`
        const line5 = "Please wait while your payment is prepared"
        outcomeDiv.innerHTML = ""
        outcomeDiv.innerHTML += line1 + "<br><br>"
        outcomeDiv.innerHTML += line2 + "<br>"
        outcomeDiv.innerHTML += line3 + "<br>"
        outcomeDiv.innerHTML += line4 + "<br><br>"
        outcomeDiv.innerHTML += line5
    }
}
window.onmousemove = function(e){
    mouseEvent = e
}

window.onmousedown = function(e){
    mouseDown = true
    /* console.log("Choice",choice)
    console.log("Cost",cost)  
    console.log("Score", score)
    console.log("Forced",forced)  */
}
window.onmouseup = function(e){
    mouseDown = false
}
window.onkeydown = function(e){
    if(e.key=="Enter" && state =="startup") joinGame()
}
const joinGame = function(){
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
const submitPreSurvey = function(){
    const msg = {id}
    Array.from(preSurveyForm.elements).forEach(element => msg[element.id] = element.value)
    socket.emit("submitPreSurvey",msg)
    return false
}
const beginPracticePeriods = function(){
    const msg = {id}
    socket.emit("beginPracticePeriods",msg)
}
const beginExperiment = function(){
    const msg = {id}
    socket.emit("beginExperiment",msg)
}

const draw = function(){
    requestAnimationFrame(draw)
    setupCanvas()
    context.clearRect(0,0,canvas.width,canvas.height)   
    if(state=="interface") drawInterface() 
    if(experimentComplete) drawOutcome()
}
const setupCanvas = function(){
    xScale = 1*window.innerWidth
    yScale = 1*window.innerHeight                                  
    canvas.width = xScale
    canvas.height = yScale
    var xTranslate = xScale/2 - yScale/2 - .1*xScale
    var yTranslate = yScale                                                                          
    context.setTransform(yScale/100,0,0,yScale/100,xTranslate,yTranslate)
}
const updateChoice = function(){
    const x0 = canvas.width/2-canvas.height/2 - .1*canvas.width
    const y0 = canvas.height
    mouseX = (mouseEvent.offsetX-x0)*100/canvas.height
    mouseY = (y0 - mouseEvent.offsetY)*100/canvas.height
    const mouseGraphX = (mouseX - graphX)/graphWidth 
    if(step==1 || step==4){
        choice[stage] = 0.5*Math.max(0,Math.min(1,mouseGraphX))
        score[stage] = forced[stage]*forcedScore[stage] + (1-forced[stage])*choice[stage]
        cost[stage] = score[stage]*multiplier[stage]
    }
}
const drawInterface = function(){
    // step1 choice1
    // step2 typingTask1
    // step3 feedback1
    // step4 choice2
    // step5 typingTask2
    // step6 feedback2
    drawTop()
    if(step>=1) drawStep1Text()
    if(step==2) drawStep2Text()
    if(step>=4) drawBottom()
    if(step>=2) drawBarTotalCost()
    if(step>=2) drawBarWinProb() 
}
const drawTop = function(){
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
    if(step>=2){
        context.textBaseline = "top"
        context.fillStyle = darkGreen
        const score1String = `${(score[1]*100).toFixed(0)}%`
        context.fillText(`Score 1: ${score1String}`,graphX+graphWidth*2*score[1],lineY1+tickLength+tickSpace+2)
        context.beginPath()
        context.arc(graphX+graphWidth*2*score[1],lineY1,1.5,0,2*Math.PI)
        context.fill()
        context.fillStyle = darkRed
        context.textBaseline = "bottom"
        const cost1String = `$${cost[1].toFixed(2)}`
        context.fillText(`Cost 1: ${cost1String}`,graphX+graphWidth*2*score[1],lineY1-tickLength-tickSpace-2)
        context.textBaseline = "top"        
        context.beginPath()
        context.arc(graphX+graphWidth*2*score[1],lineY1,1.5,Math.PI,2*Math.PI)
        context.fill()        
    }
    context.fillStyle = blue
    context.textBaseline = "top"
    const choice1String = `${(choice[1]*100).toFixed(0)}%`
    context.fillText(`Choice 1: ${choice1String}`,graphX+graphWidth*2*choice[1],lineY1+tickLength+tickSpace+4.5)
    context.beginPath()
    context.arc(graphX+graphWidth*2*choice[1],lineY1,1,0,2*Math.PI)
    context.fill()
    context.fillStyle = "black"
    context.textBaseline = "middle"
    context.textAlign = "left"
    const multiplier1String = `Multiplier 1: $${(multiplier[1]).toFixed(0)}`
    context.fillText(multiplier1String,graphX+graphWidth+10,lineY1)    
}
const drawBottom = function(){
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
    const score2String = `${(score[2]*100).toFixed(0)}%` 
    context.fillText(`Score 2: ${score2String}`,graphX+graphWidth*2*score[2],lineY2+tickLength+tickSpace+2)
    context.beginPath()
    context.arc(graphX+graphWidth*2*score[2],lineY2,1.5,0,2*Math.PI)
    context.fill()
    context.fillStyle = red
    context.textBaseline = "bottom"
    const cost2String = `$${cost[2].toFixed(2)}`
    context.fillText(`Cost 2: ${cost2String}`,graphX+graphWidth*2*score[2],lineY2-tickLength-tickSpace-2)
    context.textBaseline = "top"
    context.beginPath()
    context.arc(graphX+graphWidth*2*score[2],lineY2,1.5,Math.PI,2*Math.PI)
    context.fill()
    context.fillStyle = blue
    context.textBaseline = "top"
    const choice2String = `${(choice[2]*100).toFixed(0)}%`
    context.fillText(`Choice 2: ${choice2String}`,graphX+graphWidth*2*choice[2],lineY2+tickLength+tickSpace+4.5)
    context.beginPath()
    context.arc(graphX+graphWidth*2*choice[2],lineY2,1,0,2*Math.PI)
    context.fill()
    context.fillStyle = "black"
    context.textBaseline = "middle"
    context.textAlign = "left"
    const multiplier2String = `Multiplier 2: $${(multiplier[2]).toFixed(0)}`
    context.fillText(multiplier2String,graphX+graphWidth+10,lineY2)    
    context.textBaseline = "top"
    if(step==6){
        var line1 = "This was a practice period"
        var line2 = `Chance of winning the $15 Starbucks gift card: ${((score[1]+score[2])*100).toFixed(0)}%`
        var line3 = `Your total cost would have been $${(cost[1]+cost[2]).toFixed(2)}`
        var line4 = `Your earnings would have been $${earnings.toFixed(2)}`
        if(experimentStarted){
            var line1 = ""
            var line2A = "You won the $15 Starbucks gift card"
            var line2B = "You did not win the $15 Starbucks gift card"
            var line2 = winPrize == 1 ? line2A : line2B
            var line3 = `Your total cost was $${(cost[1]+cost[2]).toFixed(2)}`
            var line4 = `Your earnings are $${earnings.toFixed(2)}`            
        }
        context.fillText(line1,graphX+graphWidth+10,lineY2+21) 
        context.fillText(line2,graphX+graphWidth+10,lineY2+29) 
        context.fillText(line3,graphX+graphWidth+10,lineY2+33) 
        context.fillText(line4,graphX+graphWidth+10,lineY2+37) 
        context.textAlign = "center"         
        context.fillStyle = "green"
        const lineComplete = `Stage 2 Complete`
        context.fillText(lineComplete,graphX+0.5*graphWidth,lineY2+21)       
    }
}
const drawStep1Text = function(){
    context.fillStyle = "black"
    context.textBaseline = "top"
    context.textAlign = "center"
    context.fillText(`Countdown: ${countdown}`,graphX+0.5*graphWidth,lineY2+18)
}
const drawStep2Text = function(){
    context.textBaseline = "top"
    context.textAlign = "center"
    context.fillStyle = darkRed
    const cost1CompleteString = `Cost 1 Implemented`
    context.fillText(cost1CompleteString,graphX+0.5*graphWidth,lineY2+5)
    context.fillStyle = darkGreen
    const score1CompleteString = `Score 1 Implemented`
    context.fillText(score1CompleteString,graphX+0.5*graphWidth,lineY2+10)
}
const drawBarTotalCost = function(){
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
    const costString1 = `Cost 1: $${totalCost.toFixed(0)}`
    const costString2 = `Total Cost: $${totalCost.toFixed(0)}`
    const costString = step<4 ? costString1 : costString2
    context.fillText(costString,barX,baseY+5)

}
const drawBarWinProb = function(){
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
    const winProbString1 = `Score 1: ${winProb.toFixed(0)}%`
    const winProbString2 = `Win Prob: ${winProb.toFixed(0)}%`    
    const winProbString = step<4 ? winProbString1 : winProbString2
    context.fillText(winProbString,barX,baseY+5)
}
const drawOutcome = function(){
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