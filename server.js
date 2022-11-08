var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
const numPracticePeriods  = 5 // 3 practice periods
const numPeriods  = 12   // 10 periods
const stage1Length = 5   // 20 secs
const stage2Length = 5   // 20 secs
const stage3Length = 3   // 10 secs
const timestep = 1
const endowment = 20
const maxCost1 = 5      // marginal cost of the probability in period 1
const maxCost2Low = 1   // calibrate the high costs!
const maxCost2High = 5  // cost2 = sunk cost in period 2 (high cost shock)
const potMinProb1 = 0.5

// variables
var subjects    = {}
var numSubjects = 0
var state       = "startup"
var period      = 1
var stage       = 1
var practiceComplete = false
var experimentStarted = false
var countdown = stage1Length
var dataStream = {}
var dateString = ""

// TODO
// - derive theoretical predictions to motivate hypotheses
// - Power calculation based on regression
//   choice2 = f(bound1, mc2, cost1, choice1, epsilon)
// - external funding: Incubator grant
// - additional treatment: stage 1 choosen randomly vs explicitly
// ------------------------------------------------------------------------------
// - schedule (flight) time/funding (funding from VCU) for experiment at VCU
// - test coding in lab @VCU
// - calibration exercise not needed anymore (distribution is always without knowledge of bound) 

// Done
// - $15 physicial gift certificate from Kroger (https://giftcards.kroger.com/starbucks-gift-card). 
// - What is the value of a $12 gift card? Literature?

app.use(express.static(__dirname + "/public"))
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
  var csvString = "session,period,id,minProb1,minProb2,maxCost1,maxCost2,"
  csvString += "choice1,choice2,prob1,prob2,cost1,cost2,endowment,"
  csvString += "\n"
  dataStream.write(csvString)
}
updateDataFile = function(){
  var csvString = ""
  Object.values(subjects).forEach(subject => {
    csvString += `${dateString},${period},${subject.id},`
    csvString += `${subject.hist[period].minProb[1]},${subject.hist[period].minProb[2]},`
    csvString += `${subject.hist[period].maxCost[1]},${subject.hist[period].maxCost[2]},`
    csvString += `${subject.hist[period].choice[1]},${subject.hist[period].choice[2]},`    
    csvString += `${subject.hist[period].prob[1]},${subject.hist[period].prob[2]},`
    csvString += `${subject.hist[period].cost[1]},${subject.hist[period].cost[2]},`
    csvString += `${endowment},`
    csvString += "\n"
  })
  dataStream.write(csvString)
}

writePaymentFile = function(){
  var csvString = "id,earnings,winPrize,outcomePeriod,winTicket1,winTicket2,totalCost,endowment\n"
  Object.values(subjects).forEach(subject => {
    csvString += `${subject.id},${subject.earnings.toFixed(2)},${subject.winPrize},${subject.outcomePeriod},` 
    csvString += `${subject.winTicket1},${subject.winTicket2},${subject.totalCost},${endowment}\n`
  })
  var logError = (ERR) => { if(ERR) console.log(ERR)}
  fs.writeFile(`data/payment-${dateString}.csv`,csvString,logError)
}

io.on("connection",function(socket){
  socket.emit("connected")
  socket.on("showInstructions", function(msg){
    console.log(`showInstructions`)
    if(state == "startup") state = "instructions"
  })
  socket.on("startPractice", function(msg){
    if(state == "instructions") {
      state = "interface"
      console.log(`startPractice`)
      setInterval(update, 1000*timestep) 
    }
  })
  socket.on("startExperiment", function(msg){
    if(state == "instructions") {
      state = "interface"
      experimentStarted = true
      console.log(`startExperiment`)
      createDataFile()
    }   
  })
  socket.on("managerUpdate", function(msg){
    var ids = Object.keys(subjects)
    var reply = {numSubjects, ids, state, countdown, experimentStarted, practiceComplete}
    socket.emit("serverUpdateManager",reply)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client
    if(subjects[msg.id]){
      if(period == msg.period && stage == msg.stage && stage<3) {
        subjects[msg.id].hist[msg.period].choice[msg.stage] = msg.currentChoice
        subjects[msg.id].hist[msg.period].prob[msg.stage] = msg.currentProb      
        subjects[msg.id].hist[msg.period].cost[msg.stage] = msg.currentCost
      }  
      var reply = {
        period,
        state,
        stage,
        experimentStarted, 
        practiceComplete,
        numPracticePeriods,
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
      socket.emit("clientJoined",{id: msg.id})
    }
  })
  socket.on("joinGame", function(msg){
    console.log("joinGame",msg.id)
    if(!subjects[msg.id]) createSubject(msg.id,socket)
    socket.emit("clientJoined",{id: msg.id, hist: subjects[msg.id].hist, period})
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

createSubject = function(id, socket){
  numSubjects += 1
  subjects[id] = {
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
  }
  arange(numPeriods).forEach(i => {
    subjects[id].hist[i+1] = {
      choice: {1:0,2:0},
      prob: {1:0,2:0},      
      cost: {1:0,2:0},
      minProb: {1:Math.random()*potMinProb1,2:0},
      maxCost: {1:maxCost1,2:choose([maxCost2Low,maxCost2High])},
    }
  })
  console.log(`subject ${id} connected`)
}
update = function(){
  if(state == "interface"){
    countdown = countdown - 1
    if(stage == 1 && countdown <= 0) {
      countdown = stage2Length
      stage = 2
    }
    if(stage == 2 && countdown <= 0) {
      countdown = stage3Length
      stage = 3 
    }
    if(stage == 3 && countdown <= 0) {
      if(experimentStarted) updateDataFile()
      const maxPeriod = experimentStarted ? numPeriods : numPracticePeriods
      if(period>=maxPeriod){
        countdown = 0
        if(experimentStarted){
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
          state = "instructions"
          practiceComplete = true
        }
      } else{
        countdown = stage1Length
        period += 1
        state = "interface"
        stage = 1
       } 
    }
  }
}
