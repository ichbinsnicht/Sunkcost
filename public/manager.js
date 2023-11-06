var infoDiv = document.getElementById("infoDiv")
var subjectsTable = document.getElementById("subjectsTable")
var realEffortCheckbox = document.getElementById("realEffortCheckBox")
var preSurveyLock = document.getElementById("preSurveyLock")
var practiceLock = document.getElementById("practiceLock")
var audioMonetary = new Audio("instructionsMonetary.mp3")
var audioRealEffort = new Audio("instructionsRealEffort.mp3")
var audio = audioMonetary
socket = io()

var numSubjects = 0
var ids = []
var typingPracticeAllComplete = false
var practicePeriodsComplete = false
var experimentStarted = false
var message = {}
var subjects = []
var joined = false

document.onmousedown = function(){
    console.log(message)
}
socket.on("connected", function(msg){
    console.log(`connected`)
    setInterval(update,100)
})
socket.on("serverUpdateManager", function(msg){
    if(joined==false&& msg.online){
        preSurveyLock.checked = false
        practiceLock.checked = false
    }
    joined = true
    message = msg
    online = msg.online
    numSubjects = msg.numSubjects
    ids = msg.ids
    subjects = msg.subjectsData
    typingPracticeAllComplete = msg.typingPracticeAllComplete
    practicePeriodsComplete = msg.practicePeriodsComplete
    experimentStarted = msg.experimentStarted
    realEffort =  realEffortCheckbox.checked
    audio = realEffort ? audioRealEffort : audioMonetary
    var infoString = ""
    infoString += `${numSubjects} Subjects <br>`
    infoDiv.innerHTML = infoString
    var tableString = ""
    subjects.forEach(subject => tableString += `<tr>
        <td>${subject.id}</td>
        <td>${subject.state}</td>
        <td>${subject.countdown}</td>
        <td>${subject.earnings.toFixed(2)}</td>
        <td>${subject.winPrize}</td>
    </tr>`)
    subjectsTable.innerHTML = tableString
})
const showInstructions = function() {
    if (experimentStarted) alert("Experiment already started!")
    else {
        realEffortCheckbox.disabled = true
        console.log("Show instructions")
        msg = {}
        socket.emit("showInstructions",msg)
    }
}
const playAudio = function(){
    audio.play()
}
const stopAudio = function(){
    audio.pause()
    audio.currentTime = 0
}
const startPracticePeriods = function(){
    if (experimentStarted) alert("Experiment already started!") 
    else if (!typingPracticeAllComplete) alert("Complete typing Practice first!")
    else if (state=="instructions"){
        console.log("Start practice periods")
        socket.emit("startPracticePeriods")    
    } else {
        alert("Show instructions first!")
    }
}
const startExperiment = function(){
    if (experimentStarted) alert("Experiment already started!") 
    else if (state=="instructions" && practicePeriodsComplete){
        console.log("Start experiment")
        socket.emit("startExperiment")    
    } else {
        alert("Complete practice periods first!")
    }
}
const update = function(){
    const msg = { 
        realEffort: realEffortCheckbox.checked,
        preSurveyLock: preSurveyLock.checked,
        practiceLock: practiceLock.checked
    }
    socket.emit("managerUpdate",msg)
}
