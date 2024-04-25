// TODO
// - Pilot: Prolific students
// ---> set up URL parameters from Prolific on the website
// ---> redirect subjects (automated completion code)
// ---> shareable link version for a gift card.
// - giftbit.com
// - https://app.giftbit.com/app/order/pay/bda63b3c49eb433995fccd4996eb54e2
// - ML analysis
//
// Alternative version:
// Fall 2024. Full Experiment.
// - Between Spring and Fall 2024: ML analysis to improve SE (barrier: can ML predict out of sample better? if so, then move forward)
// 1) create ML repository
// - Create Firm-Employee Field Experimental Website
//
// PUSH: adjust parameters to the true values
//
// Online-Info
// ------------------------------------------------------------------------------
// - Web deployment for piloting: https://sunkcost.onrender.com
// - FTP server: https://dash.infinityfree.com/accounts/if0_34633717
// - Unused: GDrive interfacing (https://www.section.io/engineering-education/google-drive-api-nodejs/)

import { io } from './server.js'
import fs from 'fs'

// parameters
const subjects = {}
const numPracticePeriods = 3 // 3 practice periods
const numPeriods = 1 // 1 period, numPeriods > numPracticePeriods (internal: 1)
const choice1Length = 15 // 15 secs choice1 (internal: 5)
const feedback1Length = 5 // 5 secs feedback1 (internal: 2)
const choice2Length = 15 // 15 secs choice2 (internal: 5)
const feedback2Length = 5 // 5 secs feedback2 (internal: 5)
const endowment = 5
const bonus = 10

// variables and guestList
let numSubjects = 0
let preSurveyLock = false
let practiceLock = false
let dataStream
let preSurveyStream
let postSurveyStream
let paymentStream
let preSurveyReady = false
let postSurveyReady = false
const dateString = getDateString()

createDataFile()
createPaymentFile()

function arange (a, b) {
  return [...Array(b - a + 1).keys()].map(i => i + a)
}

function choose (x) {
  return x[Math.floor(Math.random() * x.length)]
}

function formatTwo (x) {
  let y = x.toFixed(0)
  if (y < 10) y = '0' + y
  return y
}
function getDateString () {
  const d = new Date()
  const year = d.getFullYear()
  const month = formatTwo(d.getMonth() + 1)
  const day = formatTwo(d.getDate())
  const hours = formatTwo(d.getHours())
  const minutes = formatTwo(d.getMinutes())
  const seconds = formatTwo(d.getSeconds())
  const dateString = year + '-' + month + '-' + day + '-' + hours + minutes + seconds
  return dateString
}

function createPreSurveyFile (msg) {
  preSurveyStream = fs.createWriteStream(`data/${dateString}-preSurvey.csv`)
  let csvString = Object.keys(msg).join(',')
  csvString += '\n'
  preSurveyStream.write(csvString)
  preSurveyReady = true
}
function updatePreSurveyFile (msg) {
  if (!preSurveyReady) createPreSurveyFile(msg)
  let csvString = Object.values(msg).join(',')
  csvString += '\n'
  preSurveyStream.write(csvString)
}

function createDataFile () {
  dataStream = fs.createWriteStream(`data/${dateString}-data.csv`)
  let csvString = 'session,subjectStartTime,period,practice,id,forced1,forcedScore1,'
  csvString += 'choice1,choice2,score1,score2,endowment,bonus,totalScore,outcomeRandom,'
  csvString += 'winPrize,totalCost,earnings,selectedPeriod'
  csvString += '\n'
  dataStream.write(csvString)
}
function updateDataFile (subject) {
  let csvString = ''
  csvString += `${dateString},${subject.startTime},${subject.period},`
  csvString += `${1 - subject.practicePeriodsComplete},${subject.id},`
  csvString += `${subject.hist[subject.period].forced[1]},${subject.hist[subject.period].forcedScore[1]},`
  csvString += `${subject.hist[subject.period].choice[1]},${subject.hist[subject.period].choice[2]},`
  csvString += `${subject.hist[subject.period].score[1]},${subject.hist[subject.period].score[2]},`
  csvString += `${endowment},${bonus},${subject.totalScore},${subject.outcomeRandom},`
  csvString += `${subject.winPrize},${subject.totalCost},${subject.earnings},`
  csvString += `${subject.selectedPeriod}`
  csvString += '\n'
  dataStream.write(csvString)
}

function createPostSurveyFile (msg) {
  postSurveyStream = fs.createWriteStream(`data/${dateString}-postSurvey.csv`)
  let csvString = Object.keys(msg).join(',')
  csvString += '\n'
  postSurveyStream.write(csvString)
  postSurveyReady = true
}
function updatePostSurveyFile (msg) {
  if (!postSurveyReady) createPostSurveyFile(msg)
  let csvString = Object.values(msg).join(',')
  csvString += '\n'
  postSurveyStream.write(csvString)
}
function createPaymentFile () {
  paymentStream = fs.createWriteStream(`data/${dateString}-payment.csv`)
  const csvString = 'id,earnings,winPrize\n'
  paymentStream.write(csvString)
}
function updatePaymentFile (subject) {
  calculateSelectedOutcome()
  const csvString = `${subject.id},${subject.selectedEarnings.toFixed(0)},${subject.selectedWinPrize}\n`
  paymentStream.write(csvString)
}

io.on('connection', function (socket) {
  socket.emit('connected')
  socket.on('joinGame', function (msg) {
    console.log('joinGame', msg.id)
    if (!subjects[msg.id]) createSubject(msg.id, socket) // restart client: client joins but server has record
    socket.emit('clientJoined', { id: msg.id, hist: subjects[msg.id].hist, period: subjects[msg.id].period })
    console.log('Object.keys(subjects)', Object.keys(subjects))
  })
  socket.on('submitPreSurvey', function (msg) {
    console.log('submitPreSurvey')
    const subject = subjects[msg.id]
    updatePreSurveyFile(msg)
    if (subject.state === 'preSurvey') {
      subject.preSurveySubmitted = true
      subject.state = 'instructions'
    }
  })
  socket.on('beginPracticePeriods', function (msg) {
    const subject = subjects[msg.id]
    if (subject.state === 'instructions') {
      subject.state = 'interface'
      console.log('beginPracticePeriods', msg.id)
    }
  })

  socket.on('beginExperiment', function (msg) {
    const subject = subjects[msg.id]
    if (subject.practicePeriodsComplete && subject.state === 'instructions') {
      subject.experimentStarted = true
      setupHist(subject)
      subject.state = 'interface'
    }
  })
  socket.on('submitPostSurvey', function (msg) {
    console.log('submitPostSurvey')
    const subject = subjects[msg.id]
    updatePostSurveyFile(msg)
    if (subject.state === 'postSurvey') {
      subject.preSurveySubmitted = true
      subject.state = 'experimentComplete'
    }
  })
  socket.on('managerUpdate', function (msg) {
    preSurveyLock = msg.preSurveyLock
    practiceLock = msg.practiceLock
    const ids = Object.keys(subjects)
    const subjectsArray = Object.values(subjects)
    const subjectsData = subjectsArray.map(subject => {
      return {
        id: subject.id,
        step: subject.step,
        period: subject.period,
        countdown: subject.countdown,
        state: subject.state,
        selectedEarnings: subject.selectedEarnings,
        selectedWinPrize: subject.selectedWinPrize,
        practice: !subject.practicePeriodsComplete,
        selectedPeriod: subject.selectedPeriod
      }
    })
    const reply = {
      numSubjects,
      ids,
      subjectsData,
      online: process.env.RENDER
    }
    socket.emit('serverUpdateManager', reply)
  })
  socket.on('clientUpdate', function (msg) { // callback function; msg from client, send msg to client
    const subject = subjects[msg.id]
    if (subject) {
      const step = subject.step
      const histPeriod = subject.hist[msg.period]
      const choosing = step === 'choice1' || step === 'choice2'
      if (subject.period === msg.period && step === msg.step) {
        if (choosing) {
          histPeriod.choice[msg.stage] = msg.currentChoice
          histPeriod.score[msg.stage] = msg.currentScore
        }
      }
      const reply = {
        practiceLock,
        period: subject.period,
        state: subject.state,
        experimentStarted: subject.experimentStarted,
        practicePeriodsComplete: subject.practicePeriodsComplete,
        numPracticePeriods,
        endowment,
        step: subject.step,
        stage: subject.stage,
        countdown: subject.countdown,
        selectedPeriod: subject.selectedPeriod,
        outcomeRandom: subject.outcomeRandom,
        winPrize: subject.winPrize,
        totalCost: subject.totalCost,
        earnings: subject.earnings,
        hist: subject.hist,
        bonus
      }
      socket.emit('serverUpdateClient', reply)
    } else { // restart server: solving issue that client does not know that
      createSubject(msg.id, socket)
      socket.emit('clientJoined', { id: msg.id })
    }
  })
})

function setupHist (subject) {
  const nPeriods = Math.max(numPracticePeriods, numPeriods)
  arange(1, nPeriods).forEach(i => {
    subject.hist[i] = {
      choice: { 1: 0, 2: 0 },
      score: { 1: 0, 2: 0 },
      forcedScore: { 1: 0, 2: 0 },
      forced: { 1: 1 * (Math.random() > 0.5), 2: 0 },
      outcomeRandom: Math.random()
    }
  })
}

function createSubject (id, socket) {
  numSubjects += 1
  const subject = {
    id,
    socket,
    startTime: getDateString(),
    preSurveySubmitted: false,
    instructionsComplete: false,
    experimentStarted: false,
    practicePeriodsComplete: false,
    step: 'choice1',
    stage: 1,
    state: 'startup',
    period: 1,
    countdown: choice1Length,
    choice1: 0,
    investment2: 0,
    selectedPeriod: choose(arange(1, numPeriods)),
    outcomeRandom: 0,
    winPrize: 0,
    totalCost: 0,
    earnings: 0,
    selectedEarnings: 0,
    selectedWinPrize: 0,
    hist: {}
  }
  subjects[id] = subject
  setupHist(subject)
  console.log(`subject ${id} connected`)
}
function calculateOutcome () {
  Object.values(subjects).forEach(subject => {
    const currentHist = subject.hist[subject.period]
    subject.outcomeRandom = currentHist.outcomeRandom
    subject.score1 = currentHist.score[1]
    subject.score2 = currentHist.score[2]
    subject.totalScore = currentHist.score[1] + currentHist.score[2]
    subject.winPrize = (subject.totalScore > currentHist.outcomeRandom) * 1
    subject.earnings = endowment + bonus * (1 - subject.winPrize)
  })
}
function calculateSelectedOutcome () {
  Object.values(subjects).forEach(subject => {
    console.log('subject.selectedPeriod', subject.selectedPeriod)
    const selectedHist = subject.hist[subject.selectedPeriod]
    console.log('subject.hist', subject.hist)
    console.log('selectedHist', selectedHist)
    const outcomeRandom = selectedHist.outcomeRandom
    const score1 = selectedHist.score[1]
    const score2 = selectedHist.score[2]
    const totalScore = score1 + score2
    subject.selectedWinPrize = (totalScore > outcomeRandom) * 1
    subject.selectedEarnings = endowment + bonus * (1 - subject.selectedWinPrize)
    console.log('subject.selectedEarnings', subject.selectedEarnings)
    console.log('subject.selectedWinPrize', subject.selectedWinPrize)
  })
}
function update (subject) { // add presurvey
  if (subject.state === 'startup' & !preSurveyLock) {
    subject.state = 'preSurvey'
  }
  if (subject.state === 'preSurvey' & preSurveyLock) {
    subject.state = 'startup'
  }
  if (subject.state === 'interface') {
    subject.countdown = subject.countdown - 1
    if (subject.step === 'choice1' && subject.countdown <= 0) { // end choice1
      subject.countdown = feedback1Length
      subject.step = 'feedback1'
    }
    if (subject.step === 'feedback1' && subject.countdown <= 0) { // end feedback1
      subject.countdown = choice2Length
      subject.step = 'choice2'
    }
    if (subject.step === 'choice2' && subject.countdown <= 0) { // end choice2
      calculateOutcome()
      calculateSelectedOutcome()
      subject.countdown = feedback2Length
      subject.step = 'feedback2'
    }
    if (subject.step === 'feedback2' && subject.countdown <= 0) { // end feedback2
      updateDataFile(subject) // change to subject-specific
      const maxPeriod = subject.experimentStarted ? numPeriods : numPracticePeriods
      if (subject.period >= maxPeriod) {
        if (subject.experimentStarted) {
          subject.step = 'end'
          updatePaymentFile(subject)
          subject.state = 'postSurvey'
        } else {
          subject.state = 'instructions'
          subject.practicePeriodsComplete = true
          subject.period = 1
          subject.step = 'choice1'
          subject.countdown = choice1Length
        }
      } else {
        subject.countdown = choice1Length
        subject.period += 1
        subject.step = 'choice1'
      }
    }
    subject.stage = subject.step === 'choice1' || subject.step === 'feedback1' ? 1 : 2
  }
}
function updateSubjects () {
  const subjectsArray = Object.values(subjects)
  subjectsArray.forEach(subject => update(subject))
}
setInterval(updateSubjects, 1000)
