var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
const numPracticePeriods  = 1 // 5 practice periods
const numPeriods  = 1   // 15 periods, numPeriods > numPracticePeriods
const stage1Length = 3   // 20 secs
const stage2Length = 3   // 20 secs
const stage3Length = 3    // 10 secs
const timestep = 1
const endowment = 20
const multiplier1 = 10      // marginal cost of the score in period 1
const multiplier2Low = 1   // calibrate the high costs!
const multiplier2High = 10  // cost2 = sunk cost in period 2 (high cost shock)

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
// - implement real effort adjustments
// - change total cost to stage 2 costs due to real effort intervention
// - calibration exercise
// - external funding (Incubator grant) or alternatives
// ------------------------------------------------------------------------------
// - schedule (flight) time/funding (funding from VCU) for experiment at VCU
// - test coding in lab @VCU

// Done
// ------------------------------------------------------------------------------
// - $15 physicial gift certificate from Kroger (https://giftcards.kroger.com/starbucks-gift-card). 
// - What is the value of a $15 gift card? Literature?
// Actually people may value a gift card less than cash. If they value the gift card at the extreme,
// 2/3 less than cash, then they would not want to invest, otherwise they do (2/3*15)
// In literature, we may find the (individually internal) exchange rate of gift card to money
// - How much individuals value the gift card depends on the subjects match with the gift card

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
  var csvString = "session,period,id,forced1,forcedScore1,multiplier1,multiplier2,"
  csvString += "choice1,choice2,score1,score2,cost1,cost2,endowment,"
  csvString += "\n"
  dataStream.write(csvString)
}
updateDataFile = function(){
  var csvString = ""
  Object.values(subjects).forEach(subject => {
    csvString += `${dateString},${period},${subject.id},`
    csvString += `${subject.hist[period].forced[1]},${subject.hist[period].forcedScore[1]},`
    csvString += `${subject.hist[period].multiplier[1]},${subject.hist[period].multiplier[2]},`
    csvString += `${subject.hist[period].choice[1]},${subject.hist[period].choice[2]},`    
    csvString += `${subject.hist[period].score[1]},${subject.hist[period].score[2]},`
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
      console.log("subjects:", subjects)
      arange(numSubjects).forEach(i => setupHist(subjects[i+1]))
      console.log("subjects:", subjects)
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
        subjects[msg.id].hist[msg.period].score[msg.stage] = msg.currentScore      
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

setupHist = function(subject) {
  arange(numPeriods).forEach(i => {
    subject.hist[i+1] = {
      choice: {1:0,2:0},
      score: {1:0,2:0},      
      cost: {1:0,2:0},
      forcedScore: {1:Math.random()*0.5,2:0},
      forced: {1:1*(Math.random()>0.5),2:0},
      multiplier: {1:multiplier1,2:choose([multiplier2Low,multiplier2High])},
    }
  })
} 

createSubject = function(id, socket){
  numSubjects += 1
  const subject = {
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
  subjects[id] = subject
  setupHist(subject)
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
            subject.outcomeRandom = Math.random()
            const selectedHist = subject.hist[subject.outcomePeriod]
            subject.score1 = selectedHist.score[1]
            subject.score2 = selectedHist.score[2]
            subject.totalScore = subject.score1 + subject.score2
            subject.winPrize = (subject.totalScore > subject.outcomeRandom)*1
            subject.totalCost = selectedHist.cost[1]+selectedHist.cost[2]
            subject.earnings = endowment - subject.totalCost
          })
          writePaymentFile()
          console.log("Session Complete")
        } else{
          state = "instructions"
          practiceComplete = true
          period = 1
          stage = 1
          countdown = stage1Length
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
