var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
const numPeriods  = 1
const stage1Length = 10000
const stage2Length = 5
const outcomeLength = 5
const timestep    = 1
const endowment = 20
const maxCost1 = 5                           // marginal cost of the probability in period 1
const maxCost2High = 10                       // cost2 = sunk cost in period 2 (high cost shock)
const maxCost2Low = 5                        // calibrate the high costs!
const potMinProb1 = 0.5

// variables
var subjects    = {}
var numSubjects = 0
var state       = "startup"
var period      = 1
var stage       = 1
var countdown = stage1Length
var dataStream = {}
var dateString = ""

// TODO
// - create gfx without feedback stage
// - generate audio-file for instructions (at the end)
// ------------------------------------------------------------------------------
// - schedule (flight) time/funding (funding from VCU) for experiment at VCU or do it Harvard (MH)
// - test coding in lab @Harvard and VCU

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

formatTwo = function(x){
  var y = x.toFixed(0)
  if(y<10) y = "0" + y
  return y
}
getDateString = function(){
  const d = new Date()
  const year = d.getFullYear()
  const month = formatTwo(d.getMonth()+1)
  const day = formatTwo(d.getDate())
  const hours = formatTwo(d.getHours())
  const minutes = formatTwo(d.getMinutes())
  const seconds = formatTwo(d.getSeconds())  
  const dateString = year+"-"+month+"-"+day+"-"+hours+minutes+seconds
  return dateString
}

// within-period data
createDataFile = function(){
  dateString = getDateString()
  dataStream = fs.createWriteStream(`data/data-${dateString}.csv`)
  var csvString = "session,period,id,shock,prob1,prob2,cost1,cost2,endowment,"
  csvString += "minProb1,maxCost2\n"
  dataStream.write(csvString)
}
updateDataFile = function(){
  var csvString = ""
  Object.values(subjects).forEach(subject => {
    csvString += `${dateString},${period},${subject.id},${subject.hist[period].shock},`
    csvString += `${subject.hist[period].prob[1]},${subject.hist[period].prob[2]},`
    csvString += `${subject.hist[period].cost[1]},${subject.hist[period].cost[2]},${endowment},`
    csvString += `${subject.hist[period].minProb1},${subject.hist[period].maxCost2}\n`
  })
  dataStream.write(csvString)
}

// selected period data
writePaymentFile = function(){
  var csvString = "id,earnings,winPrize,outcomePeriod,winTicket1,winTicket2,totalCost,endowment\n"
  Object.values(subjects).forEach(subject => {
    csvString += `${subject.id},${subject.earnings},${subject.winPrize},${subject.outcomePeriod},` 
    csvString += `${subject.winTicket1},${subject.winTicket2},${subject.totalCost},${endowment}\n`
  })
  var logError = (ERR) => { if(ERR) console.log(ERR)}
  fs.writeFile(`data/payment-${dateString}.csv`,csvString,logError)
}

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
    if(state == "instructions") {
      state = "interface"
      console.log(`startExperiment`)
      createDataFile()
      setInterval(update, 1000*timestep) 
    }   
  })
  socket.on("managerUpdate", function(msg){
    var ids = Object.keys(subjects)
    var reply = {numSubjects, ids, state, countdown}
    socket.emit("serverUpdateManager",reply)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client
    if(subjects[msg.id]){
      if(period == msg.period && stage == msg.stage) {
        subjects[msg.id].hist[msg.period].choice[msg.stage] = msg.currentChoice
        subjects[msg.id].hist[msg.period].prob[msg.stage] = msg.currentProb      
        subjects[msg.id].hist[msg.period].cost[msg.stage] = msg.currentCost
      }  
      var reply = {
        period,
        state,
        stage,
        countdown, 
        endowment,      
        outcomePeriod: subjects[msg.id].outcomePeriod,
        outcomeRandom: subjects[msg.id].outcomeRandom,         
        winTicket1: subjects[msg.id].winTicket1,
        winTicket2: subjects[msg.id].winTicket2,
        winPrize: subjects[msg.id].winPrize,
        totalCost: subjects[msg.id].totalCost,
        earnings: subjects[msg.id].earnings,
        hist: subjects[msg.id].hist,
      } 
      socket.emit("serverUpdateClient",reply)
    } else {
      if(!subjects[msg.id]) createSubject(msg.id,socket)
      socket.emit("clientJoined",{id : msg.id})
    }
  })
  socket.on("joinGame", function(msg){
    if(!subjects[msg.id]) createSubject(msg.id,socket)
    socket.emit("clientJoined",{id : msg.id})
  })
})

// start the server
http.listen(3000,function(msg){ 
  var port = http.address().port
  console.log(`listening on port ${port}`)
})

shuffle = function(array){
  var shuffled = array
    .map(x => ({value: x, priority: Math.random()}))
    .sort((a,b) => a.priority-b.priority)
    .map(x => x.value)
  return shuffled
}
// subject append (socket-id characteristics are getting appended to list)
createSubject = function(id, socket){
  numSubjects += 1            // add 1 to the number of subjects
  subjects[id] = {            // add subject at a particular id
    id: id,
    socket: socket,
    choice1: 0,
    investment2: 0,
    outcomePeriod: 1,
    outcomeRandom: {1:0,2:0}, 
    winTicket1: 0,
    winTicket2: 0,
    winPrize: 0,
    totalCost: 0,
    earnings: 0,
    hist: {},
    maxCost1,                 // todo: pass to client
  }
  arange(numPeriods).forEach(i => {
    subjects[id].hist[i+1] = {
      choice: {1:0,2:0},
      prob: {1:0,2:0},      
      cost: {1:0,2:0},
      minProb: {1:choose([0,potMinProb1]),2:0},
      maxCost: {1:maxCost1,2:choose([maxCost2Low,maxCost2High])},
    }
  })
  console.log(`subject ${id} connected`)
}
update = function(){
  countdown = countdown - 1
  if(state == "interface" && stage == 1 && countdown <= 0) {
    countdown = stage2Length
    stage = 2
  }
  if(state == "interface" && stage == 2 && countdown <= 0) {
    countdown = outcomeLength
    state = "outcome"
    updateDataFile()
  }
  if(state == "outcome" && countdown <= 0) {
    countdown = outcomeLength
    state = "outcome"
    if(period>=numPeriods){
      state = "end" 
      arange(numSubjects).forEach(i => {
        const subject = subjects[i+1]
        subject.outcomePeriod = choose(arange(numPeriods))+1
        subject.outcomeRandom = {1:Math.random(),2:Math.random()}
        const selectedHist = subject.hist[subject.outcomePeriod]
        subject.winTicket1 = (subject.outcomeRandom[1] <= selectedHist.prob[1])*1
        subject.winTicket2 = (subject.outcomeRandom[2] <= selectedHist.prob[2])*1
        subject.winPrize = (subject.winTicket1 && subject.winTicket2)*1
        subject.totalCost = selectedHist.cost[1]+selectedHist.cost[2]
        subject.earnings = endowment - subject.totalCost
      })
      writePaymentFile()
      console.log("Session Complete")
    } else{
      period += 1
      state = "interface"
      stage = 1
      countdown = stage1Length
     } 
  }  
}
