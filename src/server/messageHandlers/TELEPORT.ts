import Player from "../Player";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {NetMessage} from "../../types";
import {sleep} from "../../common/functions";
import _ from "lodash";
import geometry from "../../data/geometry.json";

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  if (player.controlEnabled && player.teleportCooldown === 0) {
    room.broadcast('PLAY_ANIM', {
      type: 'teleport',
      sessionId: client.sessionId,
      rotation: 0
    })

    player.teleportCooldown = 10000

    sleep(2000).then(() => {
      if (Date.now() - player.lastActivityAt >= 2000) {
        let x: number
        let y: number

        const toTower = msg.toTower

        if (toTower > -1) {
          const tower = room.state.towers[toTower]

          if (tower.hp > 0 && tower.team === player.team) {
            x = tower.x + 70
            y = tower.y + 70
          } else {
            return
          }
        } else {
          x = geometry.spawn[player.team].x
          y = geometry.spawn[player.team].y
        }

        room.broadcast('PLAY_CUSTOM_ANIM', {
          x,
          y,
          name: 'teleport-post-effect'
        })

        sleep(400).then(() => {
          room.broadcast('PLAY_CUSTOM_ANIM', {
            x: player.x,
            y: player.y,
            name: 'teleport-post-effect'
          })

          player.setPosition(x, y)
        })
      }
    })
  }
}