import Player from "../Player";
import BattleRoom from '../BattleRoom'
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import _ from "lodash";
import items from "../../data/items.json";
import type {NetMessage, Item} from "../../types"

function hasArrayValue(arr: any[], value: any) {
  for (const item of arr)
    if (_.isEqual(item, value))
      return true

  return false
}

function hasPlayerItemSameType(player: Player, item: Item) {
  return player.items.some(i => {
    return i.name.substr(0, i.name.length - 1) === item.name.substr(0, item.name.length - 1)
  })
}

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  const item = items[msg.name]

  if (item && player.items.length < 4 && player.money >= item.cost && !hasPlayerItemSameType(player, item))
    player.buyItem(item)
}