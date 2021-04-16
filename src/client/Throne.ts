import Building from "./Building";
import Phaser from "phaser";
import BattleScene from './BattleScene'
import geometry from '../data/geometry.json'

export default class Throne extends Building {
  maxHP = 30000

  constructor(scene: BattleScene, staticGroup: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, public team: string) {
    super('throne', scene, staticGroup, x, y)
    this.rect = new Phaser.Geom.Rectangle(x, y, geometry.thrones.width, geometry.thrones.height)
  }
}