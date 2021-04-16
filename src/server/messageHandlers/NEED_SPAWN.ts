import Player from "../Player";
import PlayerModel from "../PlayerModel";
import Model from "../Model";
import _ from "lodash";
import {sleep} from "../../common/functions";
import Creep from "../Creep";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {NetMessage} from "../../types";

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  if (msg.name === '')
    return

  let name = msg.name
  let accessHash = msg.accessHash

  if (name === 'guest') {
    spawnPlayer(room, client, msg, player, 'guest')
  } else {
    PlayerModel.findOneByParams({
      name, accessHash
    }).then(async (playerDB: Model) => {
      if (playerDB) {
        const crown = await room.getPlayerCrown(name)
        // проверяем, что нет игрока с таким именем
        if (!(<Player[]>Object.values(room.state.players)).some(p => p.name === msg.name))
          spawnPlayer(room, client, msg, player, name, crown)
      }
    })
  }
}

function spawnPlayer(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player, name: string, crown = '') {
  const blueTeamPlayerCount = room.getPlayerCountByTeam('blue')
  const redTeamPlayerCount = room.getPlayerCountByTeam('red')

  let team

  if (blueTeamPlayerCount < redTeamPlayerCount)
    team = 'blue'
  else if (redTeamPlayerCount < blueTeamPlayerCount)
    team = 'red'
  else
    team = ['blue', 'red'][_.random(0, 1)]

  const gameClass = ['warrior', 'assassin', 'mage', 'undead'][_.random(0, 2)]


  if (name === 'guest')
    name = `guest_${room.lastGuestNo++}`

  const newPlayer = room.state.players[client.sessionId] = new Player(
    name,
    gameClass,
    team,
    crown,
    client.sessionId,
    client,
    room.broadcast.bind(room),
    room.getPlayerById.bind(room),
    room.pfFinder,
    room.getPfGridClone.bind(room),
    room.getRoom.bind(room)
  )

  client.send('SPAWN', { x: newPlayer.x, y: newPlayer.y, playerState: newPlayer })

  room.broadcast('CREATE_PLAYER', {
    sessionId: client.sessionId,
    team,
    gameClass
  }, {
    except: client
  })

  console.log(`${newPlayer.name} joined`)

  room.broadcastChatMessage({
    team: 'system',
    author: 'game',
    text: `${newPlayer.name} joined`,
  })

  for (const player of Object.values<Player>(room.state.players)) {
    if (player.sessionId !== client.sessionId) {
      client.send('CREATE_PLAYER', {
        sessionId: player.sessionId,
        team: player.team,
        gameClass: player.gameClass
      })
    }
  }

  for (const [id, creep] of Object.entries<Creep>(room.state.creeps)) {
    const msg: any = {
      id,
      team: creep.team,
      x: creep.x,
      y: creep.y,
      maxHP: creep.maxHP
    }

    if (creep.neutralType)
      msg.neutralType = creep.neutralType

    client.send('CREATE_CREEP', msg)
  }

  for (const id in room.state.runes)
    client.send('CREATE_RUNE', { ...room.state.runes[id], id })
}

