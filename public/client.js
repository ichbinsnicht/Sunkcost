// load client-side socket.io
import { io } from './socketIo/socket.io.esm.min.js'

// getting Elements from HTML
const instructionsDiv = document.getElementById('instructionsDiv')
const instructionsTextDiv = document.getElementById('instructionsTextDiv')
const idInput = document.getElementById('idInput')
const loginDiv = document.getElementById('loginDiv')
const pleaseWaitDiv = document.getElementById('pleaseWaitDiv')
const preSurveyDiv = document.getElementById('preSurveyDiv')
const preSurveyDivPage1 = document.getElementById('preSurveyDivPage1')
const preSurveyDivPage2 = document.getElementById('preSurveyDivPage2')
const preSurveyFormPage1 = document.getElementById('preSurveyFormPage1')
const preSurveyFormPage2 = document.getElementById('preSurveyFormPage2')
const postSurveyDiv = document.getElementById('postSurveyDiv')
const postSurveyDivPage1 = document.getElementById('postSurveyDivPage1')
const postSurveyDivPage2 = document.getElementById('postSurveyDivPage2')
const postSurveyFormPage1 = document.getElementById('postSurveyFormPage1')
const postSurveyFormPage2 = document.getElementById('postSurveyFormPage2')
const beginPracticePeriodsButton = document.getElementById('beginPracticePeriodsButton')
const beginExperimentButton = document.getElementById('beginExperimentButton')
const interfaceDiv = document.getElementById('interfaceDiv')
const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')

// graphical parameters
const remoteVersion = false
const graphWidth = 70
const graphX = 0.5 * (100 - graphWidth)
const lineY1 = -90
const lineY2 = -65
const tickFont = '1.5pt monospace'
const labelFont = '1.5pt monospace'
const feedbackFont = '3pt monospace'
const black = 'rgb(0,0,0)'
const green = 'rgb(0,200,0)'
const darkGreen = 'rgb(0,150,0)'
const red = 'rgb(256,0,0)'
const darkRed = 'rgb(150,0,0)'
const blue = 'rgb(0,50,256)'

// variables
let costForcing = false
let state = 'startup'
let id = 0
let joined = false
let xScale = 1
let yScale = 1
let mouseX = 50
let countdown = 60 // seconds
let period = 1
let step = 'choice1'
let stage = 1
let experimentStarted = false
let practicePeriodsComplete = false
let numPracticePeriods = 0
let choice = { 1: 0, 2: 0 }
let score = { 1: 0, 2: 0 }
let forcedScore = { 1: 0, 2: 0 }
let forced = { 1: 0, 2: 0 }
let cost = { 1: 0, 2: 0 }
let multiplier = { 1: 0, 2: 0 }
let endowment = 0
let hist = {}
let message = {}
let mouseEvent = { x: 0, y: 0 }
let earnings = 0
let winPrize = 0
let instructionsString = ''
let readyInstructionsString = ''
let practiceLock = true
let cost2Text = 10
let startPreSurveyTime = 0
let endPreSurveyTime = 0

const imageStyle = 'width:14.2vh;height:9vh;margin-left:auto;margin-right:auto;display:block;'
const imageHTML = `<img src="GiftCard.png" style="${imageStyle}"/>`

const costForcingInstructionsString = `
In this experiment you will start with $15. Depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

${imageHTML} <br>

This experiment has two stages: stage 1 and stage 2. In each stage, you will make a choice which will affect your earnings and your chance to win the $15 Starbucks gift card.<br><br>

Stage 1:<br>
<ul>
    <li> Choose a number between 0% and 50%, called Probability 1.</li>
    <li> You can adjust Probability 1 by moving your mouse left or right. Probability 1 will be locked in at the end of Stage 1.</li>
    <li> Charge 1 will equal Probability 1 multiplied by $10.
    <li> Cost 1 will equal either Charge 1 or a randomly selected number from $0 to $5. Both are equally likely.</li>
</ul>

Stage 2:<br>
<ul>
    <li> You will choose a number between 0% and 50%, called Probability 2.</li>
    <li> You can adjust Probability 2 by moving your mouse left or right. Probability 2 will be locked in at the end of Stage 2.</li>
    <li> Cost 2 will equal Probability 2 multiplied by $10.</li>
</ul>

Your earnings will be your initial $15 minus Cost 1 and Cost 2. <br><br>

Your chance of winning the $15 Starbucks gift card will be Probability 1 plus Probability 2. <br><br>`

const probForcingInstructionsString = `
In this experiment you will start with $15. Depending on the decisions you make, you may win a $15 Starbucks gift card. <br><br>

${imageHTML} <br>

This experiment has two stages: stage 1 and stage 2. In each stage, you will make a choice which will affect your earnings and your chance to win the $15 Starbucks gift card.<br><br>

Stage 1:<br>
<ul>
    <li> You will choose a number between 0% and 50%, called Score 1.</li>
    <li> You can adjust Score 1 by moving your mouse left or right. Score 1 will be locked in at the end of Stage 1.</li>
    <li> Cost 1 will be Score 1 multiplied by $5.
    <li> Probability 1 will be either Score 1 or a randomly selected number from 0% to 50%. Both are equally likely.</li>
</ul>

Stage 2:<br>
<ul>
    <li> You will choose a number between 0% and 50%, called Probability 2.</li>
    <li> You can adjust Probability 2 by moving your mouse left or right. Probability 2 will be locked in at the end of Stage 2.</li>
    <li> Cost 2 will equal Probability 2 multiplied by $10.</li>
</ul>

Your earnings will be your initial $15 minus Cost 1 and Cost 2. <br><br>

Your chance of winning the $15 Starbucks gift card will be Probability 1 plus Probability 2. <br><br>`

const readyString = 'If you have any questions, raise your hand and we will come to assist you. Please click the button below to begin the experiment.'

const socket = io() // browser based socket
const arange = n => [...Array(n).keys()]

window.joinGame = function () {
  if (remoteVersion) {
    const id = document.location.pathname.substring(7)
    if (id) {
      console.log('id:', id)
      console.log('joinGame')
      const msg = { id }
      socket.emit('joinGame', msg)
    }
  } else {
    const id = parseInt(idInput.value)
    console.log('id', id)
    const msg = { id }
    if (id > 0) socket.emit('joinGame', msg)
  }
}
window.submitPreSurveyPage1 = function () {
  console.log('submitPreSurveyPage1')
  window.nextPreSurveyPage()
  return false
}
window.submitPreSurveyPage2 = function () {
  console.log('submitPreSurveyPage2')
  endPreSurveyTime = Date.now()
  const msg = {
    id,
    preSurveyDuration: (endPreSurveyTime - startPreSurveyTime) / 1000
  }
  Array.from(preSurveyFormPage1.elements).forEach(element => {
    msg[element.id] = element.value
  })
  Array.from(preSurveyFormPage2.elements).forEach(element => {
    msg[element.id] = element.value
  })
  socket.emit('submitPreSurvey', msg)
  return false
}
window.submitPostSurveyPage1 = function () {
  console.log('submitPostSurveyPage1')
  window.nextPostSurveyPage()
  return false
}
window.submitPostSurveyPage2 = function () {
  console.log('submitPostSurveyPage2')
  const msg = { id }
  Array.from(postSurveyFormPage1.elements).forEach(element => {
    msg[element.id] = element.value
  })
  Array.from(postSurveyFormPage2.elements).forEach(element => {
    msg[element.id] = element.value
  })
  socket.emit('submitPostSurvey', msg)
  return false
}

window.beginPracticePeriods = function () {
  const msg = { id }
  beginPracticePeriodsButton.style.display = 'none'
  socket.emit('beginPracticePeriods', msg)
  console.log('beginPracticePeriods')
}
window.nextPreSurveyPage = function () {
  preSurveyDivPage1.style.display = 'none'
  preSurveyDivPage2.style.display = 'block'
}
window.nextPostSurveyPage = function () {
  postSurveyDivPage1.style.display = 'none'
  postSurveyDivPage2.style.display = 'block'
}
window.beginExperiment = function () {
  const msg = { id }
  socket.emit('beginExperiment', msg)
}

document.onmousedown = function (event) {
  console.log('message', message)
  console.log('id', id)
}

document.onkeydown = function (event) {
  if (event.key === 'Enter' && state === 'startup') window.joinGame()
}

document.onmousemove = function (e) {
  mouseEvent = e
}

socket.on('connected', function (msg) {
  console.log('connected')
})
socket.on('clientJoined', function (msg) {
  console.log(`client ${msg.id} joined`)
  joined = true
  if (!remoteVersion) id = msg.id
  period = msg.period
  hist = msg.hist
  choice = hist[period].choice
  score = hist[period].score
  cost = hist[period].cost
  forcedScore = hist[period].forcedScore
  multiplier = hist[period].multiplier
  console.log('hist', hist)
  setInterval(update, 10)
})
socket.on('serverUpdateClient', function (msg) {
  joined = true
  if (period !== msg.period || experimentStarted !== msg.experimentStarted) {
    cost = { 1: 0, 2: 0 }
    score = { 1: 0, 2: 0 }
  }
  if (state !== 'preSurvey' && msg.state === 'preSurvey') {
    startPreSurveyTime = Date.now()
  }
  if (step !== msg.step) {
    console.log('msg.ExperimentStarted', msg.experimentStarted)
    console.log('msg.period', msg.period)
    console.log('msg.step', msg.step)
  }
  costForcing = msg.costForcing
  instructionsString = costForcing ? costForcingInstructionsString : probForcingInstructionsString
  readyInstructionsString = instructionsString + readyString
  message = msg
  step = msg.step
  stage = msg.stage
  practiceLock = msg.practiceLock
  experimentStarted = msg.experimentStarted
  practicePeriodsComplete = msg.practicePeriodsComplete
  numPracticePeriods = msg.numPracticePeriods
  countdown = msg.countdown
  period = msg.period
  endowment = msg.endowment
  winPrize = msg.winPrize
  earnings = msg.earnings
  hist = msg.hist
  multiplier = msg.hist[msg.period].multiplier
  forcedScore = msg.hist[msg.period].forcedScore
  forced = msg.hist[msg.period].forced
  cost2Text = msg.cost2Text
  if (state !== msg.state) {
    const readyPracticeString = `First, you will participate in ${numPracticePeriods} practice periods. The practice periods will not affect your final earnings. They are just for practice. Afterwards, you will start the experiment. <br><br> If you have any questions, raise your hand and we will come to assist you. Please click the button below to begin the practice periods.`
    const practiceInstructionsString = instructionsString + readyPracticeString
    instructionsTextDiv.innerHTML = practicePeriodsComplete ? readyInstructionsString : practiceInstructionsString
  }
  state = msg.state
})

const update = function () {
  if (step === 'choice1' || step === 'choice2') updateChoice()
  const msg = {
    id,
    period,
    step,
    stage,
    currentChoice: choice[stage],
    currentScore: score[stage],
    currentCost: cost[stage]
  }
  socket.emit('clientUpdate', msg)
  beginPracticePeriodsButton.style.display = (!practiceLock && !practicePeriodsComplete) ? 'block' : 'none'
  beginExperimentButton.style.display = practicePeriodsComplete ? 'inline' : 'none'
  loginDiv.style.display = 'none'
  instructionsDiv.style.display = 'none'
  pleaseWaitDiv.style.display = 'none'
  preSurveyDiv.style.display = 'none'
  interfaceDiv.style.display = 'none'
  postSurveyDiv.style.display = 'none'

  if (joined && state === 'startup') {
    pleaseWaitDiv.style.display = 'block'
  }
  if (joined && state === 'preSurvey') {
    preSurveyDiv.style.display = 'block'
  }
  if (joined && state === 'instructions') {
    instructionsDiv.style.display = 'block'
  }
  if (joined && state === 'interface') {
    interfaceDiv.style.display = 'block'
  }
  if (joined && state === 'postSurvey') {
    postSurveyDiv.style.display = 'block'
  }
  if (joined && state === 'experimentComplete') {
    interfaceDiv.style.display = 'block'
  }
}

const draw = function () {
  window.requestAnimationFrame(draw)
  setupCanvas()
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (joined && state === 'interface') drawInterface()
  if (joined && state === 'experimentComplete') drawOutcome()
}
const setupCanvas = function () {
  xScale = 1 * window.innerWidth
  yScale = 1 * window.innerHeight
  canvas.width = xScale
  canvas.height = yScale
  const xTranslate = xScale / 2 - yScale / 2 - 0.1 * xScale
  const yTranslate = yScale
  context.setTransform(yScale / 100, 0, 0, yScale / 100, xTranslate, yTranslate)
}
const updateChoice = function () {
  const x0 = canvas.width / 2 - canvas.height / 2 - 0.1 * canvas.width
  const canvasRect = canvas.getBoundingClientRect()
  mouseX = (mouseEvent.pageX - x0 - canvasRect.left) * 100 / canvas.height
  const mouseGraphX = (mouseX - graphX) / graphWidth
  console.log('step', step)
  if (step === 'choice1' || step === 'choice2') {
    console.log('stage', stage)
    choice[stage] = Math.round(0.5 * Math.max(0, Math.min(1, mouseGraphX)) * 100) / 100
    score[stage] = forced[stage] * forcedScore[stage] + (1 - forced[stage]) * choice[stage]
    cost[stage] = score[stage] * multiplier[stage]
  }
}
const drawInterface = function () {
  drawTop()
  drawCountdownText()
  if (step === 'feedback1') drawFeedback1Text()
  if (step === 'choice2' || step === 'feedback2') drawBottom()
  if (step !== 'choice1') {
    drawBarTotalCost()
    drawBarWinProb()
  }
}
const drawTop = function () {
  context.fillStyle = black
  context.strokeStyle = 'black'
  context.lineWidth = 0.25
  context.beginPath()
  context.moveTo(graphX, lineY1)
  context.lineTo(graphX + graphWidth, lineY1)
  context.stroke()
  const numTicks = 6
  const tickLength = 2
  const tickSpace = 1
  context.font = tickFont
  context.textAlign = 'center'
  context.textBaseline = 'top'
  arange(numTicks).forEach(i => {
    const weight = i / (numTicks - 1)
    const x = (1 - weight) * graphX + weight * (graphX + graphWidth)
    const yTop = lineY1 - tickLength
    context.beginPath()
    context.moveTo(x, lineY1)
    context.lineTo(x, yTop)
    context.stroke()
    // cost2Text
    const xCostLabelA = `${(0.5 * weight * multiplier[1] * cost2Text).toFixed(0)}`
    const xCostLabelB = `$${(0.5 * weight * multiplier[1]).toFixed(2)}`
    const xCostLabel = costForcing ? xCostLabelA : xCostLabelB
    context.textBaseline = 'bottom'
    context.fillText(xCostLabel, x, yTop - tickSpace)
  })
  arange(numTicks).forEach(i => {
    const weight = i / (numTicks - 1)
    const x = (1 - weight) * graphX + weight * (graphX + graphWidth)
    const yBottom = lineY1 + tickLength
    context.beginPath()
    context.moveTo(x, lineY1)
    context.lineTo(x, yBottom)
    context.stroke()
    const xScoreLabel = `${weight * 50}%`
    context.textBaseline = 'top'
    context.fillText(xScoreLabel, x, yBottom + tickSpace)
  })
  context.font = labelFont
  if (step !== 'choice1') {
    context.textBaseline = 'top'
    context.fillStyle = darkGreen
    const score1String = `${(score[1] * 100).toFixed(0)}%`
    context.fillText(`Score 1: ${score1String}`, graphX + graphWidth * 2 * score[1], lineY1 + tickLength + tickSpace + 2)
    context.beginPath()
    context.arc(graphX + graphWidth * 2 * score[1], lineY1, 1.5, 0, 2 * Math.PI)
    context.fill()
    context.fillStyle = darkRed
    context.textBaseline = 'bottom'
    const cost1StringA = `Cost 1: ${(cost[1] * cost2Text).toFixed(0)} Letters`
    const cost1StringB = `Cost 1: $${cost[1].toFixed(2)}`
    const cost1String = costForcing ? cost1StringA : cost1StringB
    context.fillText(`${cost1String}`, graphX + graphWidth * 2 * score[1], lineY1 - tickLength - tickSpace - 2)
    context.textBaseline = 'top'
    context.beginPath()
    context.arc(graphX + graphWidth * 2 * score[1], lineY1, 1.5, Math.PI, 2 * Math.PI)
    context.fill()
  }
  context.fillStyle = blue
  context.textBaseline = 'top'
  const choice1String = `${(choice[1] * 100).toFixed(0)}%`
  context.fillText(`Choice 1: ${choice1String}`, graphX + graphWidth * 2 * choice[1], lineY1 + tickLength + tickSpace + 4.5)
  context.beginPath()
  context.arc(graphX + graphWidth * 2 * choice[1], lineY1, 1, 0, 2 * Math.PI)
  context.fill()
  context.fillStyle = 'black'
  context.textBaseline = 'middle'
  context.textAlign = 'left'
}
const drawBottom = function () {
  context.fillStyle = black
  context.strokeStyle = 'black'
  context.lineWidth = 0.25
  context.beginPath()
  context.moveTo(graphX, lineY2)
  context.lineTo(graphX + graphWidth, lineY2)
  context.stroke()
  const numTicks = 6
  const tickLength = 2
  const tickSpace = 1
  context.font = tickFont
  context.textAlign = 'center'
  context.textBaseline = 'top'
  arange(numTicks).forEach(i => {
    const weight = i / (numTicks - 1)
    const x = (1 - weight) * graphX + weight * (graphX + graphWidth)
    const yTop = lineY2 - tickLength
    context.beginPath()
    context.moveTo(x, lineY2)
    context.lineTo(x, yTop)
    context.stroke()
    const xCostLabelA = `${(0.5 * weight * multiplier[2] * cost2Text).toFixed(0)}`
    const xCostLabelB = `$${(0.5 * weight * multiplier[2]).toFixed(2)}`
    const xCostLabel = costForcing ? xCostLabelA : xCostLabelB
    context.textBaseline = 'bottom'
    context.fillText(xCostLabel, x, yTop - tickSpace)
  })
  arange(numTicks).forEach(i => {
    const weight = i / (numTicks - 1)
    const x = (1 - weight) * graphX + weight * (graphX + graphWidth)
    const yBottom = lineY2 + tickLength
    context.beginPath()
    context.moveTo(x, lineY2)
    context.lineTo(x, yBottom)
    context.stroke()
    const xScoreLabel = `${weight * 50}%`
    context.textBaseline = 'top'
    context.fillText(xScoreLabel, x, yBottom + tickSpace)
  })
  context.font = labelFont
  context.textBaseline = 'top'
  context.fillStyle = green
  const score2String = `${(score[2] * 100).toFixed(0)}%`
  context.fillText(`Score 2: ${score2String}`, graphX + graphWidth * 2 * score[2], lineY2 + tickLength + tickSpace + 2)
  context.beginPath()
  context.arc(graphX + graphWidth * 2 * score[2], lineY2, 1.5, 0, 2 * Math.PI)
  context.fill()
  context.fillStyle = red
  context.textBaseline = 'bottom'
  const cost2StringA = `Cost 2: ${(cost[2] * cost2Text).toFixed(0)} Letters`
  const cost2StringB = `Cost 2: $${cost[2].toFixed(2)}`
  const cost2String = costForcing ? cost2StringA : cost2StringB
  context.fillText(`${cost2String}`, graphX + graphWidth * 2 * score[2], lineY2 - tickLength - tickSpace - 2)
  context.textBaseline = 'top'
  context.beginPath()
  context.arc(graphX + graphWidth * 2 * score[2], lineY2, 1.5, Math.PI, 2 * Math.PI)
  context.fill()
  context.fillStyle = blue
  context.textBaseline = 'top'
  const choice2String = `${(choice[2] * 100).toFixed(0)}%`
  context.fillText(`Choice 2: ${choice2String}`, graphX + graphWidth * 2 * choice[2], lineY2 + tickLength + tickSpace + 4.5)
  context.beginPath()
  context.arc(graphX + graphWidth * 2 * choice[2], lineY2, 1, 0, 2 * Math.PI)
  context.fill()
  context.fillStyle = 'black'
  context.textBaseline = 'middle'
  context.textAlign = 'left'
  context.textBaseline = 'top'
  if (step === 'feedback2') {
    let line1 = 'This was a practice period'
    let line2 = `Your chance of winning the $15 Starbucks gift card: ${((score[1] + score[2]) * 100).toFixed(0)}%`
    let line3A = `You would have had to type a total of ${((cost[1] + cost[2]) * cost2Text).toFixed(0)} letters.`
    let line3B = `Your total cost would have been $${(cost[1] + cost[2]).toFixed(2)}`
    let line3 = costForcing ? line3A : line3B
    let line4A = `Your earnings would have been $${endowment.toFixed(2)}`
    let line4B = `Your earnings would have been $${earnings.toFixed(2)}`
    let line4 = costForcing ? line4A : line4B
    if (experimentStarted) {
      line1 = ''
      line2 = `Your chance of winning the $15 Starbucks gift card: ${((score[1] + score[2]) * 100).toFixed(0)}%`
      line3A = `You had to type a total of ${((cost[1] + cost[2]) * cost2Text).toFixed(0)} letters.`
      line3B = `Your total cost was $${(cost[1] + cost[2]).toFixed(2)}`
      line3 = costForcing ? line3A : line3B
      line4A = `Your earnings are $${endowment.toFixed(2)}`
      line4B = `Your earnings are $${earnings.toFixed(2)}`
      line4 = costForcing ? line4A : line4B
    }
    context.fillText(line1, graphX + graphWidth + 0, lineY2 + 21)
    context.fillText(line2, graphX + graphWidth + 0, lineY2 + 29)
    context.fillText(line3, graphX + graphWidth + 0, lineY2 + 33)
    context.fillText(line4, graphX + graphWidth + 0, lineY2 + 37)
    context.textAlign = 'center'
    context.fillStyle = 'green'
    const lineComplete = 'Stage 2 Complete'
    context.fillText(lineComplete, graphX + 0.5 * graphWidth, lineY2 + 21)
  }
}
const drawCountdownText = function () {
  context.fillStyle = 'black'
  context.textBaseline = 'top'
  context.textAlign = 'center'
  context.fillText(`Countdown: ${countdown}`, graphX + 0.5 * graphWidth, lineY2 + 18)
}
const drawFeedback1Text = function () {
  context.textBaseline = 'top'
  context.textAlign = 'center'
  context.fillStyle = darkRed
  const cost1CompleteString = 'Cost 1 Implemented'
  context.fillText(cost1CompleteString, graphX + 0.5 * graphWidth, lineY2 + 5)
  context.fillStyle = darkGreen
  const score1CompleteString = 'Score 1 Implemented'
  context.fillText(score1CompleteString, graphX + 0.5 * graphWidth, lineY2 + 10)
}
const drawBarTotalCost = function () {
  context.fillStyle = black
  context.strokeStyle = 'black'
  context.lineWidth = 0.25
  context.beginPath()
  const barX = 30
  const baseY = -15
  const barWidth = 10
  const barHeight = 20
  context.moveTo(barX - 0.5 * barWidth, baseY - barHeight)
  context.lineTo(barX - 0.5 * barWidth, baseY)
  context.lineTo(barX + 0.5 * barWidth, baseY)
  context.lineTo(barX + 0.5 * barWidth, baseY - barHeight)
  context.stroke()
  context.fillStyle = red
  const totalCost = cost[1] + cost[2]
  const barLevelTotal = barHeight * totalCost / 10
  context.fillRect(barX - 0.5 * barWidth, baseY - barLevelTotal, barWidth, barLevelTotal)
  context.fillStyle = darkRed
  const cost1 = cost[1]
  const barLevel1 = barHeight * cost1 / 10
  context.fillRect(barX - 0.5 * barWidth, baseY - barLevel1, barWidth, barLevel1)
  const numTicks = 3
  const tickLength = 2
  const tickSpace = 1
  context.font = tickFont
  context.fillStyle = black
  context.textAlign = 'center'
  context.textBaseline = 'top'
  arange(numTicks).forEach(i => {
    const weight = i / (numTicks - 1)
    const y = (1 - weight) * baseY + weight * (baseY - barHeight)
    const xRight1 = barX - 0.5 * barWidth
    const xLeft1 = barX - 0.5 * barWidth - tickLength
    context.beginPath()
    context.moveTo(xRight1, y)
    context.lineTo(xLeft1, y)
    context.stroke()
    const xRight2 = barX + 0.5 * barWidth + tickLength
    const xLeft2 = barX + 0.5 * barWidth
    context.beginPath()
    context.moveTo(xRight2, y)
    context.lineTo(xLeft2, y)
    context.stroke()
    const yCostLabelA = `${(10 * weight * cost2Text).toFixed(0)}`
    const yCostLabelB = `$${(10 * weight).toFixed(2)}`
    const yCostLabel = costForcing ? yCostLabelA : yCostLabelB
    context.textBaseline = 'middle'
    context.textAlign = 'left'
    context.fillText(yCostLabel, barX + 0.5 * barWidth + tickLength + tickSpace, y)
    context.textAlign = 'right'
    context.fillText(yCostLabel, barX - 0.5 * barWidth - tickLength - tickSpace, y)
  })
  context.fillStyle = darkRed
  context.textAlign = 'center'
  const costString1A = `Cost 1: ${(totalCost * cost2Text).toFixed(0)} Letters`
  const costString1B = `Cost 1: $${totalCost.toFixed(0)}`
  const costString1 = costForcing ? costString1A : costString1B
  const costString2A = `Total Cost: ${(totalCost * cost2Text).toFixed(0)} Letters`
  const costString2B = `Total Cost: $${totalCost.toFixed(0)}`
  const costString2 = costForcing ? costString2A : costString2B
  const costString = step === 'choice1' || step === 'feedback1' ? costString1 : costString2
  context.fillText(costString, barX, baseY + 5)
}
const drawBarWinProb = function () {
  context.fillStyle = black
  context.strokeStyle = 'black'
  context.lineWidth = 0.25
  context.beginPath()
  const barX = 70
  const baseY = -15
  const barWidth = 10
  const barHeight = 20
  context.moveTo(barX - 0.5 * barWidth, baseY - barHeight)
  context.lineTo(barX - 0.5 * barWidth, baseY)
  context.lineTo(barX + 0.5 * barWidth, baseY)
  context.lineTo(barX + 0.5 * barWidth, baseY - barHeight)
  context.stroke()
  context.fillStyle = green
  const winProb = (score[1] + score[2]) * 100
  const barLevelTotal = barHeight * winProb / 100
  context.fillRect(barX - 0.5 * barWidth, baseY - barLevelTotal, barWidth, barLevelTotal)
  context.fillStyle = darkGreen
  const score1 = score[1] * 100
  const barLevel1 = barHeight * score1 / 100
  context.fillRect(barX - 0.5 * barWidth, baseY - barLevel1, barWidth, barLevel1)
  const numTicks = 3
  const tickLength = 2
  const tickSpace = 1
  context.font = tickFont
  context.fillStyle = black
  context.textAlign = 'center'
  context.textBaseline = 'top'
  arange(numTicks).forEach(i => {
    const weight = i / (numTicks - 1)
    const y = (1 - weight) * baseY + weight * (baseY - barHeight)
    const xRight1 = barX - 0.5 * barWidth
    const xLeft1 = barX - 0.5 * barWidth - tickLength
    context.beginPath()
    context.moveTo(xRight1, y)
    context.lineTo(xLeft1, y)
    context.stroke()
    const xRight2 = barX + 0.5 * barWidth + tickLength
    const xLeft2 = barX + 0.5 * barWidth
    context.beginPath()
    context.moveTo(xRight2, y)
    context.lineTo(xLeft2, y)
    context.stroke()
    const yWinProbLabel = `${100 * weight}%`
    context.textBaseline = 'middle'
    context.textAlign = 'left'
    context.fillText(yWinProbLabel, barX + 0.5 * barWidth + tickLength + tickSpace, y)
    context.textAlign = 'right'
    context.fillText(yWinProbLabel, barX - 0.5 * barWidth - tickLength - tickSpace, y)
  })
  context.fillStyle = darkGreen
  context.textAlign = 'center'
  const winProbString1 = `Score 1: ${winProb.toFixed(0)}%`
  const winProbString2 = `Win Prob: ${winProb.toFixed(0)}%`
  const winProbString = step === 'choice1' || step === 'feedback1' ? winProbString1 : winProbString2
  context.fillText(winProbString, barX, baseY + 5)
}
const drawOutcome = function () {
  console.log('drawOutcome')
  context.fillStyle = black
  context.textAlign = 'center'
  context.strokeStyle = 'black'
  context.font = feedbackFont
  context.lineWidth = 0.25
  const line1 = 'The experiment is complete'
  // const line2 = `Period ${outcomePeriod} was randomly selected`
  const line3A = 'You won the $15 Starbucks gift card'
  const line3B = 'You did not win the $15 Starbucks gift card'
  const line3 = winPrize === 1 ? line3A : line3B
  const line4A = `You earned $${endowment.toFixed(2)}`
  const line4B = `You earned $${earnings.toFixed(2)}`
  const line4 = costForcing ? line4A : line4B
  const line5 = 'Please wait while your payment is prepared'
  context.fillText(line1, 60, lineY1 + 14)
  // context.fillText(line2,graphX+0.5*graphWidth,lineY1+22)
  context.fillText(line3, 60, lineY1 + 32)
  context.fillText(line4, 60, lineY1 + 40)
  context.fillText(line5, 60, lineY1 + 48)
}
draw()
