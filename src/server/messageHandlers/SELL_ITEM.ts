import Player from "../Player";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {pointInRectangle} from "../../common/functions";
import _ from "lodash";
import safeZones from "../safeZones";
import {NetMessage} from "../../types";

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  const index = msg.index

  if (pointInRectangle(player.x, player.y, safeZones[player.team]) && Object.values(player.items)[index])
    player.sellItem(index)
}