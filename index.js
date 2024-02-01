// fix earnings (final outcome)

// 1) server install SSL (Ionos) at server.js
// 2) make interface more online compatible
// 4) pilot new interface at LISH and at VCU
// 3) analysis: ML to improve SE (barrier: can ML predict out of sample better? if so, then move forward)

// TODO EXPERIMENT
// PUSH: adjust parameters to the true values
//
// Online-Info
// ------------------------------------------------------------------------------
// - Web deployment for piloting: https://sunkcost.onrender.com
// - FTP server: https://dash.infinityfree.com/accounts/if0_34633717
// - Unused: GDrive interfacing (https://www.section.io/engineering-education/google-drive-api-nodejs/)

import { io } from './server.js'
import fs from 'fs'
import seedrandom from 'seedrandom'

// parameters
const remoteVersion = false // false - lab, true - online
const numPracticePeriods = 1 // 5 practice periods
const numPeriods = 1 // 1 period, numPeriods > numPracticePeriods
const choice1Length = 5 // 15 secs choice1
const feedback1Length = 2 // 5 secs feedback1
const choice2Length = 5 // 15 secs choice2
const feedback2Length = 5 // 10 secs feedback2
const endowment = 5
const bonus = 10
const numberOfGuests = 100

// variables and guestList
const subjects = {}
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
const randomSeed = Math.random()
seedrandom('seed', { global: true })
const guestList = process.env.RENDER
  ? arange(numberOfGuests).map(i => {
    return Math.round(Math.random() * 10 ** 7).toString(36)
  })
  : arange(numberOfGuests).map(i => {
    return (i).toString()
  })
seedrandom(randomSeed, { global: true })

const linkList = guestList.map(guest => {
  return process.env.Render
    ? 'https://sunkcost.onrender.com/client' + guest
    : 'http://localhost:3000/client' + guest
})
if (remoteVersion) console.log('guestlist Links', linkList)

createDataFile()
createPaymentFile()

function arange (x) {
  return [...Array(x).keys()]
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
  csvString += 'choice1,choice2,score1,score2,endowment,totalScore,outcomeRandom,winPrize,totalCost,earnings'
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
  csvString += `${endowment},${subject.totalScore},${subject.outcomeRandom},`
  csvString += `${subject.winPrize},${subject.totalCost},${subject.earnings}`
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
  calculateOutcome()
  const csvString = `${subject.id},${subject.earnings.toFixed(2)},${subject.winPrize}\n`
  paymentStream.write(csvString)
}

io.on('connection', function (socket) {
  socket.emit('connected')
  if (remoteVersion) {
    socket.on('joinGame', function (msg) {
      console.log('joinGame', msg.id)
      if (!subjects[msg.id]) createSubject(msg.id, socket)
      socket.emit('clientJoined', { id: msg.id, hist: subjects[msg.id].hist, period: subjects[msg.id].period })
      console.log('Object.keys(subjects)', Object.keys(subjects))
      /*
      if(guestList.includes(msg.id)){
        console.log("joinGame",msg.id)
        if(!subjects[msg.id]) createSubject(msg.id,socket) // restart client: client joins but server has record
        socket.emit("clientJoined",{id: msg.id, hist: subjects[msg.id].hist, period: subjects[msg.id].period})
        console.log("Object.keys(subjects)", Object.keys(subjects))
      }
      */
    })
  } else {
    socket.on('joinGame', function (msg) {
      if (msg.id > 0) {
        console.log('joinGame', msg.id)
        if (!subjects[msg.id]) createSubject(msg.id, socket) // restart client: client joins but server has record
        socket.emit('clientJoined', { id: msg.id, hist: subjects[msg.id].hist, period: subjects[msg.id].period })
        console.log('Object.keys(subjects)', Object.keys(subjects))
      }
    })
  }
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
        countdown: subject.countdown,
        state: subject.state,
        earnings: subject.earnings,
        winPrize: subject.winPrize
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
        outcomePeriod: subject.outcomePeriod,
        outcomeRandom: subject.outcomeRandom,
        winPrize: subject.winPrize,
        totalCost: subject.totalCost,
        earnings: subject.earnings,
        hist: subject.hist
      }
      socket.emit('serverUpdateClient', reply)
    } else { // restart server: solving issue that client does not know that
      if (!subject && guestList.includes(msg.id) && remoteVersion) {
        createSubject(msg.id, socket)
        socket.emit('clientJoined', { id: msg.id })
      }
    }
  })
})

function setupHist (subject) {
  arange(numPracticePeriods).forEach(i => {
    subject.hist[i + 1] = {
      choice: { 1: 0, 2: 0 },
      score: { 1: 0, 2: 0 },
      forcedScore: { 1: Math.round(Math.random() * 0.5 * 100) / 100, 2: 0 },
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
    outcomePeriod: 1,
    outcomeRandom: 0,
    winPrize: 0,
    totalCost: 0,
    earnings: 0,
    hist: {}
  }
  subjects[id] = subject
  setupHist(subject)
  console.log(`subject ${id} connected`)
}
function calculateOutcome () {
  Object.values(subjects).forEach(subject => {
    const selectedHist = subject.hist[subject.period]
    subject.outcomeRandom = selectedHist.outcomeRandom
    subject.score1 = selectedHist.score[1]
    subject.score2 = selectedHist.score[2]
    subject.totalScore = selectedHist.score[1] + selectedHist.score[2]
    subject.winPrize = (subject.totalScore > selectedHist.outcomeRandom) * 1
    console.log('subject.hist', subject.hist)
    console.log('outcomeRandom, score[1],score[2]', selectedHist.outcomeRandom, selectedHist.score[1], selectedHist.score[2])
    subject.earnings = endowment + bonus * (1 - subject.winPrize)
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
      console.log('subject.period', subject.id, subject.period)
      console.log('subject.step', subject.id, subject.step)
    }
    if (subject.step === 'feedback1' && subject.countdown <= 0) { // end feedback1
      subject.countdown = choice2Length
      subject.step = 'choice2'
      console.log('subject.step', subject.id, subject.step)
    }
    if (subject.step === 'choice2' && subject.countdown <= 0) { // end choice2
      calculateOutcome()
      subject.countdown = feedback2Length
      subject.step = 'feedback2'
      console.log('subject.step', subject.id, subject.step)
    }
    if (subject.step === 'feedback2' && subject.countdown <= 0) { // end feedback2
      updateDataFile(subject) // change to subject-specific
      const maxPeriod = subject.experimentStarted ? numPeriods : numPracticePeriods
      if (subject.period >= maxPeriod) {
        if (subject.experimentStarted) {
          subject.step = 'end'
          console.log('subject.period', subject.id, subject.period)
          console.log('subject.step', subject.id, subject.step)
          updatePaymentFile(subject)
          subject.state = 'postSurvey'
          console.log('Experiment for Subject', subject.id, 'Complete')
        } else {
          console.log(`endPracticePeriods ${subject.id}`)
          subject.state = 'instructions'
          subject.practicePeriodsComplete = true
          subject.period = 1
          subject.step = 'choice1'
          subject.countdown = choice1Length
          console.log('subject.period', subject.id, subject.period)
          console.log('subject.step', subject.id, subject.step)
        }
      } else {
        subject.countdown = choice1Length
        subject.period += 1
        subject.step = 'choice1'
        console.log('subject.period', subject.id, subject.period)
        console.log('subject.step', subject.id, subject.step)
      }
    }
    subject.stage = subject.step === 'choice1' || subject.step === 'feedback1' ? 1 : 2
    console.log('Subject.step, Subject.stage', subject.step, subject.stage)
  }
}
function updateSubjects () {
  const subjectsArray = Object.values(subjects)
  subjectsArray.forEach(subject => update(subject))
}
setInterval(updateSubjects, 1000)
