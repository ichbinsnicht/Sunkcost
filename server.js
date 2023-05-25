var express     = require("express")              // server building package
var app         = express()
var http        = require("http").Server(app)     // server-side socket (socket is for communication)
var io          = require("socket.io")(http)      // io - input output
var fs          = require("fs")                   // filesystem (to save stuff)
var seedrandom        = require("seedrandom")

// first time;
// set-up: after cloning, run npm install to install dependencies
// manually create data folder

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
const numPracticePeriods  = 1 // 5 practice periods
const numPeriods  = 1    // 1 period, numPeriods > numPracticePeriods
const step1Length = 3   // 15 secs choice1
const step2Length = 3   // 15 secs typingTask1
const step3Length = 3   // 15 secs feedback1
const step4Length = 3   // 15 secs choice2
const step5Length = 3   // 15 secs typingTask2
const step6Length = 3   // 15 secs feedback2
const timestep = 1
const endowment = 15
const multiplier1Low = 1    // marginal cost of the score in period 1
const multiplier1High = 10  // marginal cost of the score in period 1
const multiplier2Low = 1    // calibrate the high costs!
const multiplier2High = 10  // cost2 = sunk cost in period 2 (high cost shock)
const cost2Text = 10      // 60 letters per dollar (based on Ruixin's mellon experiment: 300 letters for 5 dollars )
                          // 170 letters per dollar according to Greiner, B., Ockenfels, A., & Werner, P. (2011). Wage transparency and performance: A real-effort experiment. Economics Letters, 111(3), 236-238.
                          // 200 characters per minute is the average typing speed (i.e. a dollar per minute)

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
var practiceTypingTarget = genRandomString(2)
seedrandom(randomSeed, {global: true})

// TODO LAB EXPERIMENT
// - implement real effort treatments
// --> update instructions for real effort
// --> update audio
// --> survey required for machine-learning approach
// --> real effort conversion?
//
// TODO TYPING TASK
// - find literature on letters to dollar conversion (e.g. Ruixin, or
// - Greiner, Ockenfels  and Werner (2011)
// - Dickinson, D. L. (1999). An experimental examination of labor supply and work intensities. Journal of Labor Economics, 17(4), 638-670.)
//
// TODO SURVEY
// --> survey prior to subjects coming into the lab?
// --> pre-survey: risk-preferences, (time preferences)
// --> post-survey: (stable) characteristics age, gender, education, ...
//
// TODO MACHINE LEARNING
// --> generate fake data
// --> how to layer?
// ----> or attention-based models? Unlikely since it would leverage order of variables
// ----> convulational layers? Unlikely (typically in image-reconnection, pixels are connected that are next to each other)
// ----> sequence of fully connected layers that use relu activation functions (rectified-linear units)
// --> objective function: mean-squared error (MSE) due to continuous outcome variable and mean-prediction
// --> use ML model from Pytorch (pick ML model that predicts best out of sample)
// --> open questions: # layers; size of layers; final layer linear, relu, other?
//
// TODO PILOTING
// - Unreal PILOT: pilot with friends/colleagues 
// -- calibrate timing of stages
// - Real PILOT: pilot with real subjects at VCU
// -- calibrate typing cost
// - Feedback: ask Shengwu for input again

// - Machine Learning model replaces mixture model
// - external funding (Incubator grant) or alternatives


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
  var csvString = "session,realEffort,period,practice,id,forced1,forcedScore1,multiplier1,multiplier2,"
  csvString += "choice1,choice2,score1,score2,cost1,cost2,endowment,totalScore,outcomeRandom,winPrize,totalCost,earnings"
  csvString += "\n"
  dataStream.write(csvString)
}
const updateDataFile = function(){
  var csvString = ""
  Object.values(subjects).forEach(subject => {
    csvString += `${dateString},${realEffort},${period},${1-practicePeriodsComplete},${subject.id},`
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

const writePaymentFile = function(subject){
  var csvString = "id,earnings,winPrize\n"
  calculateOutcome()
  csvString += `${subject.id},${subject.earnings.toFixed(2)},${subject.winPrize}\n`
  var logError = (ERR) => { if(ERR) console.log(ERR)}
  fs.writeFile(`data/payment-${dateString}-${subject.id}.csv`,csvString,logError)
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
      const typing = step == 3 || step==5
      if(period == msg.period && step == msg.step) {
        if(choosing){
          histPeriod.choice[msg.stage] = msg.currentChoice
          histPeriod.score[msg.stage] = msg.currentScore      
          histPeriod.cost[msg.stage] = msg.currentCost
        }
        if(typing){
          subject.typingProgress = msg.typingProgress
        }
      }  
      var reply = {
        realEffort,
        period,
        state,
        experimentStarted, 
        practicePeriodsComplete,
        experimentComplete: subject.experimentComplete,
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
    experimentComplete: false,
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
    subject.earnings = endowment - subject.totalCost*(1-realEffort)
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
      console.log("subject.countdown",subject.countdown)
      if(subject.step == 1 && subject.countdown <= 0) { // end subject.step1 choice1
          subject.countdown = step2Length
          subject.step = 2  
          console.log("period",period)
          console.log("subject.step",subject.step)
      }
      if(subject.step == 2 && subject.countdown <= 0) { // end subject.step2 feedback1  
        if(realEffort){
          const currentCost = subject.hist[period].cost[subject.stage]
          const currentLength = Math.round(currentCost*cost2Text)
          subject.typingTarget = genRandomString(currentLength)
          subject.countdown = step3Length
          subject.step = 3
          console.log("subject.step",subject.step)
        } else {
          subject.countdown = step4Length
          subject.step = 4
          console.log("subject.step",subject.step)    
        }
      }    
      if(subject.step == 3) { // end subject.step3 typingTask1 
        var feedbackComplete = !experimentStarted && subject.countdown <= 0
        var typingComplete = experimentStarted && subject.typingProgress==subject.typingTarget.length
        if(typingComplete || feedbackComplete){
          subject.countdown = step4Length
          subject.step = 4
          console.log("subject.step",subject.step)
        }
      }   
      if(subject.step == 4 && subject.countdown <= 0) { // end subject.step4 choice2
        calculateOutcome()
        if(realEffort){
          const currentCost = subject.hist[period].cost[subject.stage]
          const currentLength = Math.round(currentCost*cost2Text)
          subject.typingTarget = genRandomString(currentLength)
          subject.countdown = step5Length
          subject.step = 5 
          console.log("subject.step",subject.step)
        } else {
          subject.countdown = step6Length
          subject.step = 6       
          console.log("subject.step",subject.step)
        }
      }
      if(subject.step == 5) { // end subject.step5 typingTask2 
        var feedbackComplete = !experimentStarted && subject.countdown <= 0
        var typingComplete = experimentStarted && subject.typingProgress==subject.typingTarget.length
        if(typingComplete || feedbackComplete){
          subject.countdown = step6Length
          subject.step = 6
          console.log("subject.step",subject.step)
        }
      }
      if(subject.step == 6 && subject.countdown <= 0) { // end subject.step6 feedback2
        updateDataFile()          // change to subject-specific
        const maxPeriod = experimentStarted ? numPeriods : numPracticePeriods
        if(period>=maxPeriod){
          if(experimentStarted){
            subject.step = 7
            console.log("period",period)
            console.log("subject.step",subject.step)
            writePaymentFile(subject)
            subject.experimentComplete = true
            console.log("Session Complete")
          } else{
            console.log("endPracticePeriods")
            state = "instructions"
            practicePeriodsComplete = true
            period = 1
            subject.step = 1
            subject.countdown = step1Length
            console.log("period",period)
            console.log("subject.step",subject.step)
          }
        } else{
          subject.countdown = step1Length
          period += 1
          subject.step = 1
          console.log("period",period)
          console.log("subject.step",subject.step)
         } 
      }
      subject.stage = subject.step < 4 ? 1 : 2 
    })
  }
}
