import Player from "../Player";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {sleep} from "../../common/functions";
import _ from "lodash";
import geometry from "../../data/geometry.json";
import items from '../../data/items.json'
import {NetMessage} from "../../types";

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  const index = msg.index

  if (player.items[index] && player.items[index].usable) {
    const itemName = player.items[index].name
    const item = items[itemName]
    player.items.splice(index, 1)

    switch (itemName) {
      case 'health-potion':
        player.increaseHP(item.power.hp)
        break

      case 'mana-potion':
        player.increaseMana(item.power.mana)
        break

      case 'defense-potion':
      case 'attack-damage-potion':
        player.addEffect(itemName, _.omit(item.effect, 'time'))

        sleep(item.effect.time).then(() => {
          player.removeEffect(itemName)
        })
        break

      case 'teleportation-scroll':
        sleep(2000).then(() => {
          if (Date.now() - player.lastActivityAt >= 2000) {
            const {x, y} = _.get(geometry.spawn, player.team)
            player.setPosition(x, y)
            client.send('FOCUS_ON_HERO')
          }
        })
        break
    }

    player.client.send('PLAY_ANIM', {
      type: itemName,
      sessionId: client.sessionId,
      rotation: 0,
      targetType: 'player'
    })

    if (!player.visible)
      player.visible = true
  }
}