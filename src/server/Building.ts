import Phaser from 'phaser'
import Unit from "./Unit"

export default abstract class Building extends Unit {
  attackCooldown = 0
  attackDamage = 0
  rect: Phaser.Geom.Rectangle

  getAttackDamage(): number {
    return 0
  }

  constructor(public x: number, public y: number, width: number, height: number, public team: string, getRoom: Function) {
    super(getRoom)
    this.rect = new Phaser.Geom.Rectangle(this.x - width / 2, this.y - height / 2, width, height)
  }
}
