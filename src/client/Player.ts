import _ from 'lodash'
import Phaser from "phaser";
import * as colyseus from 'colyseus.js'
import type { Skill, Item } from "../types"
import Creature from './Creature'
import BattleScene from './BattleScene'

export default class Player extends Creature {
  room: colyseus.Room
  nameGO: Phaser.GameObjects.Text
  mana = 0
  money = 0
  kills = 0
  deaths = 0
  maxHP = 0
  maxMana = 0
  attackSpeed = 0
  damage = 0
  movementSpeed = 0
  hpRegen = 0
  manaRegen = 0
  defense = 0
  name = ''
  controlEnabled = true
  my: boolean
  myPlayer: Player
  canBuyItems = false
  skills: Skill[]
  items: Item[] = []
  team = ''
  gameClass = ''
  freeSkillPoints = 0
  skillLevels: number[]

  target = {
    type: '',
    id: ''
  }

  characteristics: any
  attachedEffectGO: Phaser.GameObjects.Sprite
  level: number

  constructor(scene: BattleScene,
              room: colyseus.Room,
              my: boolean = false,
              team: string,
              gameClass: string,
              myPlayer?: Player) {

    super(scene)

    this.circle = new Phaser.Geom.Circle(this.x, this.y, 25)

    this.myPlayer = myPlayer

    this.bodyGO = scene.physics.add.sprite(this.x, this.y, 'empty')
    this.animGO = scene.physics.add.sprite(this.x, this.y, 'empty')
    this.animGO.depth = 500
    this.nameGO = scene.add.text(this.x, this.y, '?', { color: '#fff', stroke: '#111', strokeThickness: 5 }).setOrigin(0.5)
    this.animGO.on('animationcomplete', () => {
      this.animGO.visible = false
    })

    this.hpGO = scene.add.graphics({ x: this.x, y: this.y })
    this.hpGO.fillStyle(0x222222)
    this.hpGO.fillRect(0, 0, 64, 10)
    this.room = room
    this.skills = []
    this.my = my

    if (this.my) {
      this.my = my
      this.bodyGO.depth = 101
      this.hpGO.depth = 402
      this.nameGO.depth = 403
      this.bodyGO.setCollideWorldBounds(true)
      this.bodyGO.body.setSize(20, 20)
    } else {
      this.bodyGO.setInteractive({ cursor: 'url(/images/pointer-red.png), pointer' })
    }
  }

  getAnimationKeyPrefix() {
    return `${this.gameClass}`
  }

  moveTo(x: number, y: number, attack = false) {
    this.room.send('MOVE_TO', { x, y, attack })
  }

  destroy() {
    this.bodyGO.destroy()
    this.hpGO.destroy()
    this.animGO.destroy()
    this.nameGO.destroy()
  }

  setAlpha(alpha: number) {
    this.bodyGO.alpha = this.hpGO.alpha = this.nameGO.alpha = this.animGO.alpha = alpha
  }

  get visible() {
    return this.bodyGO.alpha > 0.5
  }

  setProps(props: { [key: string]: any }) {
    _.assign(this, _.pick(props, [
      'teleportCooldown', 'stats', 'effects', 'needExpToNextLevel', 'skillLevels', 'freeSkillPoints', 'level', 'exp', 'characteristics', 'name', 'points', 'controlEnabled', 'destroyedTowers', 'kills', 'deaths', 'mana', 'maxHP', 'maxMana', 'canBuyItems', 'money', 'name', 'movementSpeed', 'attackDamage', 'hpRegen', 'manaRegen', 'defense', 'target'
    ]))

    const text = `${props.name}[${this.level}]`

    if (this.nameGO.text !== text)
      this.nameGO.setText(`${props.name}[${this.level}]`)

    if (props.visible !== this.visible) {
      if (props.visible === false)
        if (this.my || props.team === this.myPlayer.team)
          this.setAlpha(0.5)
        else
          this.setAlpha(0)
      else
        this.setAlpha(1)
    }

    this.skills = props.skills
    this.items = props.items

    if (this.team !== props.team || this.gameClass !== props.gameClass) {
      this.team = props.team
      this.gameClass = props.gameClass
      this.updateDirection(props.direction, true)

      for (const tower of this.scene.towers)
        tower.updateHP(tower.hp)

      if (this.my)
        this.scene.updateUnitHPBarsAndInteractive()
    } else {
      this.updateDirection(props.direction)
    }

    if (props.hp !== this.hp) {
      this.hp = props.hp
      this.fillHPBar()
    }
  }

  fillHPBar() {
    this.hpGO.clear()

    this.hpGO.fillStyle(0x222222)
    this.hpGO.fillRect(0, 0, 64, 10)

    this.hpGO.fillStyle(0x666666)
    this.hpGO.fillRect(2, 2, 60, 6)

    const ratio = this.hp / this.characteristics.total.maxHP
    const width = ratio > 0 ? 60 * ratio : 0

    if (width > 0) {
      const color = this.team === this.scene.myPlayer.team ? 0x00ff00 : 0xff0000

      this.hpGO.fillStyle(color)
      this.hpGO.fillRect(2, 2, width, 6)
    }
  }

  buyItem(name: string) {
    this.room.send('BUY_ITEM', {
      name
    })
  }

  sellItem(index: number) {
    this.room.send('SELL_ITEM', {
      index
    })
  }

  useItem(index: number) {
    this.room.send('USE_ITEM', {
      index
    })
  }

  useSkill(name: string, x2: number, y2: number, index: number) {
    const x1 = this.bodyGO.x
    const y1 = this.bodyGO.y

    const rotation = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    this.room.send('USE_SKILL', {
      name: name,
      x1,
      y1,
      x2,
      y2,
      index,
      rotation
    })
  }

  changeTeamAndClass(team: string, gameClass: string) {
    if (team !== this.team || gameClass !== this.gameClass) {
      this.room.send('CHANGE_TEAM_AND_CLASS', {
        team, gameClass
      })
    }
  }

  sendMessage(text: string, forTeam: boolean) {
    this.room.send('SEND_MESSAGE', {
      text,
      forTeam
    })
  }

  setTarget(type: string, id: string) {
    this.room.send('SET_TARGET', { type, id })
  }

  increaseSkillLevel(index: number) {
    this.room.send('INCREASE_SKILL_LEVEL', { index })
  }

  teleport() {
    const { worldX: x, worldY: y}  = this.scene.input.mousePointer

    let toTower = -1
    const towers = this.scene.towers.filter(t => t.team === this.team)

    for (let i = 0; i < towers.length; i++) {
      if (Phaser.Geom.Rectangle.Contains(towers[i].rect, x, y)) {
        toTower = i
        break
      }
    }

    this.room.send('TELEPORT', {
      toTower
    })
  }
}