import validate from "validate.js";
import BattleRoom from "../BattleRoom";
import Player from "../Player";
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {NetMessage} from "../../types";

const isProd = process.env.NODE_ENV === 'production'

const levelExpRequirements = [0,
  0, // для достижения 1-го уровня
  115, // 2-го
  185,
  240,
  290,
  300,
  360,
  375,
  445,
  465,
]

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  const text = msg.text

  if (!validate({ text }, { text: { length: { minimum: 1 } } })) {
    if (text === '/lu' && player.level < 10) {
      player.increaseLevelByOne()
      player.needExpToNextLevel = player.level < 10 ? levelExpRequirements[player.level + 1] : 9999
    } else if (text === '/l10') {
      Array.from(Array(10 - player.level)).map(() => {
        player.increaseLevelByOne()
        player.needExpToNextLevel = player.level < 10 ? levelExpRequirements[player.level + 1] : 9999
      })
    } else if (text === '/ad_finish') {
      room.endBattle(player.team)
    } else {
      room.broadcastChatMessage({
        team: player.team,
        author: player.name,
        text,
        crown: player.crown,
        forTeam: msg.forTeam,
      })
    }
  }
}