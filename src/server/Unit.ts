import Player from "./Player"
import Phaser from "phaser"
import Creep from "./Creep"
import _ from "lodash"
import Tower from './Tower'

export default abstract class Unit {
  visible = true
  team: string
  x = 0
  y = 0
  hp = 0
  attackRange = 0
  index: number
  type: string
  attackDamage = 0
  attackCooldown = 0
  target: {
    type: 'player' | 'creep' | 'tower' | 'throne' | 'point' | 'point-attack' | 'stay-attack' | 'none'
    id?: string,
    x?: number,
    y?: number
  } = { type: 'none' }

  abstract getId(): string
  abstract getAttackDamage(): number
  abstract getDamaged(damage: number, damageDealer?: Unit): boolean
  abstract getAttackSprite(): string

  step() {}
  moveTo(x: number, y: number) {}

  constructor(public getRoom: Function) {
    this.type = this.constructor.name.toLowerCase()
  }

  updateDirection(oldX: number, oldY: number, newX: number, newY: number, stay: boolean) {}

  getAttackCooldown() {
    return 0
  }

  handleTick(timeDelta: number) {
    this.decreaseAttackCooldown(timeDelta)

    const { type: targetType, id: targetId } = this.target

    switch (targetType) {
      case 'stay-attack':
      case 'point-attack':
        // пройтись по вражеским игрокам и записать дистанции до них
        let distances: any[] = Object.values<Player>(this.getRoom().state.players)
          .filter((player: Player) => player.team !== this.team && player.isAlive && player.visible)
          .map((player: Player) => {
            return {
              distance: Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y),
              type: 'player',
              obj: player
            }
          })

        // пройтись по вражеским крипам и записать дистанции до них
        distances = distances.concat((Object.values<Creep>(this.getRoom().state.creeps))
          .filter((creep: Creep) => this.team !== creep.team)
          .map((creep: Creep) => {
            return {
              distance: Phaser.Math.Distance.Between(this.x, this.y, creep.x, creep.y),
              type: 'creep',
              obj: creep
            }
          }))

        // пройтись по вражеским башням и записать дистанции до них
        distances = distances.concat(this.getRoom().state.towers
          .filter((tower: Tower) => this.team !== tower.team && tower.hp > 0)
          .map((tower: Tower) => {
            return {
              distance: Phaser.Math.Distance.Between(this.x, this.y, tower.x, tower.y),
              type: 'tower',
              obj: tower
            }
          }))

        // добавить вражеский трон
        const throne = this.getRoom().state.thrones[this.team === 'blue' ? 1 : 0]

        distances.push({
          distance: Phaser.Math.Distance.Between(this.x, this.y, throne.x, throne.y),
          type: 'throne',
          obj: throne
        })

        // убрать тех кто слишком далеко
        distances = distances.filter((item: any) => item.distance < this.attackRange)

        // найти ближайшего врага
        let closestEnemy
        const thereIsCreepInRange = distances.some((creature: Unit) => creature.type === 'creep')

        // есть крип в радиусе
        if (thereIsCreepInRange && (this.type === 'tower' || this.type === 'creep'))
          // ищем только среди крипов
          closestEnemy = <any>_.minBy(distances.filter((item: Unit) => item.type === 'creep'), 'distance')
        else
          // ищем среди всех
          closestEnemy = <any>_.minBy(distances, 'distance')

        if (closestEnemy) {
          if (this.attackCooldown === 0) {
            const enemy = closestEnemy.obj

            const angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y)

            if (!this.visible)
              this.visible = true

            this.getRoom().createProjectile({
              owner: {
                type: this.type,
                id: this.getId()
              },
              victim: {
                type: enemy.type,
                id: enemy.getId()
              },
              team: this.team,
              x: this.x + (this.type === 'tower' ? 15 : 0),
              y: this.y + (this.type === 'tower' ? 15 : 0),
              type: this.getAttackSprite(),
              damage: this.getAttackDamage(),
              rotation: angle
            })

            this.attackCooldown = this.getAttackCooldown()
            this.updateDirection(this.x, this.y, enemy.x, enemy.y, true)

            // this.getRoom().broadcast('PLAY_SOUND_EFFECT', {
            //   name: 'basic-fire-attack',
            //   x: this.x,
            //   y: this.y
            // })
          }
        } else if (targetType === "point-attack") {
          this.step()
        }
        break

      case 'point':
        this.step()
        break

      case 'player':
      case 'creep':
      case 'tower':
      case 'throne':
        const enemy = this.getRoom().state[targetType + 's'][targetId]

        if (!enemy) {
          this.target = { type: 'none' }
          break
        }

        // если изменились координаты врага, то проложить путь до него заново
        if (enemy.x !== this.target.x || enemy.y !== this.target.y) {
          this.target.x = enemy.x
          this.target.y = enemy.y
          this.moveTo(enemy.x, enemy.y)
        }

        const distanceBetweenUnits = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y)
        const enemyInRange = distanceBetweenUnits  < this.attackRange

        if (enemyInRange) {
          const attackLine = new Phaser.Geom.Line(this.x, this.y, enemy.x, enemy.y)
          const intersection = Phaser.Geom.Intersects.GetLineToPolygon(attackLine, this.getRoom().collisionPolygons)

          if (!intersection || Phaser.Math.Distance.Between(this.x, this.y, intersection.x, intersection.y) >= distanceBetweenUnits) {
            if (this.attackCooldown === 0) {
              const angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y)

              if (!this.visible)
                this.visible = true

              this.getRoom().createProjectile({
                owner: {
                  type: this.type,
                  id: this.getId()
                },
                victim: {
                  type: enemy.type,
                  id: enemy.getId()
                },
                team: this.team,
                x: this.x,
                y: this.y,
                type: this.getAttackSprite(),
                damage: this.getAttackDamage(),
                rotation: angle
              })

              this.attackCooldown = this.getAttackCooldown()
              this.updateDirection(this.x, this.y, enemy.x, enemy.y, true)

              // this.getRoom().broadcast('PLAY_SOUND_EFFECT', {
              //   name: 'basic-fire-attack',
              //   x: this.x,
              //   y: this.y
              // })
            }
          } else {
            this.step()
          }
        } else {
          this.step()
        }

        break
    }

    if (this.type === 'player' && _.get(this, 'waypoints').length > 0)
      _.set(this, 'lastActivityAt', Date.now())
  }

  decreaseAttackCooldown(timeDelta: number) {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= timeDelta
      if (this.attackCooldown < 0)
        this.attackCooldown = 0
    }
  }

  decreaseHP(hp: number) {
    this.hp -= hp

    if (this.hp < 0)
      this.hp = 0
  }
}