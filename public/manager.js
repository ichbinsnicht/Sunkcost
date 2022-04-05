var infoDiv = document.getElementById("infoDiv")
var subjectsTable = document.getElementById("subjectsTable")
socket = io()                   //client IO

var numSubjects = 0
var ids = []
var state = ""

socket.on("connected", function(msg){
    console.log(`connected`)
    setInterval(update, 100) 
})
socket.on("serverUpdateManager", function(msg){
    numSubjects = msg.numSubjects
    ids = msg.ids
    state = msg.state
    infoString = ""
    infoString += `${numSubjects} Subjects <br>`
    infoString += `State: ${state} <br>` 
    infoDiv.innerHTML = infoString
    tableString = ""
    ids.forEach(id => tableString += `<tr><td>${id}</td></tr>`)
    subjectsTable.innerHTML = tableString
})


showInstructions = function() {
    console.log("Show instructions")
    msg = {}
    socket.emit("showInstructions",msg)
}
startExperiment = function(){
    console.log("Start experiment")
    socket.emit("startExperiment")
}
update = function(){
    msg = {}                                   // empty object {}
    socket.emit("managerUpdate",msg)
}
