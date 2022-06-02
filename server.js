var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
var numPeriods  = 20
var stage1Length = 5
var stage2Length = 5
var feedback1Length = 5
var feedback2Length = 5
var timestep    = 1
var endowment = 20

// variables
var treatment   = -1
var subjects    = {}
var numSubjects = 0
var state       = "startup"
var period      = 1
var stage       = 1
var countdown = stage1Length
var dataStream = {}
var dateString = ""

// TODO
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
  var csvString = "session,treatment,period,id,shock,prob1,prob2,cost1,cost2,endowment,"
  csvString += "minProb1,maxCost2\n"
  dataStream.write(csvString)
}
updateDataFile = function(){
  var csvString = ""
  Object.values(subjects).forEach(subject => {
    csvString += `${dateString},${treatment},${period},${subject.id},${subject.hist[period].shock},`
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
    console.log(`startExperiment`)
    createDataFile()
    assignShocks()
    setInterval(update, 1000*timestep)
    if(state == "instructions") state = "investment1"
  })
  socket.on("managerUpdate", function(msg){
    treatment = msg.treatment
    var ids = Object.keys(subjects)
    var reply = {numSubjects, ids, state, countdown}
    socket.emit("serverUpdateManager",reply)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client
    if(period == msg.period && stage == msg.stage) {
      subjects[msg.id].hist[msg.period].cost[msg.stage] = msg.currentCost
      subjects[msg.id].hist[msg.period].prob[msg.stage] = msg.currentProb
      subjects[msg.id].hist[msg.period].maxCost2 = msg.maxCost2
      subjects[msg.id].hist[msg.period].minProb1 = msg.minProb1
    }
    if(subjects[msg.id]){
      var reply = {
        treatment, 
        period,
        state,
        stage,
        countdown, 
        endowment,
        winTicket1: subjects[msg.id].winTicket1,
        winTicket2: subjects[msg.id].winTicket2,
        winPrize: subjects[msg.id].winPrize,
        totalCost: subjects[msg.id].totalCost,
        earnings: subjects[msg.id].earnings,
        shock: subjects[msg.id].hist[period].shock, 
        outcomePeriod: subjects[msg.id].outcomePeriod,
        outcomeRandom: subjects[msg.id].outcomeRandom, 
        hist: subjects[msg.id].hist,   
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
    outcomePeriod: 1,
    outcomeRandom: {1:0,2:0}, 
    winTicket1: 0,
    winTicket2: 0,
    winPrize: 0,
    totalCost: 0,
    earnings: 0,
    hist: {},
  }
  arange(numPeriods).forEach(i => {
    subjects[id].hist[i+1] = {
      cost: {1:0,2:0},
      prob: {1:0,2:0},
      minProb1: 0,
      maxCost2: 0,
      shock: 0,
    }
  })
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
  arange(numPeriods).forEach(p => {
    var shocks = arange(numSubjects).map(i => i%2)
    shocks = shuffle(shocks)
    arange(numSubjects).forEach(i => {
      subjects[i+1].hist[p+1].shock = shocks[i]
    })
  })
}
update = function(){
  countdown = countdown - 1
  if(state == "investment1"&&countdown <= 0) {
    state = "feedback1"
    countdown = feedback1Length
  }
  if(state == "feedback1"&&countdown <= 0) {
    state = "investment2"
    stage = 2
    countdown = stage2Length
  }
  if(state == "investment2"&&countdown <= 0) {
    state = "feedback2"
    countdown = feedback2Length
    updateDataFile()
  }  
  if(state == "feedback2"&&countdown <= 0) {
    if(period>=numPeriods){
      state = "outcome" 
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
      state = "investment1"
      stage = 1
      countdown = stage1Length
     } 
  }  
}
