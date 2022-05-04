var infoDiv = document.getElementById("infoDiv")
var subjectsTable = document.getElementById("subjectsTable")
var treatment1Radio = document.getElementById("treatment1Radio")
var treatment2Radio = document.getElementById("treatment2Radio")
socket = io()                   //client IO

var numSubjects = 0
var ids = []
var state = ""
var treatment = -1

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
    if(treatment<0){
        alert("Select Treatment!")
    }else{
        console.log("Show instructions")
        msg = {}
        socket.emit("showInstructions",msg)
    }
}
startExperiment = function(){
    console.log("Start experiment")
    socket.emit("startExperiment")
}
update = function(){
    if(treatment1Radio.checked) treatment = 0
    if(treatment2Radio.checked) treatment = 1
    msg = {treatment}                                   // empty object {}
    socket.emit("managerUpdate",msg)
}
