/* global io, Audio */
const infoDiv = document.getElementById('infoDiv')
const subjectsTable = document.getElementById('subjectsTable')
const costForcingCheckBox = document.getElementById('costForcingCheckBox')
const playAudioButton = document.getElementById('playAudioButton')
const stopAudioButton = document.getElementById('stopAudioButton')
const preSurveyLock = document.getElementById('preSurveyLock')
const practiceLock = document.getElementById('practiceLock')
const audio = new Audio('instructionsMonetary.mp3')
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
  subjects.forEach(subject => {
    tableString += `<tr>
        <td>${subject.id}</td>
        <td>${subject.state}</td>
        <td>${subject.countdown}</td>
        <td>${subject.earnings.toFixed(2)}</td>
        <td>${subject.winPrize}</td>
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
    practiceLock: practiceLock.checked,
    costForcing: costForcingCheckBox.checked
  }
  socket.emit('managerUpdate', msg)
}
