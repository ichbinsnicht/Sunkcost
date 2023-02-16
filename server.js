var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
const numPracticePeriods  = 5 // 5 practice periods
const numPeriods  = 1    // 1 period, numPeriods > numPracticePeriods
const step1Length = 15   // 15 secs
const step2Length = 15   // 15 secs
const step3Length = 15   // 15 secs
const step4Length = 15   // 15 secs
const timestep = 1
const endowment = 15
const multiplier1Low = 1      // marginal cost of the score in period 1
const multiplier1High = 10      // marginal cost of the score in period 1
const multiplier2Low = 1   // calibrate the high costs!
const multiplier2High = 10  // cost2 = sunk cost in period 2 (high cost shock)

// variables
var subjects = {}
var numSubjects = 0
var state = "startup"
var period = 1
var step = 1
var stage = 1 
var practiceComplete = false
var experimentStarted = false
var countdown = step1Length
var dataStream = {}
var dateString = ""

// TODO
// - implement real effort treatments
// - update audio
//
// Lower Priority
// - interface and language improvement
// - calibrate timing of stages
// - task: pilot with friends/colleagues 
// - how do we deal with habit persistence/inertia?
// - money is prepared to be send to you for the experiment ($5500)
// - change total cost to stage 2 costs due to real effort intervention
// - calibration exercise
// - set up mixture model to have everything ready prior to the experiment
//- (free software) eye tracking to detect heterogeneity across gender? https://github.com/brownhci/WebGazer (women are more likely to focus on risk and men more likely on payout)
//- ask Shengwu for input again
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

const formatTwo = function(x){
  var y = x.toFixed(0)
  if(y<10) y = "0" + y
  return y
}
const getDateString = function(){
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
const createDataFile = function(){
  dateString = getDateString()
  dataStream = fs.createWriteStream(`data/data-${dateString}.csv`)
  var csvString = "session,period,practice,id,forced1,forcedScore1,multiplier1,multiplier2,"
  csvString += "choice1,choice2,score1,score2,cost1,cost2,endowment,totalScore,outcomeRandom,winPrize,totalCost,earnings"
  csvString += "\n"
  dataStream.write(csvString)
}
const updateDataFile = function(){
  var csvString = ""
  Object.values(subjects).forEach(subject => {
    csvString += `${dateString},${period},${1-practiceComplete},${subject.id},`
    csvString += `${subject.hist[period].forced[1]},${subject.hist[period].forcedScore[1]},`
    csvString += `${subject.hist[period].multiplier[1]},${subject.hist[period].multiplier[2]},`
    csvString += `${subject.hist[period].choice[1]},${subject.hist[period].choice[2]},`    
    csvString += `${subject.hist[period].score[1]},${subject.hist[period].score[2]},`
    csvString += `${subject.hist[period].cost[1]},${subject.hist[period].cost[2]},`
    csvString += `${endowment},${subject.totalScore},${subject.outcomeRandom},`
    csvString += `${subject.winPrize},${subject.totalCost},${subject.earnings},`
    csvString += "\n"
  })
  dataStream.write(csvString)
}

const writePaymentFile = function(){
  var csvString = "id,earnings,winPrize\n"
  calculateOutcome()
  Object.values(subjects).forEach(subject => {
    csvString += `${subject.id},${subject.earnings.toFixed(2)},${subject.winPrize}\n`
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
      createDataFile()    
      setInterval(update, 1000*timestep) 
    }
  })
  socket.on("startExperiment", function(msg){
    if(state == "instructions") {
      arange(numSubjects).forEach(i => setupHist(subjects[i+1]))
      state = "interface"
      experimentStarted = true
      console.log(`startExperiment`)
    }   
  })
  socket.on("managerUpdate", function(msg){
    var ids = Object.keys(subjects)
    var reply = {numSubjects, ids, state, countdown, experimentStarted, practiceComplete}
    socket.emit("serverUpdateManager",reply)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client
    if(subjects[msg.id]){
      const choosing = step==1 || step==3
      if(period == msg.period && step == msg.step && choosing ) {
        subjects[msg.id].hist[msg.period].choice[msg.stage] = msg.currentChoice
        subjects[msg.id].hist[msg.period].score[msg.stage] = msg.currentScore      
        subjects[msg.id].hist[msg.period].cost[msg.stage] = msg.currentCost
      }  
      var reply = {
        period,
        state,
        step,
        stage,
        experimentStarted, 
        practiceComplete,
        numPracticePeriods,
        countdown, 
        endowment,      
        outcomePeriod: subjects[msg.id].outcomePeriod,
        outcomeRandom: subjects[msg.id].outcomeRandom,
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

const shuffle = function(array){
  var shuffled = array
    .map(x => ({value: x, priority: Math.random()}))
    .sort((a,b) => a.priority-b.priority)
    .map(x => x.value)
  return shuffled
}

const setupHist = function(subject) {
  arange(numPracticePeriods).forEach(i => {
    subject.hist[i+1] = {
      choice: {1:0,2:0},
      score: {1:0,2:0},      
      cost: {1:0,2:0},
      forcedScore: {1:Math.random()*0.5,2:0},
      forced: {1:1*(Math.random()>0.5),2:0},
      outcomeRandom: Math.random(),
      multiplier: {1:choose([multiplier1Low,multiplier1High]),2:choose([multiplier2Low,multiplier2High])},
    }
  })
} 

const createSubject = function(id, socket){
  numSubjects += 1
  const subject = {
    id: id,
    socket: socket,
    choice1: 0,
    investment2: 0,
    outcomePeriod: 1,
    outcomeRandom: {1:0,2:0},
    winPrize: 0,
    totalCost: 0,
    earnings: 0,
    hist: {},
  }
  subjects[id] = subject
  setupHist(subject)
  console.log(`subject ${id} connected`)
}
const calculateOutcome = function(){
  arange(numSubjects).forEach(i => {
    const subject = subjects[i+1]
    const selectedHist = subject.hist[period]
    subject.outcomeRandom = selectedHist.outcomeRandom
    subject.score1 = selectedHist.score[1]
    subject.score2 = selectedHist.score[2]
    subject.totalScore = selectedHist.score[1] + selectedHist.score[2]
    subject.winPrize = (subject.totalScore > selectedHist.outcomeRandom)*1
    subject.totalCost = selectedHist.cost[1]+selectedHist.cost[2]
    subject.earnings = endowment - subject.totalCost
  })
}
const update = function(){
  if(state == "interface"){
    countdown = countdown - 1
    if(step == 1 && countdown <= 0) {
      countdown = step2Length
      step = 2
    }
    if(step == 2 && countdown <= 0) {
      countdown = step3Length
      step = 3
    }    
    if(step == 3 && countdown <= 0) {
      calculateOutcome()
      countdown = step4Length
      step = 4 
    }
    if(step == 4 && countdown <= 0) {
      updateDataFile()
      const maxPeriod = experimentStarted ? numPeriods : numPracticePeriods
      if(period>=maxPeriod){
        countdown = 0
        if(experimentStarted){
          state = "end" 
          writePaymentFile()
          console.log("Session Complete")
        } else{
          state = "instructions"
          practiceComplete = true
          period = 1
          step = 1
          countdown = step1Length
        }
      } else{
        countdown = step1Length
        period += 1
        state = "interface"
        step = 1
       } 
    }
    stage = step < 3 ? 1 : 2 
  }
}
