var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)
var seedrandom        = require("seedrandom")

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
const numPracticePeriods  = 2 // 5 practice periods
const numPeriods  = 1    // 1 period, numPeriods > numPracticePeriods
const step1Length = 5   // 15 secs choice1
const step2Length = 5   // 15 secs typingTask1
const step3Length = 5   // 15 secs feedback1
const step4Length = 3   // 15 secs choice2
const step5Length = 3   // 15 secs typingTask2
const step6Length = 3   // 15 secs feedback2
const timestep = 1
const endowment = 15
const multiplier1Low = 1      // marginal cost of the score in period 1
const multiplier1High = 10      // marginal cost of the score in period 1
const multiplier2Low = 1   // calibrate the high costs!
const multiplier2High = 10  // cost2 = sunk cost in period 2 (high cost shock)
const cost2Text = 10

// variables
var realEffort = false
var subjects = {}
var numSubjects = 0
var state = "startup"
var period = 1
var typingPracticeAllComplete = false
var practiceTypingComplete = false
var practicePeriodsComplete = false
var experimentStarted = false
var dataStream = {}
var dateString = ""
var randomSeed = Math.random()
seedrandom("seed", {global: true})
var practiceTypingTarget = genRandomString(1)
seedrandom(randomSeed, {global: true})

// TODO
// implement real effort treatments
// --> set up steps on the subject level so that subjects can move independently (only in realExperiment!)
//    --> make update function client-specific
//    --> subject-specific calculateOutcome(), updateDataFile() and writePaymentFile()
//    --> in practice, and real experiment: choice-dependent typingTarget string 
// -> think about it: feedback in first stage needs to happen prior to typingtask1
// (which also depends on multiplier)
// --> update instructions for real effort
// --> (potentially) collect time for real effort task

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

function genRandomString(length){
  var numbers = Array.from(Array(26)).map((e,i) => i )
  var letters = numbers.map(i => String.fromCharCode(i+65))
  return Array.from(Array(length)).map(i => choose(letters)).join("")
}

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
    csvString += `${dateString},${period},${1-practicePeriodsComplete},${subject.id},`
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
  socket.on("startPracticeTyping", function(msg){
    if(state == "instructions" && practiceTypingComplete == false) {
      state = "typingPractice"
      countdown = 10000
      console.log(`startPracticeTyping`)
      setInterval(update, 1000*timestep)
      createDataFile() 
    }
  })  
  socket.on("typingPracticeSubjectComplete", function(msg){
    subjects[msg.id].typingPracticeComplete = true
  })
  socket.on("startPracticePeriods", function(msg){
    if(state == "instructions" && practicePeriodsComplete == false && typingPracticeAllComplete == true) {
      countdown = step1Length
      state = "interface"
      console.log(`startPracticePeriods`)
    }
  })
  socket.on("startExperiment", function(msg){
    if(state == "instructions") {
      countdown = step1Length
      arange(numSubjects).forEach(i => setupHist(subjects[i+1]))
      state = "interface"
      experimentStarted = true
      console.log(`startExperiment`)
    }   
  })
  socket.on("managerUpdate", function(msg){
    if(state == "startup") realEffort = msg.realEffort
    var ids = Object.keys(subjects)
    var subjectsArray = Object.values(subjects)
    var subjectsData = subjectsArray.map(subject => {
      return {
        id: subject.id,
        step: subject.step,
        countdown: subject.countdown
      }
    })
    var reply = {
      numSubjects, 
      ids, 
      state, 
      subjectsData, 
      experimentStarted, 
      typingPracticeAllComplete, 
      practicePeriodsComplete,
      realEffort
    }
    socket.emit("serverUpdateManager",reply)
  })
  socket.on("clientUpdate", function(msg){ // callback function; msg from client, send msg to client 
    const subject = subjects[msg.id]
    if(subject){
      const step = subject.step
      const histPeriod = subject.hist[msg.period]
      const choosing = step==1 || step==4
      if(period == msg.period && step == msg.step && choosing ) {
        histPeriod.choice[msg.stage] = msg.currentChoice
        histPeriod.score[msg.stage] = msg.currentScore      
        histPeriod.cost[msg.stage] = msg.currentCost
        subject.typingProgress = msg.typingProgress
      }  
      var reply = {
        realEffort,
        period,
        state,
        experimentStarted, 
        practicePeriodsComplete,
        numPracticePeriods,
        typingTarget: practiceTypingComplete ? subject.typingTarget : practiceTypingTarget,
        endowment,
        step: subject.step,
        stage: subject.stage,
        countdown: subject.countdown,    
        typingPracticeAllComplete: typingPracticeAllComplete,
        typingPracticeSubjectComplete: subject.typingPracticeComplete,
        outcomePeriod: subject.outcomePeriod,
        outcomeRandom: subject.outcomeRandom,
        winPrize: subject.winPrize,
        totalCost: subject.totalCost,
        earnings: subject.earnings,
        hist: subject.hist,
      } 
      socket.emit("serverUpdateClient",reply)
    } else {
      if(!subject) createSubject(msg.id,socket)
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
    console.log("subject.hist[i+1].forcedScore", subject.hist[i+1].forcedScore)
  })
} 

const createSubject = function(id, socket){
  numSubjects += 1
  const subject = {
    id: id,
    socket: socket,
    typingPracticeComplete: false,
    typingTarget: "",
    typingProgress: 0,
    step: 1,
    stage: 1,
    countdown: step1Length,
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
  var subjectsArray = Object.values(subjects)
  if(state == "typingPractice"){
    typingPracticeAllComplete = subjectsArray.every(subject => subject.typingPracticeComplete) 
    if(typingPracticeAllComplete){
      practiceTypingComplete = true
      state = "instructions"
    }
  }
  if(state == "interface"){
    subjectsArray.forEach(subject => {
      subject.countdown = subject.countdown - 1
      if(subject.step == 1 && subject.countdown <= 0) { // end subject.step1 choice1
          subject.countdown = step2Length
          subject.step = 2  
      }
      if(subject.step == 2 && subject.countdown <= 0) { // end subject.step2 feedback1  
        if(realEffort){
          const currentCost = subject.hist[period].cost[subject.stage]
          const currentLength = Math.round(currentCost*cost2Text)
          subject.typingTarget = genRandomString(currentLength)
          console.log("period",period)
          console.log("subject.step",subject.step)
          console.log("subject.stage",subject.stage)
          console.log("currentCost",currentCost)
          console.log("currentLength",currentLength)
          console.log("subject.typingTarget",subject.typingTarget)
          subject.countdown = step3Length
          subject.step = 3
        } else {
          subject.countdown = step4Length
          subject.step = 4        
        }
      }    
      if(subject.step == 3) { // end subject.step3 typingTask1 
        var feedbackComplete = !experimentStarted && subject.countdown <= 0
        var typingComplete = experimentStarted && subject.typingProgress==practiceTypingTarget.length
        if(typingComplete || feedbackComplete){
          subject.countdown = step4Length
          subject.step = 4
        }
      }   
      if(subject.step == 4 && subject.countdown <= 0) { // end subject.step4 choice2
        calculateOutcome()
        if(realEffort){
          const currentCost = subject.hist[period].cost[subject.stage]
          const currentLength = Math.round(currentCost*cost2Text)
          subject.typingTarget = genRandomString(currentLength)
          console.log("period",period)
          console.log("subject.step",subject.step)
          console.log("subject.stage",subject.stage)
          console.log("currentCost",currentCost)
          console.log("currentLength",currentLength)
          console.log("subject.typingTarget",subject.typingTarget)
          subject.countdown = step5Length
          subject.step = 5 
        } else {
          subject.countdown = step6Length
          subject.step = 6       
        }
      }
      if(subject.step == 5) { // end subject.step5 typingTask2 
        var feedbackComplete = !experimentStarted && subject.countdown <= 0
        var typingComplete = experimentStarted && subject.typingProgress==practiceTypingTarget.length
        if(typingComplete || feedbackComplete){
          subject.countdown = step6Length
          subject.step = 6
        }
      }
      if(subject.step == 6 && subject.countdown <= 0) { // end subject.step6 feedback2
        updateDataFile()          // change to subject-specific
        const maxPeriod = experimentStarted ? numPeriods : numPracticePeriods
        if(period>=maxPeriod){
          subject.countdown = 0
          if(experimentStarted){
            subject.step = 7
            writePaymentFile()    // change to subject-specific
            console.log("Session Complete")
          } else{
            console.log("endPracticePeriods")
            state = "instructions"
            practicePeriodsComplete = true
            period = 1
            subject.step = 1
          }
        } else{
          subject.countdown = step1Length
          period += 1
          subject.step = 1
         } 
      }
      subject.stage = subject.step < 4 ? 1 : 2 
    })
  }
}
