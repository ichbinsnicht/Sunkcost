var subjectCountDiv = document.getElementById("subjectCountDiv")
socket = io()                   //client IO

var numSubjects = 0

socket.on("connected", function(msg){
    console.log(`connected`)
    setInterval(update, 100) 
})
socket.on("serverUpdateManager", function(msg){
    numSubjects = msg.numSubjects 
    subjectCountDiv.innerHTML = `${numSubjects} Subjects`
})



showInstructions = function() {
    console.log("Show instructions")
    msg = {}
    socket.emit("showInstructions",msg)
}
update = function(){
    msg = {}                                   // empty object {}
    socket.emit("managerUpdate",msg)
}
