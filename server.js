var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var subjects    = []
var numSubjects = 0                             // camel caps vs init caps
var treatment   = 1                             // object is data!! functions are called
var state       = "startup"                     // $ in R is like . in JS
var countdown   = 10
var timestep    = 1

var arange = x => [...Array(x).keys()]      

// TODO
// - transition stage from investment 1 to 2
// - record data
// - make payment screen and file
// - improve instructions
// - add additional interface information for investment 1 and 2 screen 
// --> tell subjects about possible current actions
// --> remind subjects about past actions

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
    assignTreatments()
    setInterval(update, 1000*timestep)
    if(state == "instructions") state = "investment1"
  })
  socket.on("managerUpdate", function(msg){
    var ids = subjects.map(subject => subject.id)
    ids = ids.filter(id => id>0)
    var msg = {numSubjects, ids, state, countdown}
    socket.emit("serverUpdateManager",msg)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client
    if(subjects[msg.id]){
      var reply = {state, countdown, treatment: subjects[msg.id].treatment}
      socket.emit("serverUpdateClient",reply)
    }
  })
  socket.on("joinGame", function(msg){
    if(!subjects[msg.id]) createSubject(msg.id,socket)
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
    treatment: 0,     
  }
  console.log(`subject ${id} connected`)
}
shuffle = function(array){
  var shuffled = array
    .map(x => ({value: x, priority: Math.random()}))
    .sort((a,b) => a.priority-b.priority)
    .map(x => x.value)
  return shuffled
}
assignTreatments = function(){
  var treatments = arange(numSubjects).map(i => i%2)
  treatment = shuffle(treatments)
  arange(numSubjects).forEach(i => subjects[i+1].treatment = treatment[i])
}
update = function(){
  countdown = countdown - 1
  if(state == "investment1"&&countdown <= 0) state = "investment2"
}
