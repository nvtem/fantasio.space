import Player from "../Player";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {NetMessage} from "../../types";

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  if (player.controlEnabled) {
    const { type, id } = msg
    const enemy = room.state[type + 's'][id]

    if (enemy) {
      player.lastActivityAt = Date.now()

      player.target = {
        type,
        id,
        x: enemy.x,
        y: enemy.y
      }

      player.moveTo(enemy.x, enemy.y)
    }
  }
}