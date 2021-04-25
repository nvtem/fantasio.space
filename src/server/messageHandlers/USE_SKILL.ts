import _ from 'lodash'
import Player from "../Player"
import BattleRoom from '../BattleRoom'
import { Client as ColyseusClient } from "colyseus/lib/transport/Transport"
import Phaser from "phaser"
import Polygon from "../Polygon"
import { sleep } from "../../common/functions"
import Creep from "../Creep"
import { NetMessage } from "../../types"
import Unit from '../Unit'

function inLineOfSight(unit1: Unit, unit2: Unit, room: BattleRoom) {
  const line = new Phaser.Geom.Line(unit1.x, unit1.y, unit2.x, unit2.y)
  const intersection = Phaser.Geom.Intersects.GetLineToPolygon(line, room.collisionPolygons)
  const distanceBetweenUnits = Phaser.Math.Distance.Between(unit1.x, unit1.y, unit2.x, unit2.y)

  const intersects =
    intersection
    &&
    Phaser.Math.Distance.Between(unit1.x, unit1.y, intersection.x, intersection.y) <= distanceBetweenUnits

  return !intersects
}

export default function(room: BattleRoom, client: ColyseusClient, msg: NetMessage, player: Player) {
  if (!player.controlEnabled)
    return

  let skill = player.skills.find(s => s.name === msg.name)
  let line: Phaser.Geom.Line

  if (!skill)
    return

  if (skill.currentCooldown === 0) {
    let attackCircle: Phaser.Geom.Circle
    let rotation = msg.rotation

    if (!rotation || rotation < -180 || rotation > 180)
      rotation = 0

    let polygon: Polygon

    const index = player.skills.findIndex(item => item.name === skill.name)
    const skillLevel = player.skillLevels[index]
    const manaCost = skill.manaCost[skillLevel - 1]

    if (player.mana >= manaCost && Date.now() > player.cantUseSkillsUntil && skillLevel > 0) {
      player.lastActivityAt = Date.now()

      if (!player.visible)
        player.visible = true

      let damage = 0

      if (skill.power[skillLevel - 1] && skill.power[skillLevel - 1].damage)
        damage = skill.power[skillLevel - 1].damage

      switch (skill.name) {
        case 'burning':
          attackCircle = new Phaser.Geom.Circle(player.x, player.y, skill.radius)

          room.applyToEnemyCreeps(player.team, (victim: Creep) => {
            if (Phaser.Geom.Intersects.CircleToCircle(attackCircle, victim.circle))
              room.damageUnit(player, victim, damage)
          })

          room.applyToPlayers(room.ENEMIES, player.team, (victim: Player) => {
            if (Phaser.Geom.Intersects.CircleToCircle(attackCircle, victim.circle))
              room.damageUnit(player, victim, damage)
          })

          break

        case 'dash':
          const { x, y } = player

          line = Phaser.Geom.Line.SetToAngle(
            new Phaser.Geom.Line(0,0,0,0),
            x,
            y,
            rotation,
            10000
          )

          const maxDistance = skill.power[skillLevel-1].distance
          const distanceToCollision = room.getDistanceToCollision(line)
          const distance = distanceToCollision < maxDistance ?  distanceToCollision - 20 : maxDistance
          polygon = new Polygon(msg.x1, msg.y1, msg.x2, msg.y2, msg.rotation, skill.animFrameHeight, distance)

          room.applyToPlayers(room.ENEMIES, player.team, async (victim: Player) => {
            if (polygon.intersectsWithCircle(victim.circle))
              await room.damageUnit(player, victim, damage)
          })

          room.applyToEnemyCreeps(player.team, async (victim: Creep) => {
            if (polygon.intersectsWithCircle(victim.circle))
              await room.damageUnit(player, victim, damage)
          })

          line = Phaser.Geom.Line.SetToAngle(
            line,
            x,
            y,
            rotation,
            distance
          )

          const { x2: newX, y2: newY } = line

          player.updateDirection(x, y, newX, newY,true)
          player.setPosition(newX, newY)
          player.target = { type: 'none' }
          player.waypoints = []

          break

        case 'battle-axe':
          polygon = new Polygon(msg.x1, msg.y1, msg.x2, msg.y2, msg.rotation, skill.height, skill.width)

          room.applyToEnemyCreeps(player.team, async (victim: Creep) => {
            if (polygon.intersectsWithCircle(victim.circle) && inLineOfSight(player, victim, room))
              await room.damageUnit(player, victim, damage, skill)
          })

          room.applyToPlayers(room.ENEMIES, player.team, async (victim: Player) => {
            if (polygon.intersectsWithCircle(victim.circle) && inLineOfSight(player, victim, room))
              await room.damageUnit(player, victim, damage, skill)
          })

          break

        case 'warrior-rage':
          player.addEffect('warrior-rage', {
            "attackDamage": skill.power[skillLevel-1].attackDamage
          })

          sleep(skill.power[skillLevel-1].time).then(() => {
            player.removeEffect('warrior-rage')
          })

          rotation = 0
          break

        case 'sprint':
          player.addEffect('sprint', {
            movementSpeed: skill.power[skillLevel-1].movementSpeed
          }, skill.power[skillLevel-1].time)

          rotation = 0
          break

        case 'invisibility':
          player.temporarilyMakeInvisible(skill.power[skillLevel-1].time)
          room.clearAttackingTargets(player.sessionId)

          if (['tower', 'creep', 'player', 'throne'].includes(player.target.type))
            player.target = { type: 'none' }

          rotation = 0
          break

        case 'sharp-blade':
          attackCircle = new Phaser.Geom.Circle(player.x, player.y, skill.radius)

          room.applyToEnemyCreeps(player.team, (victim: Creep) => {
            if (Phaser.Geom.Intersects.CircleToCircle(attackCircle, victim.circle))
              room.damageUnit(player, victim, damage)
          })

          room.applyToPlayers(room.ENEMIES, player.team, (victim: Player) => {
            if (Phaser.Geom.Intersects.CircleToCircle(attackCircle, victim.circle))
              room.damageUnit(player, victim, damage)
          })
          break

        case 'assassin-rage':
          player.addEffect('assassin-rage', {
            "attackCooldown": skill.power[skillLevel-1].attackCooldown,
          }, skill.power[skillLevel-1].time)

          rotation = 0
          break

        case 'fire-wave':
          polygon = new Polygon(msg.x1, msg.y1, msg.x2, msg.y2, msg.rotation, skill.height, skill.width)

          room.applyToEnemyCreeps(player.team, (victim: Creep) => {
            if (polygon.intersectsWithCircle(victim.circle) && inLineOfSight(player, victim, room)) {
              room.damageUnit(player, victim, damage, skill)
            }
          })

          room.applyToPlayers(room.ENEMIES, player.team, (victim: Player) => {
            if (polygon.intersectsWithCircle(victim.circle) && inLineOfSight(player, victim, room)) {
              room.damageUnit(player, victim, damage, skill)
            }
          })

          break

        case 'ice-wave':
          polygon = new Polygon(msg.x1, msg.y1, msg.x2, msg.y2, msg.rotation, skill.height, skill.width)

          room.applyToEnemyCreeps(player.team, (victim: Creep) => {
            if (polygon.intersectsWithCircle(victim.circle) && inLineOfSight(player, victim, room)) {
              room.damageUnit(player, victim, damage, skill)
            }
          })

          room.applyToPlayers(room.ENEMIES, player.team, (victim: Player) => {
            if (polygon.intersectsWithCircle(victim.circle) && inLineOfSight(player, victim, room)) {
              room.damageUnit(player, victim, damage, skill)

              victim.addEffect('ice-wave', {
                movementSpeed: -100
              }, skill.power[skillLevel-1].time)
            }
          })
          break

        case 'magical-blink': {
          const { x, y } = player

          line = Phaser.Geom.Line.SetToAngle(
            new Phaser.Geom.Line(0, 0, 0, 0),
            x,
            y,
            rotation,
            10000
          )

          const maxDistance = 200
          const distanceToCollision = room.getDistanceToCollision(line)
          const distance = distanceToCollision < maxDistance ?  distanceToCollision - 20 : maxDistance

          line = Phaser.Geom.Line.SetToAngle(
            line,
            x,
            y,
            rotation,
            distance
          )

          const { x2: newX, y2: newY } = line

          player.updateDirection(x, y, newX, newY,true)

          player.setPosition(newX, newY)
          player.target = { type: 'none' }
          player.waypoints = []

        } break

        case 'magical-power':
          const skillCircle = new Phaser.Geom.Circle(player.x, player.y, skill.radius)

          room.applyToPlayers(room.ALLIES, player.team, (ally: Player) => {
            if (Phaser.Geom.Intersects.CircleToCircle(skillCircle, ally.circle)) {
              if (player !== ally)
                player.stats.buffs++

              ally.addEffect('magical-power', {
                "attackDamage": skill.power[skillLevel-1].attackDamage,
                "defense": skill.power[skillLevel-1].defense,
                "hpRegen": skill.power[skillLevel-1].hpRegen,
                "manaRegen": skill.power[skillLevel-1].manaRegen,
              }, skill.power[skillLevel-1].time)
            }
          })

          rotation = 0
          break

        case 'hook':
          line = Phaser.Geom.Line.SetToAngle(
            new Phaser.Geom.Line(0, 0, 0, 0),
            player.x,
            player.y,
            rotation,
            10000
          )

          const distanceToCollision2 = room.getDistanceToCollision(line)
          const distance2 = _.min([skill.animFrameWidth / 2, distanceToCollision2])

          line = Phaser.Geom.Line.SetToAngle(
            line,
            player.x,
            player.y,
            rotation,
            distance2
          )

          const victim = (<Player[]> Object.values(room.state.players)).find(p =>
            p.hp > 0 &&
            p.team !== player.team &&
            Phaser.Geom.Intersects.GetLineToCircle(line, p.circle).length > 0
          )

          if (victim) {
            const delay = room.calculateSkillDelay(skill, player, victim)
            sleep(delay).then(() => {
              victim.setPosition(player.x, player.y)
              victim.getDamaged(damage, player)
            })
          }
        break

        case 'saw-blade':
          polygon = new Polygon(msg.x1, msg.y1, msg.x2, msg.y2, msg.rotation, skill.height, skill.width)

          room.applyToEnemyCreeps(player.team, async (victim: Creep) => {
            if (polygon.intersectsWithCircle(victim.circle) && inLineOfSight(player, victim, room))
              await room.damageUnit(player, victim, damage, skill)
          })

          room.applyToPlayers(room.ENEMIES, player.team, async (victim: Player) => {
            if (polygon.intersectsWithCircle(victim.circle))
              await room.damageUnit(player, victim, damage, skill)
          })
          break

        case 'poison':
          const tacts = 5
          damage /= tacts
          for (let i = 0; i < tacts; i++) {
            sleep(i * 300)
              .then(() => {
                if (player.visible) {
                  attackCircle = new Phaser.Geom.Circle(player.x, player.y, skill.radius)

                  player.getDamaged(damage + player.characteristics.total.defense / tacts)

                  room.applyToEnemyCreeps(player.team, (victim: Creep) => {
                    if (Phaser.Geom.Intersects.CircleToCircle(attackCircle, victim.circle))
                      room.damageUnit(player, victim, damage)
                  })

                  room.applyToPlayers(room.ENEMIES, player.team, (victim: Player) => {
                    if (Phaser.Geom.Intersects.CircleToCircle(attackCircle, victim.circle))
                      room.damageUnit(player, victim, damage + victim.characteristics.total.defense / tacts)
                  })
                }
              })
          }

          rotation = 0
          break

        case 'eat-creep':
          attackCircle = new Phaser.Geom.Circle(player.x, player.y, skill.radius)
          const creep = Object.values<Creep>(room.state.creeps).find(c =>
            c.team === player.team
            &&
            Phaser.Geom.Intersects.CircleToCircle(attackCircle, c.circle)
          )

          if (creep) {
            const hp = creep.hp
            creep.decreaseHP(hp)
            if (creep.hp <= 0)
              room.deleteCreep(creep.id)

            player.increaseHP(hp * 2)
          }
          break
      }

      skill.currentCooldown = skill.cooldown[skillLevel - 1]
      player.cantUseSkillsUntil = Date.now() + (skill.numberOfFrames / skill.animFrameRate) * 1000

      room.broadcast('PLAY_ANIM', {
        type: msg.name,
        sessionId: client.sessionId,
        rotation,
        targetType: 'player'
      })
    }
  }
}