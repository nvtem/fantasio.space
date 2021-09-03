import Phaser from 'phaser'
import BattleScene from "./BattleScene"
import Player from './Player'
import _ from 'lodash'

declare const window: any

export default abstract class Creature {
  x: number
  y: number
  hp: number
  maxHP: number
  bodyGO: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  animGO: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  hpGO: Phaser.GameObjects.Graphics
  circle: Phaser.Geom.Circle
  team: string
  direction: string

  constructor(public scene: BattleScene) {
  }

  abstract getAnimationKeyPrefix(): string

  updateDirection(direction: string, force = false) {
    if (direction !== this.direction || force) {
      this.direction = direction
      this.bodyGO.anims.play(`${this.getAnimationKeyPrefix()}-${direction}`)
    }
  }

  setInteractive() {
    if (this.type !== 'neutral' && this.scene.myPlayer.team === this.team)
      this.bodyGO.setInteractive({ cursor: 'url(/images/pointer.png), pointer' })
    else
      this.bodyGO.setInteractive({ cursor: 'url(/images/pointer-red.png), pointer' })
  }

  get type() {
    return this.constructor.name.toLowerCase()
  }

  setPosition(x: number, y: number) {
    this.x = x
    this.y = y

    this.circle.setPosition(x, y)

    if (document.hasFocus() || Date.now() - this.scene.startedAt < 10000) {
      this.scene.add.tween({
        targets: [this.bodyGO, this.animGO],
        duration: 50,
        x,
        y
      })

      this.scene.add.tween({
        targets: this.hpGO,
        duration: 50,
        // @ts-ignore
        x: this.skills ? x - 32 : x - 20,
        // @ts-ignore
        y: this.skills ? y - 42 : y - 35
      })

      // @ts-ignore
      if (this.skills) {
        this.scene.add.tween({
          // @ts-ignore
          targets: this.nameGO,
          duration: 50,
          x,
          y: y - 55
        })
      }

      if (_.get(this, 'attachedEffectGO')) {
        this.scene.add.tween({
          targets: _.get(this, 'attachedEffectGO'),
          duration: 50,
          x,
          y: y - 70
        })
      }
    }
  }

  playAnim(type: string, rotation: number) {
    if (document.hasFocus() || Date.now() - this.scene.startedAt < 10000) {
      this.animGO.rotation = rotation
      this.animGO.play(type)
      this.animGO.visible = true
    }
  }
}