import '@geckos.io/phaser-on-nodejs'
import Building from './Building'
import Phaser from 'phaser'
import Player from './Player'
import Unit from "./Unit";

export default class Tower extends Building {
  maxHP = 10000

  attackCircle: Phaser.Geom.Circle
  hp: number
  team: string

  attackRange = 250
  attackDamage = 300
  attackCooldown = 1300

  constructor(public indexX: number, public indexY: number, width: number, height: number, attackRange: number, team: string, getRoom: Function, public index: number) {
    super(indexX * 32, (indexY - 2)  * 32, width, height, team, getRoom)

    this.hp = this.maxHP
    this.team = team

    // this.attackCircle = new Phaser.Geom.Circle(
    //   indexX * 32,
    //   indexY * 32,
    //   attackRange,
    // )

    this.target = { type: 'stay-attack' }
  }

  getAttackCooldown() {
    return 1300
  }

  getAttackSprite(): string {
    return `projectile-${this.team}-tower`
  }

  getId() {
    return this.index.toString()
  }

  getDamaged(damage: number, damageDealer?: Unit) {
    const realDamage = damage - 20
    super.decreaseHP(realDamage)

    if (damageDealer && damageDealer.type === 'player') {
      const _damageDealer = damageDealer as Player

      _damageDealer.stats.totalDamage += realDamage

      if (this.hp === 0) {
        _damageDealer.money += 100
        _damageDealer.stats.destroyedTowers++

        this.getRoom().pfGrid.setWalkableAt(this.indexX, this.indexY, true)
      }
    }

    return this.hp > 0
  }

  getAttackDamage(): number {
    return this.attackDamage
  }
}