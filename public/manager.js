var infoDiv = document.getElementById("infoDiv")
var subjectsTable = document.getElementById("subjectsTable")
var realEffortCheckbox = document.getElementById("realEffortCheckBox")
var startRealEffortPracticeButton = document.getElementById("startRealEffortPracticeButton")
var audio = new Audio("instructions.mp3")
socket = io()

var numSubjects = 0
var ids = []
var state = ""
var practiceComplete = false
var experimentStarted = false

socket.on("connected", function(msg){
    console.log(`connected`)
    setInterval(update,100)
})
socket.on("serverUpdateManager", function(msg){
    numSubjects = msg.numSubjects
    ids = msg.ids
    state = msg.state
    practiceComplete = msg.practiceComplete
    experimentStarted = msg.experimentStarted
    startRealEffortPracticeButton.hidden = !msg.realEffort
    if(state != "startup") {
        realEffort = msg.realEffort
        realEffortCheckbox.disabled = true
        realEffortCheckbox.checked = msg.realEffort
    }
    var infoString = ""
    infoString += `${numSubjects} Subjects <br>`
    infoString += `State: ${state} <br>` 
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
    if (state=="instructions") {
         audio.pause()
        audio.currentTime = 0
    } else {
        alert("Show instructions first!")
    }
}
const startPracticePeriods = function(){
    if (experimentStarted) alert("Experiment already started!") 
    else if (state=="instructions"){
        console.log("Start practice")
        socket.emit("startPractice")    
    } else {
        alert("Show instructions first!")
    }
}
const startExperiment = function(){
    if (experimentStarted) alert("Experiment already started!") 
    else if (state=="instructions" && practiceComplete){
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
