import fs from 'fs'
import checkAccessHash from "./checkAccessHash"
import bodyParser from 'body-parser'
import '@geckos.io/phaser-on-nodejs'
import express from 'express'
import mongodb from "mongodb"
import { Server as ColyseusServer } from 'colyseus'
import cors from 'cors'
import path from 'path'
import BattleRoom from './BattleRoom'
import Model from "./Model"
import PlayerModel from "./PlayerModel"
import notifier from 'node-notifier'
import http from 'http'
import https from 'https'
require('dotenv').config()
const bodyParserJson = bodyParser.json()

function generateRandomString(length: number): string {
  var result: string           = '';
  var characters: string       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength: number = characters.length;
  for (var i: number = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const isProduction = process.env.NODE_ENV === 'production'

const colyseusPort = isProduction ? 500 : 1500
const APIAndStaticPort = isProduction ? 443 : 1443
const startStatic = isProduction

const gameApp = express()

gameApp.use(cors());
gameApp.use(express.json());

const SSLOptions = isProduction
  ? {
      key: fs.readFileSync(path.resolve('./src/server', 'private.key')),
      cert: fs.readFileSync(path.resolve('./src/server', 'certificate.crt')),
      ca: fs.readFileSync(path.resolve('./src/server', 'ca_bundle.crt'))
    }
  : {}

const colyseusWebServer = isProduction
  ? https.createServer(SSLOptions, gameApp)
  : http.createServer(gameApp)

const gameServer: ColyseusServer = new ColyseusServer({
  server: colyseusWebServer
})

gameServer.define('battle', BattleRoom)
gameServer.listen(colyseusPort);

let protocol = isProduction ? 'HTTPS' : 'HTTP'
console.log(`Colyseus ${protocol}: ${colyseusPort}`)

protocol = isProduction ? 'WSS' : 'WS'
console.log(`Colyseus ${protocol}: ${colyseusPort}`)

const httpApp = express()

httpApp.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization");
  next()
})

if (startStatic)
  httpApp.use(express.static(path.join('./src/server', '../../dist')))

const mongoClientOptions: mongodb.MongoClientOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true
}

const mongoDBUrl = isProduction ? process.env.DB_URL_PROD : process.env.DB_URL_DEV
const mongoClient = new mongodb.MongoClient(mongoDBUrl, mongoClientOptions)

mongoClient.connect((err, client) => {
  Model.setDB(client.db('fantasio-space'))

  httpApp.use(bodyParserJson)

  httpApp.get(/^\/player\/getTopPlayers$/, async (req, res) => {
    const players = await PlayerModel.findManyByParams({}, 30, { field: 'points', direction: -1 })
    let players2 = []

    for (const [index, player] of players.entries()) {
      let crown

      if (index === 0)
        crown = 'draconic'
      else if (index === 1)
        crown = 'amethyst'
      else if (index === 2)
        crown = 'diamond'
      else if (index >= 3 && index <= 9)
        crown = 'gold'
      else if (index >= 10 && index <= 19)
        crown = 'silver'
      else if (index >= 20 && index <= 29)
        crown = 'bronze'

      players2.push({
        name: player.name,
        crown,
        points: player.points
      })
    }

    res.json({
      players: players2
    })

  })

  httpApp.get('/player/:name', async (req, res) => {
    const player = await PlayerModel.findOneByParams({ name: req.params.name })

    if (player) {
      res.send({
        player: {
          name: player.data.name,
          points: player.data.points
        }
      })
      return
    }
  })

  httpApp.post('/player/:name/checkAccessHash', async (req, res) => {
    if (await checkAccessHash(req.params.name, req.body.accessHash)) {
      res.send({
        success: true,
      })
      return
    } else {
      res.send({
        success: false,
      })
      return
    }
  })

  httpApp.post('/player/register', async (req, res) => {
    const name = req.body.name ? req.body.name.trim() : ''

    if (name) {
      let player = await PlayerModel.findOneByParams({ name })

      if (player) {
        res.json({
          message: 'User with that name already exists',
          success: false
        })
        return
      } else {
        if (name.length > 20) {
          res.json({
            message: 'Max 20 characters',
            success: false
          })
          return
        } else if (name.length < 2) {
          res.json({
            message: 'Min 2 characters',
            success: false
          })
          return
        } else {
          const accessHash = generateRandomString(16)

          await PlayerModel.create({
            name,
            accessHash,
            points: 0,
            visible: true
          })

          res.json({
            success: true,
            accessHash
          })
          return
        }
      }
    } else {
      res.json({
        message: 'Name cannot be empty',
        success: false
      })
      return
    }
  })

  const APIAndStaticWebServer = isProduction
    ? https.createServer(SSLOptions, httpApp)
    : http.createServer(httpApp)

  APIAndStaticWebServer.listen(APIAndStaticPort, () => {
    const protocol = isProduction ? 'HTTPS' : 'HTTP'
    console.log(`API ${protocol}: ${APIAndStaticPort}`)

    if (startStatic)
      console.log(`Static ${protocol}: ${APIAndStaticPort}`)
    else
      console.log('Static HTTP: 1000')

    console.log('-'.repeat(20))
    console.log("Server Started!\n")
  })

  notifier.notify({
    message: 'Server started',
    sound: false
  })

  if (isProduction) {
    const webServer80 = express()

    webServer80.get('*', (req, res) => {
      res.redirect('https://' + req.headers.host)
    })

    webServer80.listen(80)
  }
})