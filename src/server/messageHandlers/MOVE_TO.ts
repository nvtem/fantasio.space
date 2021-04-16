import Player from "../Player";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {NetMessage} from "../../types";

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  const { x, y } = msg

  if (
    player.controlEnabled
    &&
    (x >= 0 && x <= 3200)
    &&
    (y >= 0 && y <= 3200)
  ) {
    player.target = {
      type: msg.attack ? 'point-attack' : 'point',
    }

    player.moveTo(msg.x, msg.y)
  }
}