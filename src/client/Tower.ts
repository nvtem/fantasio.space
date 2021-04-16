import Building from "./Building";
import Phaser from 'phaser'
import BattleScene from "./BattleScene"
import Player from './Player'

export default class Tower extends Building {
  maxHP = 10000

  constructor(
    scene: BattleScene,
    staticGroup: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    public team: string,
    public myPlayer: Player
  ) {
    super(team + '-tower', scene, staticGroup, x, y, myPlayer)
    this.rect = new Phaser.Geom.Rectangle(x, y, 32, 96)
  }

  playAttackAnim(rotation: number) {
    this.animGO.visible = true
    this.animGO.rotation = rotation
    //this.animGO.anims.play('basic-fire-attack')
  }
}