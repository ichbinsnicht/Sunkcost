import path from 'path'
import express from 'express'
import http from 'http'
import https from 'https'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const app = express()

const configPath = path.join(dirname, 'config.json')
const configExists = fs.existsSync(configPath)
const config = configExists ? fs.readJSONSync(configPath) : {}
if (!configExists) {
  config.port = 3000
  config.secure = false
}
const server = config.secure ? makeSecureServer() : http.Server(app)

function makeSecureServer () {
  const key = fs.readFileSync('./_.trialparticipation.com_private_key.key')
  const cert = fs.readFileSync('./trialparticipation.com_ssl_certificate.cer')
  const credentials = { key, cert }
  return new https.Server(credentials, app)
}
console.log(config)

export const io = new Server(server)

server.listen(config.port, function () {
  console.log(`listening on port ${config.port}`)
})

app.use(express.static(path.join(dirname, 'public')))

app.get('/socketIo/:fileName', function (req, res) {
  res.sendFile(path.join(dirname, 'node_modules', 'socket.io', 'client-dist', req.params.fileName))
})
app.get('/manager', function (req, res) {
  res.sendFile(path.join(dirname, '/public/manager.html'))
})

app.get('/', function (req, res) {
  res.sendFile(path.join(dirname, '/public/client.html'))
})
