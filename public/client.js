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
const blue = 'rgb(0,150,256)'
const darkBlue = 'rgb(0,50,256)'

// variables
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
let hist = {}
let message = {}
let mouseEvent = { x: 0, y: 0 }
let readyInstructionsString = ''
let practiceLock = true
let startPreSurveyTime = 0
let endPreSurveyTime = 0
let selectedPeriod = 0
let bonus = 0
let endowment = 0

const imageStyle = 'width:14.2vh;height:9vh;margin-left:auto;margin-right:auto;display:block;'
const imageHTML = `<img src="GiftCard.png" style="${imageStyle}"/>`

// probForcingInstructionsString
const instructionsString = `
This is an experiment about decision making. You will receive $5 in cash just for participating. Depending on the decisions you make, you will also receive either a $15 Starbucks gift card or a bonus of $10 in cash.

${imageHTML} <br>

This experiment will have two stages: stage 1 and stage 2. In each stage, you will make a choice which may affect your probability of receiving the $15 Starbucks gift card and your probability of receiving the $10 bonus.<br><br>

Stage 1:<br>
<ul>
    <li> You will choose a number between 0% and 50%, called Choice 1.</li>
    <li> Probability 1 will equal either Choice 1 or 0%. Both are equally likely.</li>
</ul>

Stage 2:<br>
<ul>
    <li> You will choose a number between 0% and 50%, called Choice 2.</li>
    <li> Probability 2 will equal Choice 2.</li>
</ul>

During each stage, you can adjust your choice by moving your mouse left or right. Your choice will be locked in at the end of the stage. At the end of the experiment, you will receive either the $10 bonus or the $15 Starbucks gift card. Your chance of receiving the $15 Starbucks gift card will be Probability 1 plus Probability 2. Your chance of receiving the $10 bonus will be 100% minus your chance of receiving the $15 Starbucks gift card.<br><br>`

const readyString = 'If you have any questions, raise your hand and we will come to assist you. Please click the button below to begin the experiment.'

const socket = io() // browser based socket
const arange = n => [...Array(n).keys()]

window.joinGame = function () {
  const id = idInput.value
  console.log('id', id)
  const msg = { id }
  socket.emit('joinGame', msg)
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
  id = msg.id
  period = msg.period
  hist = msg.hist
  choice = hist[period].choice
  score = hist[period].score
  forcedScore = hist[period].forcedScore
  console.log('hist', hist)
  setInterval(update, 10)
})
socket.on('serverUpdateClient', function (msg) {
  joined = true
  if (period !== msg.period || experimentStarted !== msg.experimentStarted) {
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
  readyInstructionsString = instructionsString + readyString
  message = msg
  selectedPeriod = msg.selectedPeriod
  step = msg.step
  stage = msg.stage
  practiceLock = msg.practiceLock
  experimentStarted = msg.experimentStarted
  practicePeriodsComplete = msg.practicePeriodsComplete
  numPracticePeriods = msg.numPracticePeriods
  countdown = msg.countdown
  period = msg.period
  hist = msg.hist
  bonus = msg.bonus
  endowment = msg.endowment
  forcedScore = msg.hist[msg.period].forcedScore
  forced = msg.hist[msg.period].forced
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
    currentScore: score[stage]
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
  const xTranslate = xScale / 2 - yScale / 2
  const yTranslate = yScale
  context.setTransform(yScale / 100, 0, 0, yScale / 100, xTranslate, yTranslate)
}
const updateChoice = function () {
  const x0 = canvas.width / 2 - canvas.height / 2
  const canvasRect = canvas.getBoundingClientRect()
  mouseX = (mouseEvent.pageX - x0 - canvasRect.left) * 100 / canvas.height
  const mouseGraphX = (mouseX - graphX) / graphWidth
  console.log('step', step)
  if (step === 'choice1' || step === 'choice2') {
    console.log('stage', stage)
    choice[stage] = Math.round(0.5 * Math.max(0, Math.min(1, mouseGraphX)) * 100) / 100
    score[stage] = forced[stage] * forcedScore[stage] + (1 - forced[stage]) * choice[stage]
  }
}
const drawInterface = function () {
  drawTop()
  drawCountdownText()
  if (step === 'feedback1') drawFeedback1Text()
  if (step === 'choice2' || step === 'feedback2') drawBottom()
  if (step !== 'choice1') {
    drawBarGiftCard()
    drawBarBonus()
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
    context.textBaseline = 'bottom'
    context.fillStyle = darkBlue
    const score1String = `${(score[1] * 100).toFixed(0)}%`
    context.fillText(`Probability 1: ${score1String}`, graphX + graphWidth * 2 * score[1], lineY1 - tickLength - 0.5)
    context.beginPath()
    context.arc(graphX + graphWidth * 2 * score[1], lineY1, 1.5, 0, 2 * Math.PI)
    context.fill()
  }
  context.textBaseline = 'bottom'
  context.fillStyle = black
  const choice1String = `${(choice[1] * 100).toFixed(0)}%`
  context.fillText(`Choice 1: ${choice1String}`, graphX + graphWidth * 2 * choice[1], lineY1 - tickLength - 4)
  context.beginPath()
  context.arc(graphX + graphWidth * 2 * choice[1], lineY1, 0.75, 0, 2 * Math.PI)
  context.fill()
  context.fillStyle = black
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
  context.textBaseline = 'bottom'
  context.fillStyle = blue
  const score2String = `${(score[2] * 100).toFixed(0)}%`
  context.fillText(`Probability 2: ${score2String}`, graphX + graphWidth * 2 * score[2], lineY2 - tickLength - 0.5)
  context.beginPath()
  context.fillStyle = blue
  context.arc(graphX + graphWidth * 2 * score[2], lineY2, 1.5, 0, 2 * Math.PI)
  context.fill()
  context.textBaseline = 'bottom'
  context.fillStyle = black
  const choice2String = `${(choice[2] * 100).toFixed(0)}%`
  context.fillText(`Choice 2: ${choice2String}`, graphX + graphWidth * 2 * choice[2], lineY2 - tickLength - 4)
  context.beginPath()
  context.arc(graphX + graphWidth * 2 * choice[2], lineY2, 0.75, 0, 2 * Math.PI)
  context.fill()
  context.textBaseline = 'top'
  const probGiftCard = (score[1] + score[2]) * 100
  const probMoney = (1 - score[1] - score[2]) * 100
  const giftCardChance = `You have a ${probGiftCard.toFixed(0)}% chance of winning the $15 gift card.`
  const moneyChance = `You have a ${probMoney.toFixed(0)}% chance of winning the $10 bonus.`
  context.fillStyle = darkBlue
  context.fillText(giftCardChance, graphX + 0.5 * graphWidth, lineY2 + 14)
  context.fillStyle = darkGreen
  context.fillText(moneyChance, graphX + 0.5 * graphWidth, lineY2 + 17.5)
  if (step === 'feedback2') {
    context.textAlign = 'center'
    context.fillStyle = 'darkRed'
    const lineComplete = 'Stage 2 Complete'
    context.fillText(lineComplete, graphX + 0.5 * graphWidth, lineY2 + 21)
  }
}
const drawCountdownText = function () {
  context.fillStyle = 'black'
  context.textBaseline = 'top'
  context.textAlign = 'center'
  context.fillText(`Countdown: ${countdown}`, graphX + 0.5 * graphWidth, lineY2 + 10)
}
const drawFeedback1Text = function () {
  context.textBaseline = 'top'
  context.textAlign = 'center'
  context.fillStyle = darkBlue
  const score1CompleteString = 'Probability 1 Implemented'
  context.fillText(score1CompleteString, graphX + 0.5 * graphWidth, lineY2 - 10)
}
const drawBarGiftCard = function () {
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
  context.fillStyle = blue
  const winProb = (score[1] + score[2]) * 100
  const barLevelTotal = barHeight * winProb / 100
  context.fillRect(barX - 0.5 * barWidth, baseY - barLevelTotal, barWidth, barLevelTotal)
  context.fillStyle = darkBlue
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
  context.fillStyle = darkBlue
  context.textAlign = 'center'
  const winProbString = `$15 Gift Card: ${winProb.toFixed(0)}%`
  context.fillText(winProbString, barX, baseY + 5)
}
const drawBarBonus = function () {
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
  const winProb = 100 - (score[1] + score[2]) * 100
  if (stage === 2) {
    const barLevelTotal = barHeight * winProb / 100
    context.fillRect(barX - 0.5 * barWidth, baseY - barLevelTotal, barWidth, barLevelTotal)
  }
  context.fillStyle = darkGreen
  const score1 = 50 - score[1] * 100
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
  const winProbString1 = `$10 Bonus: ${score1.toFixed(0)}%`
  const winProbString2 = `$10 Bonus: ${winProb.toFixed(0)}%`
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
  const selectedScore = hist[selectedPeriod].score[1] + hist[selectedPeriod].score[2]
  const outcomeRandom = hist[selectedPeriod].outcomeRandom
  const selectedWinPrize = selectedScore > outcomeRandom
  console.log('selectedScore, outcomeRandom', selectedScore, outcomeRandom)
  console.log('hist', hist)
  const line1 = 'The experiment is complete'
  const line2 = `Period ${selectedPeriod} was randomly selected.`
  const line3 = `You started with $${endowment.toFixed(0)}`
  const line4A = `You did not win the $${bonus.toFixed(0)} bonus`
  const line4B = `You won the $${bonus.toFixed(0)} bonus`
  const line4 = selectedWinPrize ? line4A : line4B
  const line5A = 'You won the $15 Starbucks gift card'
  const line5B = 'You did not win the $15 Starbucks gift card'
  const line5 = selectedWinPrize ? line5A : line5B
  const line6A = `You will receive $${endowment.toFixed(0)} and the $15 gift card`
  const line6B = `You will receive $${endowment.toFixed(0)} and the $${bonus.toFixed(0)} bonus`
  const line6 = selectedWinPrize ? line6A : line6B
  const line7 = 'Please wait while your payment is prepared'
  context.fillText(line1, 50, lineY1 + 4)
  context.fillText(line2, 50, lineY1 + 12)
  context.fillText(line3, 50, lineY1 + 30)
  context.fillText(line4, 50, lineY1 + 38)
  context.fillText(line5, 50, lineY1 + 46)
  context.fillText(line6, 50, lineY1 + 54)
  context.fillText(line7, 50, lineY1 + 70)
}
draw()
