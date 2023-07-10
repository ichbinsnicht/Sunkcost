const express     = require("express")              // server building package
const app         = express()
const http        = require("http").Server(app)     // server-side socket (socket is for communication)
const io          = require("socket.io")(http)      // io - input output
const fs          = require("fs")                   // filesystem (to save stuff)
const seedrandom  = require("seedrandom")
const path        = require('path')
const { google }  = require('googleapis')

//redirect URL and refresh token
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04uMG7VSBQC_7CgYIARAAGAQSNwF-L9Ir3uCW_yqpqECAsmRgrZIbXMBfO8nQ117D3e5chOkQQjRLBk69PBpeOoZ2F_c3R2aB2_A'
const CLIENT_ID = '1003293269435-t9ogu0j3i604d94pnerk5q3j0avce7gm.apps.googleusercontent.com' // replace all double quotes if possible
const CLIENT_SECRET = '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'

const oauth2Client = new google.auth.OAuth2( //intialize auth client
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
)

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({  //initialize google drive
  version: 'v3',
  auth: oauth2Client,
})

//function to upload the file - async = non-blocking (next line can start before this is finished)
async function uploadFile(fileName) {
  if(process.env.RENDER){
    const filePath = path.join(__dirname, 'data',fileName);
    const folderId = '1vZs0JkWsoQ1Z1CQie_339AemT9ohDXNL'
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    }
    const media = {
      mimeType: 'text/csv',
      body: fs.createReadStream(filePath),
    }
    try {
      const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });
      console.log('File Id:', file.data.id);
      return file.data.id;
    } catch (err) {
      console.log(err.message)
      throw err;
    }
  }
}  

var arange = x => [...Array(x).keys()] 
var choose = x => x[Math.floor(Math.random()*x.length)]

// parameters
const numPracticePeriods  = 1 // 5 practice periods
const numPeriods  = 1    // 1 period, numPeriods > numPracticePeriods
const step1Length = 3   // 15 secs choice1
const step2Length = 3   // 15 secs feedback1
const step3Length = 3   // 15 secs typingTask1
const step4Length = 3   // 15 secs choice2
const step5Length = 3   // 15 secs typingTask2 
const step6Length = 3   // 15 secs feedback2 
const timestep = 1
const endowment = 15
const multiplier1Low = 1    // marginal cost of the score in period 1
const multiplier1High = 10  // marginal cost of the score in period 1
const multiplier2Low = 1    // calibrate the high costs!
const multiplier2High = 10  // cost2 = sunk cost in period 2 (high cost shock)
const cost2Text = 10      // 200 cost2Text (default)
                          // 60 letters per dollar (based on Ruixin's mellon experiment: 300 letters for 5 dollars )
                          // 170 letters per dollar according to Greiner, B., Ockenfels, A., & Werner, P. (2011). Wage transparency and performance: A real-effort experiment. Economics Letters, 111(3), 236-238.
                          // 200 characters per minute is the average typing speed (i.e. a dollar per minute)

// variables
var realEffort = false
var subjects = {}
var numSubjects = 0
var preSurveyLock = true
var practiceLock = true
var dateString = getDateString()
var randomSeed = Math.random()
seedrandom("seed", {global: true})
var practiceTypingTarget = genRandomString(2)
seedrandom(randomSeed, {global: true})


// TODO
// fix states: multiple subjects are all stuck at post survey together
// login
// --> subjects need to be on the guest list to get into the experiment
//
//
// 3) TODO PILOTING
// - Unreal PILOT: pilot with friends/colleagues 
// -- calibrate timing of stages
// - Real PILOT: pilot with real subjects at VCU
// -- calibrate typing cost
// - Feedback: ask Shengwu for input again
//
// - Machine Learning model replaces mixture model
// - external funding (Incubator grant) or alternatives
//
// TODO INSTRUCTIONS
// --> update instructions for practice typing and survey
// --> update audio


// Done
// ------------------------------------------------------------------------------
// Web deployment for piloting: https://sunkcost.onrender.com
// - GDrive interfacing (https://www.section.io/engineering-education/google-drive-api-nodejs/)
//
// 2) TODO WEB APP
// - autonomous web app for piloting (no manager required)
// - sending data to interfacing service (e.g. GDrive)
//
// typing task
// - find literature on letters to dollar conversion (e.g. Ruixin, or
// - Greiner, Ockenfels  and Werner (2011)
// - Dickinson, D. L. (1999). An experimental examination of labor supply and work intensities. Journal of Labor Economics, 17(4), 638-670.)
//
// 4) TODO MACHINE LEARNING
// --> generate fake data
// --> how to layer?
// ----> or attention-based models? Unlikely since it would leverage order of variables
// ----> convulational layers? Unlikely (typically in image-reconnection, pixels are connected that are next to each other)
// ----> sequence of fully connected layers that use relu activation functions (rectified-linear units)
// --> objective function: mean-squared error (MSE) due to continuous outcome variable and mean-prediction
// --> use ML model from Pytorch (pick ML model that predicts best out of sample)
// --> open questions: # layers; size of layers; final layer linear, relu, other?
//
// incentives
// - $15 physicial gift certificate from Kroger (https://giftcards.kroger.com/starbucks-gift-card). 
// - What is the value of a $15 gift card? Literature?
// Actually people may value a gift card less than cash. If they value the gift card at the extreme,
// 2/3 less than cash, then they would not want to invest, otherwise they do (2/3*15)
// In literature, we may find the (individually internal) exchange rate of gift card to money
// - How much individuals value the gift card depends on the subjects match with the gift card

app.use(express.static(__dirname + "/public"))
app.get("/client:id",function(req,res){
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

function formatTwo(x){
  var y = x.toFixed(0)
  if(y<10) y = "0" + y
  return y
}
function getDateString(){
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

const writePreSurveyFile = function(msg){
  console.log(`WritingPreSurvey ${msg.id}`)
  var csvString = Object.keys(msg).join(",")
  csvString += "\n"
  csvString += Object.values(msg).join(",")
  var logError = (ERR) => { if(ERR) console.log(ERR)}
  const fileName = `${dateString}-preSurvey-${msg.id}.csv`
  fs.writeFile(`data/${fileName}`,csvString,logError)
  uploadFile(fileName)
}
// within-period data
const createDataFile = function(subject){
  subject.dataStream = fs.createWriteStream(`data/${dateString}-data-${subject.id}.csv`)
  var csvString = "session,startTime,realEffort,period,practice,id,forced1,forcedScore1,multiplier1,multiplier2,"
  csvString += "choice1,choice2,score1,score2,cost1,cost2,endowment,totalScore,outcomeRandom,winPrize,totalCost,earnings"
  csvString += "\n"
  subject.dataStream.write(csvString)
}
const updateDataFile = function(subject){
  var csvString = ""
  csvString += `${dateString},${subject.startTime},${realEffort*1},${subject.period},`
  csvString += `${1-subject.practicePeriodsComplete},${subject.id},`
  csvString += `${subject.hist[subject.period].forced[1]},${subject.hist[subject.period].forcedScore[1]},`
  csvString += `${subject.hist[subject.period].multiplier[1]},${subject.hist[subject.period].multiplier[2]},`
  csvString += `${subject.hist[subject.period].choice[1]},${subject.hist[subject.period].choice[2]},`    
  csvString += `${subject.hist[subject.period].score[1]},${subject.hist[subject.period].score[2]},`
  csvString += `${subject.hist[subject.period].cost[1]},${subject.hist[subject.period].cost[2]},`
  csvString += `${endowment},${subject.totalScore},${subject.outcomeRandom},`
  csvString += `${subject.winPrize},${subject.totalCost},${subject.earnings},`
  csvString += "\n"
  subject.dataStream.write(csvString)
}
const writePostSurveyFile = function(msg){
  console.log(`WritingPostSurvey ${msg.id}`)
  var csvString = Object.keys(msg).join(",")
  csvString += "\n"
  csvString += Object.values(msg).join(",")
  var logError = (ERR) => { if(ERR) console.log(ERR)}
  const fileName = `${dateString}-postSurvey-${msg.id}.csv`
  fs.writeFile(`data/${fileName}`,csvString,logError)
  uploadFile(fileName)
}
const writePaymentFile = function(subject){
  var csvString = "id,earnings,winPrize\n"
  calculateOutcome()
  csvString += `${subject.id},${subject.earnings.toFixed(2)},${subject.winPrize}\n`
  var logError = (ERR) => { if(ERR) console.log(ERR)}
  const fileName = `${dateString}-payment-${subject.id}.csv`
  fs.writeFile(`data/${fileName}`,csvString,logError)
  uploadFile(fileName)
}

io.on("connection",function(socket){
  socket.emit("connected")
  socket.on("preSurvey", function(msg){
    if(subject.state == "startup") subject.state = "preSurvey"
  })
  socket.on("submitPreSurvey", function(msg){
    const subject = subjects[msg.id]
    writePreSurveyFile(msg) 
    if(subject.state == "preSurvey") {
      subject.preSurveySubmitted = true
      subject.state = "typingPractice"
    }
  })
  socket.on("typingPracticeComplete", function(msg){
    const subject = subjects[msg.id]
    console.log("typingPracticeComplete",msg.id)
    if(subject.state == "typingPractice") {
      subject.typingPracticeComplete = true
      subject.state = "instructions"
    }
  })
  socket.on("beginPracticePeriods", function(msg){
    const subject = subjects[msg.id]
    console.log("beginPracticePeriods",msg.id)
    if(subject.state == "instructions"){
      subject.instructionsComplete = true
      subject.state = "interface"
    }
  })
  socket.on("beginExperiment", function(msg){
    const subject = subjects[msg.id]
    if(subject.practicePeriodsComplete && subject.state == "instructions"){
      subject.experimentStarted = true
      setupHist(subject)
      subject.state = "interface"
    } 
  })
  socket.on("submitPostSurvey", function(msg){
    const subject = subjects[msg.id]
    writePostSurveyFile(msg) 
    if(subject.state == "postSurvey") {
      subject.preSurveySubmitted = true
      subject.state = "experimentComplete"
    }
  })
  socket.on("managerUpdate", function(msg){
    realEffort = msg.realEffort
    preSurveyLock = msg.preSurveyLock
    practiceLock = msg.practiceLock
    var ids = Object.keys(subjects)
    var subjectsArray = Object.values(subjects)
    var subjectsData = subjectsArray.map(subject => {
      return {
        id: subject.id,
        step: subject.step,
        countdown: subject.countdown,
        state: subject.state
      }
    })
    var reply = {
      numSubjects, 
      ids,
      subjectsData
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
      if(subject.period == msg.period && step == msg.step) {
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
        practiceLock,
        period: subject.period,
        state: subject.state,
        experimentStarted: subject.experimentStarted, 
        practicePeriodsComplete: subject.practicePeriodsComplete,
        experimentComplete: subject.experimentComplete,
        numPracticePeriods,
        typingTarget: subject.typingPracticeComplete ? subject.typingTarget : practiceTypingTarget,
        endowment,
        step: subject.step,
        stage: subject.stage,
        countdown: subject.countdown,    
        typingPracticeComplete: subject.typingPracticeComplete,
        outcomePeriod: subject.outcomePeriod,
        outcomeRandom: subject.outcomeRandom,
        winPrize: subject.winPrize,
        totalCost: subject.totalCost,
        earnings: subject.earnings,
        hist: subject.hist,
        cost2Text,
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
    socket.emit("clientJoined",{id: msg.id, hist: subjects[msg.id].hist, period: subjects[msg.id].period})
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
    startTime: getDateString(),
    preSurveySubmitted: false,
    instructionsComplete: false,
    typingPracticeComplete: false,
    experimentStarted: false,
    experimentComplete: false,
    practicePeriodsComplete: false,
    typingTarget: "",
    typingProgress: 0,
    step: 1,
    stage: 1,
    state: "startup",
    period: 1,
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
  createDataFile(subject) 
  console.log(`subject ${id} connected`)
}
const calculateOutcome = function(){
  Object.values(subjects).forEach(subject => {
    const selectedHist = subject.hist[subject.period]
    subject.outcomeRandom = selectedHist.outcomeRandom
    subject.score1 = selectedHist.score[1]
    subject.score2 = selectedHist.score[2]
    subject.totalScore = selectedHist.score[1] + selectedHist.score[2]
    subject.winPrize = (subject.totalScore > selectedHist.outcomeRandom)*1
    subject.totalCost = selectedHist.cost[1]+selectedHist.cost[2]
    subject.earnings = endowment - subject.totalCost*(1-realEffort)
  })
}
const update = function(subject){ //add presurvey
  if(subject.state == "startup" & !preSurveyLock) {
    subject.state = "preSurvey"
  }
  if(subject.state == "preSurvey" & preSurveyLock) {
    subject.state = "startup"
  }
  if(subject.state == "interface"){
    subject.countdown = subject.countdown - 1
    if(subject.step == 1 && subject.countdown <= 0) { // end subject.step1 choice1
        subject.countdown = step2Length
        subject.step = 2  
        console.log("subject.period", subject.id, subject.period)
        console.log("subject.step", subject.id, subject.step)
    }
    if(subject.step == 2 && subject.countdown <= 0) { // end subject.step2 feedback1  
      if(realEffort){
        const currentCost = subject.hist[subject.period].cost[subject.stage]
        const currentLength = Math.round(currentCost*cost2Text)
        subject.typingTarget = genRandomString(currentLength)
        subject.countdown = step3Length
        subject.step = 3
        console.log("subject.step", subject.id, subject.step)
      } else {
        subject.countdown = step4Length
        subject.step = 4
        console.log("subject.step", subject.id, subject.step)    
      }
    }    
    if(subject.step == 3) { // end subject.step3 typingTask1 
      var practiceTimerComplete = !subject.experimentStarted && subject.countdown <= 0
      var typingComplete = subject.experimentStarted && subject.typingProgress==subject.typingTarget.length
      if(typingComplete || practiceTimerComplete){
        subject.countdown = step4Length
        subject.step = 4
        console.log("subject.step", subject.id, subject.step)
      }
    }   
    if(subject.step == 4 && subject.countdown <= 0) { // end subject.step4 choice2
      calculateOutcome()
      if(realEffort){
        const currentCost = subject.hist[subject.period].cost[subject.stage]
        const currentLength = Math.round(currentCost*cost2Text)
        subject.typingTarget = genRandomString(currentLength)
        subject.countdown = step5Length
        subject.step = 5 
        console.log("subject.step", subject.id, subject.step)
      } else {
        subject.countdown = step6Length
        subject.step = 6       
        console.log("subject.step", subject.id, subject.step)
      }
    }
    if(subject.step == 5) { // end subject.step5 typingTask2 
      var feedbackComplete = !subject.experimentStarted && subject.countdown <= 0
      var typingComplete = subject.experimentStarted && subject.typingProgress==subject.typingTarget.length
      if(typingComplete || feedbackComplete){
        subject.countdown = step6Length
        subject.step = 6
        console.log("subject.step", subject.id, subject.step)
      }
    }
    if(subject.step == 6 && subject.countdown <= 0) { // end subject.step6 feedback2
      updateDataFile(subject)          // change to subject-specific
      const maxPeriod = subject.experimentStarted ? numPeriods : numPracticePeriods
      if(subject.period>=maxPeriod){
        if(subject.experimentStarted){
          subject.step = 7
          console.log("subject.period", subject.id, subject.period)
          console.log("subject.step", subject.id, subject.step)
          writePaymentFile(subject)
          subject.dataStream.end()
          subject.experimentComplete = true
          subject.state = "postSurvey"
          console.log("Experiment for Subject", subject.id, "Complete")
        } else{
          console.log(`endPracticePeriods ${subject.id}`)
          subject.state = "instructions"
          subject.practicePeriodsComplete = true
          subject.period = 1
          subject.step = 1
          subject.countdown = step1Length
          console.log("subject.period", subject.id, subject.period)
          console.log("subject.step", subject.id, subject.step)
        }
      } else{
        subject.countdown = step1Length
        subject.period += 1
        subject.step = 1
        console.log("subject.period", subject.id, subject.period)
        console.log("subject.step", subject.id, subject.step)
        } 
    }
    subject.stage = subject.step < 4 ? 1 : 2 
  }
}
const updateSubjects = function(){
  subjectsArray = Object.values(subjects)
  subjectsArray.forEach(subject => update(subject))
}
setInterval(updateSubjects, 1000)