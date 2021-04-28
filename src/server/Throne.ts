import Building from "./Building"
import Tower from './Tower'

export default class Throne extends Building {
  hp: number
  maxHP: number

  endBattle: Function
  towers: Tower[]

  constructor(x: number, y: number, width: number, height: number, team: string, endBattle: Function, towers: Tower[], getRoom: Function) {
    super(x + 75, y + 60, width, height, team, getRoom)

    this.maxHP = 30000
    this.hp = this.maxHP
    this.endBattle = endBattle
    this.towers = towers
  }

  getId() {
    return this.team === 'blue' ? '0' : '1'
  }

  get attackable() {
    const offset = this.team === 'blue' ? 0 : 9

    return (this.towers[0 + offset].hp === 0 && this.towers[1 + offset].hp === 0 && this.towers[2 + offset].hp === 0
    ||
      this.towers[3 + offset].hp === 0 && this.towers[4 + offset].hp === 0 && this.towers[5 + offset].hp === 0
    ||
      this.towers[6 + offset].hp === 0 && this.towers[7 + offset].hp === 0 && this.towers[8 + offset].hp === 0)
  }

  getDamaged(damage: number, damageDealer?: any) {
    if (this.attackable && this.towers.filter(item => item.team !== damageDealer.team && item.hp > 0).length <= 6) {
      super.decreaseHP(damage - 20)

      if (this.hp === 0)
        this.endBattle(damageDealer.team)
    }

    return false
  }

  getAttackSprite(): string {
    return ''
  }

  getAttackDamage(): number {
    return 0
  }
}