// getting Elements from HTML
var instructionsDiv = document.getElementById("instructionsDiv")
var instructionsTextDiv = document.getElementById("instructionsTextDiv")
var idInput = document.getElementById("idInput")
var loginDiv  = document.getElementById("loginDiv")
var pleaseWaitDiv = document.getElementById("pleaseWaitDiv")
var preSurveyDiv = document.getElementById("preSurveyDiv")
var preSurveyForm = document.getElementById("preSurveyForm")
var postSurveyDiv = document.getElementById("postSurveyDiv")
var postSurveyForm = document.getElementById("postSurveyForm")
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

var context = canvas.getContext("2d")

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
var cost2Text = 10
var startPreSurveyTime = 0
var endPreSurveyTime = 0

const imageStyle = `width:10%;height:10%;margin-left:auto;margin-right:auto;display:block;`
const imageHTML = `<img src="GiftCard.png" style="${imageStyle}"/>`

var monetaryInstructionsString = `
In this experiment, your earnings will depend on the decisions you make.<br><br>

You will start with $15. Depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

${imageHTML} <br>

This experiment has two stages: stage 1 and stage 2. In each stage, you will make a choice and receive a score and a multiplier, which will determine your earnings and your chance to win the $15 Starbucks gift card.<br><br>

Stage 1:<br>
<ul>
    <li> A random multiplier, called Multiplier 1, will be either $1 or $10. Both are equally likely.</li>
    <li> You will choose a number between 0% and 50%, called Choice 1.</li>
    <li> You can adjust Choice 1 by moving your mouse. Choice 1 will be locked in at the end of Stage 1.</li>
    <li> Move your mouse to the right to increase Choice 1. Move your mouse to the left to decrease Choice 1.</li>
    <li> Score 1 will be either Choice 1 or a randomly selected number from 0% to 50%. Both are equally likely.</li>
    <li> Cost 1 will be calculated by multiplying Score 1 with Multiplier 1.</li>
</ul>

Stage 2:<br>
<ul>
    <li> A random multiplier, called Multiplier 2, will be either $1 or $10. Both are equally likely.</li>
    <li> You will choose a number between 0% and 50%, called Choice 2.</li>
    <li> You can adjust Choice 2 by moving your mouse. Choice 2 will be locked in at the end of Stage 2.</li>
    <li> Move your mouse to the right to increase Choice 2. Move your mouse to the left to decrease Choice 2.</li>
    <li> Score 2 will always equal Choice 2.</li>
    <li> Cost 2 will be calculated by multiplying Score 2 with Multiplier 2.</li>
</ul>

Your earnings will be your initial $15 minus Cost 1 and Cost 2. Your probability of winning the $15 Starbucks gift card is the sum of Score 1 and Score 2. <br><br>`


var realEffortInstructionsString = `
In this experiment, your earnings will depend on the decisions you make.<br><br>

You will start with $15. Depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

${imageHTML} <br>

This experiment has two stages: stage 1 and stage 2. In each stage, you will make a choice and receive a score and a multiplier, which will determine your chance to win the $15 Starbucks gift card.<br><br>

Stage 1:<br>
<ul>
    <li> A random multiplier, called Multiplier 1, will be either 200 letters or 2,000 letters. Both are equally likely.</li>
    <li> You will choose a number between 0% and 50%, called Choice 1.</li>
    <li> You can adjust Choice 1 by moving your mouse. Choice 1 will be locked in at the end of Stage 1.</li>
    <li> Move your mouse to the right to increase Choice 1. Move your mouse to the left to decrease Choice 1.</li>
    <li> Score 1 will be either Choice 1 or a randomly selected number from 0% to 50%. Both are equally likely.</li>
    <li> Cost 1 will be calculated by multiplying Score 1 with Multiplier 1.</li>
    <li> You will type a number of letters equal to Cost 1.</li> 
</ul>

Stage 2:<br>
<ul>
    <li> A random multiplier, called Multiplier 2, will be either 200 letters or 2,000 letters. Both are equally likely.</li>
    <li> You will choose a number between 0% and 50%, called Choice 2.</li>
    <li> You can adjust Choice 2 by moving your mouse. Choice 2 will be locked in at the end of Stage 2.</li>
    <li> Move your mouse to the right to increase Choice 2. Move your mouse to the left to decrease Choice 2.</li>
    <li> Score 2 will always equal Choice 2.</li>
    <li> Cost 2 will be calculated by multiplying Score 2 with Multiplier 2.</li>
    <li> You will type a number of letters equal to Cost 2.</li>
</ul>

Your earnings will be your initial $15. Your probability of winning the $15 Starbucks gift card is the sum of Score 1 and Score 2. <br><br>`

var readyString = `If you have any questions, raise your hand and we will come to assist you. Please click the button below to begin the experiment.`

socket = io()       // browser based socket
var arange = n => [...Array(n).keys()]

joinGame()
function joinGame(){
    id = document.location.pathname.substring(7)
    if(id){
        console.log("id:",id)
        console.log(`joinGame`)
        msg = {id}
        socket.emit("joinGame",msg)
    }
}

document.onmousedown = function(event){
    console.log("message",message)
    console.log("id",id)
}

document.onkeydown = function(event){
    if(event.key=="Enter" && state =="startup") joinGame()
    console.log("showTyping",showTyping)
    const interactiveTyping = practicePeriodsComplete || !typingPracticeComplete
    if(joined && showTyping && interactiveTyping){
        targetLetter = incompleteText.slice(0,1)
        eventLetter = event.key.toLowerCase()
        console.log("eventLetter",eventLetter)
        console.log("targetLetter",targetLetter)
        if(targetLetter == eventLetter) typingProgress += 1
        console.log("typingProgress",typingProgress)
        if(typingProgress >= typingTarget.length && !typingPracticeComplete){
            const practiceTypingDuration = Date.now() - endPreSurveyTime
            var msg = {id,practiceTypingDuration}
            socket.emit("typingPracticeComplete",msg)
            console.log("typingPracticeComplete")
        }
    }
}

document.onmousemove = function(e){
    console.log("mouseEvent",e)
    mouseEvent = e
}

document.onmousedown = function(e){
    mouseDown = true
}
document.onmouseup = function(e){
    mouseDown = false
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
    if(period != msg.period || experimentStarted != msg.experimentStarted){
        cost = {1:0, 2:0}
        score = {1:0, 2:0}
    }
    if(state != "preSurvey" && msg.state == "preSurvey"){
        startPreSurveyTime = Date.now()
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
    cost2Text = msg.cost2Text
    if(state!=msg.state){
        var readyPracticeString = `First, you will participate in ${numPracticePeriods} practice periods. The practice periods will not affect your final earnings. They are just for practice. <br><br> If you have any questions, raise your hand and we will come to assist you. Please click the button below to begin the practice periods.`
        var practiceInstructionsString = instructionsString +  readyPracticeString     
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
    loginDiv.style.display = "none"
    instructionsDiv.style.display = "none"
    pleaseWaitDiv.style.display = "none"
    preSurveyDiv.style.display = "none"
    interfaceDiv.style.display = "none"
    outcomeDiv.style.display = "none" 
    typingDiv.style.display = "none"
    postSurveyDiv.style.display = "none"

    showTyping = state == "typingPractice"
    showTyping = showTyping || (step == 3 && state == "interface")
    showTyping = showTyping || (step == 5 && state == "interface")
    countdownDiv.innerHTML = ""
    if(joined&&showTyping){
        typingDiv.style.display = "block"
        typingHeader.innerHTML = `Please type the following ${typingTarget.length} letters on your keyboard:`
        if(typingPracticeComplete&&!experimentStarted){
            typingHeader.innerHTML = `This is a practice period. <br>
                                      If you were in the real period, these are the letters you would type.`
            countdownDiv.innerHTML = `Countdown: ${countdown}`
            console.log("typingProgress",typingProgress)
        }
        if(experimentStarted){
            typingHeader.innerHTML = `Please type the following ${typingTarget.length} letters on your keyboard:`
            console.log("typingProgress",typingProgress)            
        }
        completeText = typingTarget.slice(0,typingProgress)
        incompleteText = typingTarget.slice(typingProgress,typingTarget.length)
        targetTextbox.innerHTML = ``
        targetTextbox.innerHTML += `<text style="color: blue">${completeText}</text>`
        targetTextbox.innerHTML += `<text style="color: red">${incompleteText}</text>`
    }  
    if(!joined){
        loginDiv.style.display = "block"
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
    if(joined&&state=="postSurvey"){
        postSurveyDiv.style.display = "block"
    }
    if(joined&&state=="experimentComplete"){
        interfaceDiv.style.display = "none"
        outcomeDiv.style.display = "block"
        const line1 = "The experiment is complete"
        const line2 = `Period ${outcomePeriod} was randomly selected`
        const line3A = "You won the $15 Starbucks gift card"
        const line3B = "You did not win the $15 Starbucks gift card"
        const line3 = winPrize == 1 ? line3A : line3B
        const line4A = `You earned $${endowment.toFixed(2)}`
        const line4B = `You earned $${earnings.toFixed(2)}`
        const line4 = realEffort ? line4A : line4B
        const line5 = "Please wait while your payment is prepared"
        outcomeDiv.innerHTML = ""
        outcomeDiv.innerHTML += line1 + "<br><br>"
        outcomeDiv.innerHTML += line2 + "<br>"
        outcomeDiv.innerHTML += line3 + "<br>"
        outcomeDiv.innerHTML += line4 + "<br><br>"
        outcomeDiv.innerHTML += line5
    }
}


const submitPreSurvey = function(){
    endPreSurveyTime = Date.now()
    const msg = {
        id,
        preSurveyDuration: (endPreSurveyTime-startPreSurveyTime)/1000
    }
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
const submitPostSurvey = function(){
    const msg = {id}
    Array.from(postSurveyForm.elements).forEach(element => msg[element.id] = element.value)
    socket.emit("submitPostSurvey",msg)
    return false
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
    mouseX = (mouseEvent.pageX-x0)*100/canvas.height
    mouseY = (y0 - mouseEvent.pageY)*100/canvas.height
    const mouseGraphX = (mouseX - graphX)/graphWidth 
    if(step==1 || step==4){
        choice[stage] = Math.round(0.5*Math.max(0,Math.min(1,mouseGraphX))*100)/100
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
        // cost2Text
        const xCostLabelA = `${(0.5*weight*multiplier[1]*cost2Text).toFixed(0)}`
        const xCostLabelB = `$${(0.5*weight*multiplier[1]).toFixed(2)}`
        const xCostLabel = realEffort ? xCostLabelA : xCostLabelB
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
        const cost1StringA = `Cost 1: ${(cost[1]*cost2Text).toFixed(0)} Letters`
        const cost1StringB = `Cost 1: $${cost[1].toFixed(2)}`
        const cost1String = realEffort ? cost1StringA : cost1StringB
        context.fillText(`${cost1String}`,graphX+graphWidth*2*score[1],lineY1-tickLength-tickSpace-2)
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
    const multiplier1StringA = `Multiplier 1: ${(multiplier[1]*cost2Text).toFixed(0)} Letters`
    const multiplier1StringB = `Multiplier 1: $${(multiplier[1]).toFixed(0)}`
    const multiplier1String = realEffort ? multiplier1StringA : multiplier1StringB
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
        const xCostLabelA = `${(0.5*weight*multiplier[2]*cost2Text).toFixed(0)}`
        const xCostLabelB = `$${(0.5*weight*multiplier[2]).toFixed(2)}`
        const xCostLabel = realEffort ? xCostLabelA : xCostLabelB
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
    const cost2StringA = `Cost 2: ${(cost[2]*cost2Text).toFixed(0)} Letters`
    const cost2StringB = `Cost 2: $${cost[2].toFixed(2)}`
    const cost2String = realEffort ? cost2StringA : cost2StringB
    context.fillText(`${cost2String}`,graphX+graphWidth*2*score[2],lineY2-tickLength-tickSpace-2)
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
    const multiplier2StringA = `Multiplier 2: ${(multiplier[2]*cost2Text).toFixed(0)} Letters`
    const multiplier2StringB = `Multiplier 2: $${(multiplier[2]).toFixed(0)}`
    const multiplier2String = realEffort ? multiplier2StringA : multiplier2StringB
    context.fillText(multiplier2String,graphX+graphWidth+10,lineY2)    
    context.textBaseline = "top"
    if(step==6){
        var line1 = "This was a practice period"
        var line2 = `Chance of winning the $15 Starbucks gift card: ${((score[1]+score[2])*100).toFixed(0)}%`
        var line3A = `You would have had to type ${((cost[1]+cost[2])*cost2Text).toFixed(0)} letters.`
        var line3B = `Your total cost would have been $${(cost[1]+cost[2]).toFixed(2)}`
        var line3 = realEffort ? line3A : line3B
        var line4A = `Your endowment would have been $${endowment.toFixed(2)}`
        var line4B = `Your earnings would have been $${earnings.toFixed(2)}`
        var line4 = realEffort ? line4A : line4B
        if(experimentStarted){
            var line1 = ""
            var line2 = `Chance of winning the $15 Starbucks gift card: ${((score[1]+score[2])*100).toFixed(0)}%`
            var line3A = `You had to type ${((cost[1]+cost[2])*cost2Text).toFixed(0)} letters.`
            var line3B = `Your total cost was $${(cost[1]+cost[2]).toFixed(2)}`
            var line3 = realEffort ? line3A : line3B
            var line4A = `Your endowment is $${endowment.toFixed(2)}`
            var line4B = `Your earnings are $${earnings.toFixed(2)}`
            var line4 = realEffort ? line4A : line4B      
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
        const yCostLabelA = `${(10*weight*cost2Text).toFixed(0)}`
        const yCostLabelB = `$${(10*weight).toFixed(2)}` 
        const yCostLabel = realEffort ? yCostLabelA : yCostLabelB
        context.textBaseline = "middle"
        context.textAlign = "left"
        context.fillText(yCostLabel,barX+0.5*barWidth+tickLength+tickSpace,y) 
        context.textAlign = "right"
        context.fillText(yCostLabel,barX-0.5*barWidth-tickLength-tickSpace,y)          
    })    
    context.fillStyle = darkRed  
    context.textAlign = "center"
    const costString1A = `Cost 1: ${(totalCost*cost2Text).toFixed(0)} Letters`
    const costString1B = `Cost 1: $${totalCost.toFixed(0)}`
    const costString1 = realEffort ? costString1A : costString1B
    const costString2A = `Total Cost: ${(totalCost*cost2Text).toFixed(0)} Letters`
    const costString2B = `Total Cost: $${totalCost.toFixed(0)}`
    const costString2 = realEffort ? costString2A : costString2B
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
    const line4A = `You earned $${endowment.toFixed(2)}`
    const line4B = `You earned $${earnings.toFixed(2)}`
    const line4 = realEffort ? line4A : line4B 
    const line5 = "Please wait while your payment is prepared"
    context.fillText(line1,graphX+0.5*graphWidth,lineY1+14)
    context.fillText(line2,graphX+0.5*graphWidth,lineY1+22)
    context.fillText(line3,graphX+0.5*graphWidth,lineY1+42)
    context.fillText(line4,graphX+0.5*graphWidth,lineY1+50)
    context.fillText(line5,graphX+0.5*graphWidth,lineY1+58)
}
draw()