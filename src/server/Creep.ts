import Creature from './Creature'
import _ from "lodash";
import Phaser from "phaser";
import skills from "../data/skills.json";
import BattleRoom from "./BattleRoom";
import Unit from "./Unit";
import Player from "./Player";

export default class Creep extends Creature {
  attackRange: number
  attackDamage: number
  movementSpeed: number
  maxHP: number
  defense: number
  spawnTimeout: number
  attackSprite: string
  neutralType = ''
  baseAttackCooldown: number

  constructor(
    public id: string,
    public team: string,
    public x: number,
    public y: number,
    public waypoints: number[][],
    getRoom: Function,
    hp?: number,
    attackDamage?: number,
    attackCooldown?: number,
    attackRange?: number,
    defense?: number,
    spawnTimeout?: number,
    attackSprite?: string,
    neutralType?: string,
    direction?: string
  ) {
    super(getRoom)

    if (team === 'neutral') {
      this.attackRange = 200
      this.attackDamage = attackDamage
      this.movementSpeed = 0
      this.maxHP = this.hp = hp
      this.defense = defense
      this.spawnTimeout = spawnTimeout
      this.target = { type: 'stay-attack' }
      this.baseAttackCooldown = attackCooldown
      this.attackSprite = attackSprite
      this.neutralType = neutralType
    } else {
      this.attackRange = 200
      this.attackDamage = 100
      this.movementSpeed = 120
      this.maxHP = this.hp = 600
      this.defense = 5
      this.spawnTimeout = 0
      this.target = { type: 'point-attack' }
      this.baseAttackCooldown = 1000
      this.attackSprite = 'projectile-fire'
      this.neutralType = ''
    }

    this.direction = direction || 'down-stay'
    this.circle = new Phaser.Geom.Circle(x, y, 25)
  }

  getAttackCooldown() {
    return this.baseAttackCooldown
  }

  getId() {
    return this.id
  }

  getAttackSprite(): string {
    return this.attackSprite
  }

  setPosition(x: number, y: number) {
    this.x = x
    this.y = y
    this.circle.setPosition(x, y)
  }

  getDamaged(damage: number, damageDealer?: Unit, addTotalDamageStat = true) {
    const realDamage = damage - this.defense

    if (damageDealer && damageDealer.type === 'player' && addTotalDamageStat)
      (damageDealer as Player).stats.totalDamage += realDamage

    this.hp -= realDamage
    if (this.hp < 0)
      this.hp = 0

    return this.hp > 0
  }

  getAttackDamage(): number {
    return this.attackDamage
  }

  getMovementSpeed(): number {
    return this.movementSpeed
  }
}