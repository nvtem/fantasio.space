import { Client as ColyseusClient } from "colyseus/lib/transport/Transport";
import BattleRoom from './BattleRoom'
import {NetMessage} from "../types";

const messageHandlers = {}

const messageTypes = [
  'BUY_ITEM',
  'CHANGE_TEAM_AND_CLASS',
  'INCREASE_SKILL_LEVEL',
  'MOVE_TO',
  'NEED_SPAWN',
  'SELL_ITEM',
  'SEND_MESSAGE',
  'SET_TARGET',
  'USE_ITEM',
  'USE_SKILL'
]

;(async function unnamed() {
  for (const funcName of messageTypes) {
    messageHandlers[funcName] = (await import(`./messageHandlers/${funcName}.ts`)).default
  }
})()

export default async function (room: BattleRoom, client: ColyseusClient, type: string | number, msg: NetMessage) {
  const player = room.state.players[client.sessionId]

  if ((!room.battleInProgress || (player && !player.isAlive)) && type !== 'SEND_MESSAGE' && type !== 'NEED_SPAWN')
    return

  messageHandlers[type](room, client, msg, player)
}

