import Creature from './Creature'
import Phaser from "phaser"
import BattleScene from "./BattleScene"

export default class Creep extends Creature {
  constructor(
    public team: string,
    public id: string,
    public x: number,
    public y: number,
    scene: BattleScene,
    public neutralType = '',
    public maxHP: number
  ) {
    super(scene)

    this.circle = new Phaser.Geom.Circle(x, y, 25)

    this.bodyGO = scene.physics.add.sprite(x, y, 'empty')
    this.animGO = scene.physics.add.sprite(x, y, 'empty')
    this.animGO.depth = 200
    this.animGO.on('animationcomplete', () => {
      this.animGO.visible = false
    })

    this.hpGO = scene.add.graphics({ x, y })

    this.setInteractive()
    this.updateDirection('down-stay', true)
  }

  getAnimationKeyPrefix() {
    if (this.neutralType)
      return `creep-neutral-${this.neutralType}`
    else
      return `creep-${this.team}`
  }

  fillHPBar() {
    this.hpGO.clear()

    this.hpGO.fillStyle(0x333333)
    this.hpGO.fillRect(0, 0, 40, 4)

    const ratio = this.hp / this.maxHP
    const width = ratio > 0 ? ratio * 40 : 0

    if (width > 0) {
      const color = this.team === this.scene.myPlayer.team ? 0x00ff00 : 0xff0000

      this.hpGO.fillStyle(color)
      this.hpGO.fillRect(0, 0, width, 4)
    }
  }

  setHP(hp: number) {
    this.hp = hp
    this.fillHPBar()
  }

  destroy() {
    this.bodyGO.destroy()
    this.hpGO.destroy()
    this.animGO.destroy()
  }
}