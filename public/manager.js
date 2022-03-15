socket = io()                   //client IO

showInstructions = function() {
    console.log("Show instructions")
    msg = {}
    socket.emit("showInstructions",msg)
}