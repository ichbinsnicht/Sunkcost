/* global io, Audio */
const infoDiv = document.getElementById('infoDiv')
const subjectsTable = document.getElementById('subjectsTable')
const playAudioButton = document.getElementById('playAudioButton')
const stopAudioButton = document.getElementById('stopAudioButton')
const preSurveyLock = document.getElementById('preSurveyLock')
const practiceLock = document.getElementById('practiceLock')
const audio = new Audio('instructions.mp3')
const socket = io()

let numSubjects = 0
let message = {}
let subjects = []
let joined = false

document.onmousedown = function () {
  console.log(message)
}
socket.on('connected', function (msg) {
  console.log('connected')
  setInterval(update, 100)
})
socket.on('serverUpdateManager', function (msg) {
  if (joined === false && msg.online) {
    preSurveyLock.checked = false
    practiceLock.checked = false
  }
  joined = true
  message = msg
  numSubjects = msg.numSubjects
  subjects = msg.subjectsData

  let infoString = ''
  infoString += `${numSubjects} Subjects <br>`
  infoDiv.innerHTML = infoString
  let tableString = ''
  tableString += `<tr>
    <td>ID</td>
    <td>State</td>
    <td>Practice</td>
    <td>Period</td>
    <td>Step</td>
    <td>Countdown</td>
    <td>Selected Period</td>
    <td>Earnings</td>
    <td>WinPrize</td>
  </tr>`
  subjects.forEach(subject => {
    const earnings = subject.selectedEarnings.toFixed(0)
    const winPrize = subject.selectedWinPrize === 1
    const experimentComplete = subject.state === 'experimentComplete' || subject.state === 'postSurvey'
    const payReady = (subject.period > subject.selectedPeriod || experimentComplete) && !subject.practice
    const earningsMessage = payReady ? earnings : 'NA'
    const winPrizeMessage = payReady ? winPrize : 'NA'
    tableString += `<tr>
        <td>${subject.id}</td>
        <td>${subject.state}</td>
        <td>${subject.practice}</td>
        <td>${subject.period}</td>
        <td>${subject.step}</td>
        <td>${subject.countdown}</td>
        <td>${subject.selectedPeriod}</td>
        <td>${earningsMessage}</td>
        <td>${winPrizeMessage}</td>
    </tr>`
  })
  subjectsTable.innerHTML = tableString
})

playAudioButton.onclick = function () {
  audio.play()
}

stopAudioButton.onclick = function () {
  audio.pause()
  audio.currentTime = 0
}

const update = function () {
  const msg = {
    preSurveyLock: preSurveyLock.checked,
    practiceLock: practiceLock.checked
  }
  socket.emit('managerUpdate', msg)
}
