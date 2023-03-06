var infoDiv = document.getElementById("infoDiv")
var subjectsTable = document.getElementById("subjectsTable")
var realEffortCheckbox = document.getElementById("realEffortCheckBox")
var startPracticeTypingButton = document.getElementById("startPracticeTypingButton")
var audio = new Audio("instructions.mp3")
socket = io()

var numSubjects = 0
var ids = []
var state = ""
var practiceTypingComplete = false
var practicePeriodsComplete = false
var experimentStarted = false
var message = {}
var countdown = 0

document.onmousedown = function(){
    console.log(message)
}
socket.on("connected", function(msg){
    console.log(`connected`)
    setInterval(update,100)
})
socket.on("serverUpdateManager", function(msg){
    message = msg
    numSubjects = msg.numSubjects
    ids = msg.ids
    state = msg.state
    practiceTypingComplete = msg.practiceTypingComplete
    practicePeriodsComplete = msg.practicePeriodsComplete
    experimentStarted = msg.experimentStarted
    countdown = msg.countdown
    if(state != "startup") {
        realEffort = msg.realEffort
        realEffortCheckbox.disabled = true
        realEffortCheckbox.checked = msg.realEffort
    }
    var infoString = ""
    infoString += `${numSubjects} Subjects <br>`
    infoString += `State: ${state} <br>`
    infoString += `Countdown: ${countdown} <br>`
    infoDiv.innerHTML = infoString
    var tableString = ""
    ids.forEach(id => tableString += `<tr><td>${id}</td></tr>`)
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
    if (experimentStarted) alert("Experiment already started!") 
    else if (state=="instructions") audio.play()
    else alert("Show instructions first!")
}
const stopAudio = function(){
    audio.pause()
    audio.currentTime = 0
}
const startPracticeTyping = function(){
    if (experimentStarted) alert("Experiment already started!")
    else if (practiceTypingComplete) alert("Typing Practice already complete!")
    else if (state=="instructions"){
        console.log("Start typing practice")
        socket.emit("startPracticeTyping")    
    } else {
        alert("Show instructions first!")
    }

}
const startPracticePeriods = function(){
    if (experimentStarted) alert("Experiment already started!") 
    else if (!practiceTypingComplete) alert("Complete typing Practice first!")
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
    const msg = { realEffort: realEffortCheckbox.checked }
    socket.emit("managerUpdate",msg)
}
