import Player from "../Player";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {NetMessage} from "../../types";


export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  const index: number = msg.index

  if ((player.skillLevels[index] < 3 && index < 3) || (index === 3 && player.skillLevels[index] === 0))
    player.increaseSkillLevel(index)
}