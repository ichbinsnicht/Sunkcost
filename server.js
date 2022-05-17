var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
var numPeriods  = 2
var stage1Length = 5
var stage2Length = 5
var feedback1Length = 1
var feedback2Length = 1
var timestep    = 1

// variables
var treatment   = -1
var subjects    = []
var numSubjects = 0
var state       = "startup"
var period      = 1
var countdown = stage1Length
var history = {}


// TODO
// - debug period 2 stage 1 counter duration
// - pass only current history from client to server
// - calculate outcome on server and pass to client
// - record data and file
// - improve instructions

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
    assignShocks()
    setInterval(update, 1000*timestep)
    if(state == "instructions") state = "investment1"
  })
  socket.on("managerUpdate", function(msg){
    treatment = msg.treatment
    var ids = subjects.map(subject => subject.id)
    ids = ids.filter(id => id>0)
    var reply = {numSubjects, ids, state, countdown}
    socket.emit("serverUpdateManager",reply)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client
    history[msg.id] = msg.history
    if(subjects[msg.id]){
      var reply = {
        treatment, 
        period,
        state, 
        countdown, 
        shock: subjects[msg.id].shock, 
        outcomePeriod: subjects[msg.id].outcomePeriod,
        outcomeRandom: subjects[msg.id].outcomeRandom,        
      }
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
    shock: 0, 
    outcomePeriod: 1,
    outcomeRandom: [0,0],      
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
assignShocks = function(){
  var shocks = arange(numSubjects).map(i => i%2)
  shocks = shuffle(shocks)
  arange(numSubjects).forEach(i => subjects[i+1].shock = shocks[i])
}
update = function(){
  countdown = countdown - 1
  if(state == "investment1"&&countdown <= 0) {
    state = "feedback1"
    countdown = feedback1Length
  }
  if(state == "feedback1"&&countdown <= 0) {
    state = "investment2"
    countdown = stage2Length
  }
  if(state == "investment2"&&countdown <= 0) {
    state = "feedback2"
    countdown = feedback2Length
  }  
  if(state == "feedback2"&&countdown <= 0) {
    if(period>=numPeriods){
      state = "outcome" 
      arange(numSubjects).forEach(i => {
        subjects[i+1].outcomePeriod = choose(arange(numPeriods))+1 
        subjects[i+1].outcomeRandom = [Math.random(),Math.random()]
      })
    } else{
      period += 1
      state = "investment1"
    } 
  }  
}
