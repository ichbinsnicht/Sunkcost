var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var subjects    = []
var numSubjects = 0                             // camel caps vs init caps
var treatment   = 1                             // object is data!! functions are called
var state       = "startup"                     // $ in R is like . in JS

// todo next: 
// convert from mouse pos to canvas pos
// select investments on canvas and display actions from mouse to canvas

// server states vs client states, server states are global (forall clients) while client states may vary at the same time
// here: individual decision making, simultaenous, server states only
// state 0: startup
// state 1: instructions, done
// state 2: investment 1
// state 3: investment 2
// state 4: outcome and payment

// variable for current dir: __dirname, server only shares stuff from public
// express builts server based on public folder 
app.use(express.static(__dirname + "/public"))

// get has a call back (take function and pass it on to another program)
// req - request
// res - result
app.get("/",function(req,res){    // body of function
  res.sendFile(__dirname + "/public/client.html")
})
app.get("/client",function(req,res){
  res.sendFile(__dirname + "/public/client.html")
})
app.get("/manager",function(req,res){ 
  res.sendFile(__dirname + "/public/manager.html")
})

// socket - line of communication between client and server
// listener - similar to continuous if statement
// connection is an event
io.on("connection",function(socket){
  socket.emit("connected")
  socket.on("showInstructions", function(msg){  // callback function; msg from manager, change state on server
    console.log(`showInstructions`)
    if(state == "startup") state = "instructions"
  })
  socket.on("startExperiment", function(msg){
    console.log(`startExperiment`)
    if(state == "instructions") state = "investment1"
  })
  socket.on("managerUpdate", function(msg){
    var ids = subjects.map(subject => subject.id)
    ids = ids.filter(id => id>0)
    var msg = {numSubjects, ids, state}
    socket.emit("serverUpdateManager",msg)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client
    var msg = {state}
    socket.emit("serverUpdateClient",msg)
  })
  socket.on("joinGame", function(msg){
    createSubject(msg.id,socket)
    socket.emit("clientJoined",{id : msg.id})     // connected happens initialy, joins happens when id is entered
  })
})

// start the server
http.listen(3000,function(msg){ 
  var port = http.address().port
  console.log(`listening on port ${port}`)
})

// subject append (socket-id characteristics are getting appended to list)
createSubject = function(id, socket){
  numSubjects += 1            // add 1 to the number of subjects
  subjects[id] = {            // add subject at a particular id
    id: id,
    socket: socket,
    investment1: 0,
    investment2: 0,      
  }
  console.log(`subject ${id} connected`)
}