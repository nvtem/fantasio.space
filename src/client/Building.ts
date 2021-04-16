import Phaser from 'phaser'
import BattleScene from "./BattleScene"
import Player from "./Player";

export default class Building {
  hp: number = 0
  maxHP: number = 0
  rect: Phaser.Geom.Rectangle
  team: string

  bodyGO: Phaser.Physics.Arcade.Sprite = {} as Phaser.Physics.Arcade.Sprite
  hpGO: Phaser.GameObjects.Graphics = {} as Phaser.GameObjects.Graphics
  animGO: Phaser.Physics.Arcade.Sprite

  constructor(public spriteName: string,
              public scene: BattleScene,
              public staticGroup: Phaser.Physics.Arcade.StaticGroup,
              public x: number,
              public y: number,
              public myPlayer: Player = undefined
              ) {

    this.animGO = scene.physics.add.sprite(x, y, 'empty')
    this.animGO.depth = 201

    this.animGO.on('animationcomplete', () =>
      this.animGO.visible = false
    )

    this.setInteractive()
  }

  setInteractive() {
    if (this.bodyGO.x) {
      if (this.scene.myPlayer.team === this.team)
        this.bodyGO.setInteractive({cursor: 'url(/images/pointer.png), pointer'})
      else
        this.bodyGO.setInteractive({cursor: 'url(/images/pointer-red.png), pointer'})
    }
  }

  get type() {
    return this.constructor.name.toLowerCase()
  }

  destroy() {
    this.bodyGO.destroy()
    this.hpGO.destroy()
    this.animGO.anims.stop()
    this.animGO.visible = false
  }

  fillHPBar(hp = this.hp) {
    this.hpGO.clear()

    this.hpGO.fillStyle(0x222222)
    this.hpGO.fillRect(0, 0, 54, 10)

    this.hpGO.fillStyle(0x666666)
    this.hpGO.fillRect(2, 2, 50, 6)

    const width = hp > 0 ? (hp / this.maxHP) * 50 : 0
    if (width > 0) {
      let color = (this.maxHP === 10000 && this.team === this.myPlayer.team) ? 0x00ff00 : 0xff0000

      if (this.maxHP === 30000)
        color = 0x00ff00//0xff4df0

      this.hpGO.fillStyle(color)
      this.hpGO.fillRect(2, 2, width, 6)
    }
  }

  updateHP(hp: number, force = false) {
    if (hp !== this.hp || force) {
      if (hp > 0 && this.hp === 0) {
        // создание игровых объектов строения
        this.bodyGO = this.staticGroup.create(this.x, this.y, this.spriteName)
        this.bodyGO.setOrigin(0, 0)
        this.bodyGO.depth = 201
        this.hpGO = this.scene.add.graphics({ x: this.x, y: this.y })
        // this.hpGO.fillStyle(0x222222)
        // this.hpGO.fillRect(0, 0, 54, 10)
        this.hpGO.depth = 202

        let x: number, y: number

        if (this.maxHP === 10000) {
          x = this.bodyGO.x - 10
          y = this.bodyGO.y - 10
        } else {
          x = this.bodyGO.x + 50
          y = this.bodyGO.y + 10
        }

        this.hpGO.setPosition(x, y)

        this.fillHPBar(hp)
        this.setInteractive()

        // this.animGO.visible = true
      } else if (hp === 0 && this.hp > 0) {
        this.destroy()
      } else {
        this.fillHPBar(hp)
      }

      this.hp = hp
    }
  }
}