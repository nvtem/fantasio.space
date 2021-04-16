import validate from "validate.js";
import {sleep} from "../../common/functions";
import BattleRoom from "../BattleRoom";
import Player from "../Player";
import {Client as ColyseusClient} from "colyseus/lib/transport/Transport";
import {NetMessage} from "../../types";

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  const { team, gameClass } = msg.team

  if (!validate({ team, gameClass }, {
    team: { inclusion: ['blue', 'red'] },
    gameClass: { inclusion: ['warrior', 'assassin', 'mage', 'undead'] }
  })) {
    if (msg.team === player.team || room.totalPlayers() === 1) {
      player.resetAndSpawn(undefined, msg.team, msg.gameClass)
      player.target = { type: 'none' }
    } else {
      if (room.getPlayerCountByTeam(player.team) > room.getPlayerCountByTeam(msg.team)) {
        player.resetAndSpawn(undefined, msg.team, msg.gameClass)
        player.target = { type: 'none' }
        client.send('FOCUS_ON_HERO')
      } else {
        player.client.send('SHOW_MESSAGE', {
          text: 'You cannot change the team because the enemy team has the same or fewer players'
        })

        sleep(3000).then(() => {
          player.client.send('HIDE_MESSAGE')
        })
      }
    }
  }
}