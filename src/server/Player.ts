import '@geckos.io/phaser-on-nodejs'
import { Client as ColyseusClient } from 'colyseus'
import Phaser from 'phaser'
import _ from 'lodash'
import geometry from '../data/geometry.json'
import skills from '../data/skills.json'
import items from '../data/items.json'
import heroStats from '../data/heroes.json'
import type { Skill, Item } from "../types"
import pf from 'pathfinding'
import Creature from './Creature'
import safeZones from './safeZones'
import Unit from "./Unit"

type Props = {
  [key: string]: number
}

interface Effect {
  [key: string]: number
}

function pointInRectangle(x: number, y: number, rect: Phaser.Geom.Rectangle) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const levelExpRequirements = [0,
  0, // для достижения 1-го уровня
  115, // 2-го
  185,
  240,
  290,
  300,
  360,
  375,
  445,
  465,
]

interface ICharacteristics {
  maxHP: number,
  maxMana: number,
  attackDamage: number,
  attackCooldown: number
  defense: number,
  hpRegen: number,
  manaRegen: number,
  movementSpeed: number
}

const characteristicsFilledZero = {
  maxHP: 0,
  maxMana: 0,
  attackDamage: 0,
  attackCooldown: 0,
  defense: 0,
  hpRegen: 0,
  manaRegen: 0,
  movementSpeed: 0
}

export default class Player extends Creature {
  skills: Skill[] = []
  items: Item[] = []
  mana = 0
  money = 0
  visible = true
  canBuyItems = true
  lastDamageDealerId = ''
  lastDamageReceivedAt = 0
  controlEnabled = true
  lastActivityAt: number
  spawnAt = 0
  ip = ''
  exp = 0
  level = 1
  freeSkillPoints = 1
  skillLevels = [0, 0, 0, 0]
  attackSprite: string
  needExpToNextLevel = 100
  direction = 'down-stay'

  characteristics: {
    basic: ICharacteristics,
    buffBonuses: ICharacteristics,
    itemBonuses: ICharacteristics
    total: ICharacteristics
  }

  effects = {}

  stats: {
    kills: 0,
    assists: 0,
    deaths: 0,
    destroyedTowers: 0,
    totalDamage: 0,
    buffs: 0
  }

  constructor(
    public name: string,
    public gameClass: string,
    public team: string,
    public crown: string,
    public sessionId: string,
    public client: ColyseusClient,
    public broadcastFunc: Function,
    public getPlayerByIdFunc: Function,
    public pfFinder: pf.AStarFinder,
    public getPfGridClone: Function,
    getRoom: Function
  ) {

    super(getRoom)

    this.circle = new Phaser.Geom.Circle(0, 0, 25)
    this.controlEnabled = true
    this.lastActivityAt = Date.now()
    this.resetAndSpawn()
  }

  getId() {
    return this.sessionId
  }

  moveTo(x: number, y: number) {
    function getIndex(n: number) {
      return ~~(n / 32)
    }

    // вычислить индексы
    const indexX1 = getIndex(this.x)
    const indexY1 = getIndex(this.y)

    const indexX2 = getIndex(x)
    const indexY2 = getIndex(y)

    // построить маршрут, положить его в waypoints
    const time1 = Date.now()
    const grid = this.getPfGridClone()
    const waypoints = this.pfFinder.findPath(indexX1, indexY1, indexX2, indexY2, grid)
    if (waypoints.length > 0) {
      this.waypoints = pf.Util.smoothenPath(grid, waypoints);
      this.waypoints.shift()
    }

    const time2 = Date.now()
    //console.log('pf: ', time2 - time1)
  }

  getSkillsByGameClass(gameClass: string) {
    const classes = ['warrior', 'assassin', 'mage', 'undead']
    const firstSkillIndex = classes.findIndex(c => c === gameClass) * 4

    return [
      _.clone(skills[firstSkillIndex]),
      _.clone(skills[firstSkillIndex + 1]),
      _.clone(skills[firstSkillIndex + 2]),
      _.clone(skills[firstSkillIndex + 3])
    ]
  }

  getAttackSprite(): string {
    return this.attackSprite
  }

  get isAlive() {
    return this.hp > 0
  }

  resetAndSpawn(name?: string, team?: string, gameClass?: string) {
    if (name)
      this.name = name

    if (team)
      this.team = team

    if (gameClass)
      this.gameClass = gameClass

    const x = geometry.spawn[this.team].x - 24 + _.random(0, 48)
    const y = geometry.spawn[this.team].y - 24 + _.random(0, 48)

    this.setPosition(x, y)

    _.assign(this, {
      items: [],
      skills: this.getSkillsByGameClass(this.gameClass),
      canBuyItems: true,
      visible: true,
      money: 0,
      controlEnabled: true,
      stats: {
        kills: 0,
        assists: 0,
        deaths: 0,
        destroyedTowers: 0,
        totalDamage: 0,
        buffs: 0
      },
      lastDamageDealerId: '',
      lastDamageReceivedAt: 0,
      attackSprite: heroStats[this.gameClass].attackSprite,

      characteristics: {
        basic: {}, //_.omit(heroStats[this.gameClass], 'attackSprite'),
        buffBonuses: _.clone(characteristicsFilledZero),
        itemBonuses: _.clone(characteristicsFilledZero),
      },

      target: { type: 'none' },
      direction: 'down-stay',
      exp: 0,
      needExpToNextLevel: levelExpRequirements[2],
      level: 1,
      skillLevels: [0, 0, 0, 0],
      freeSkillPoints: 1,
      effects: {},
      attackRange: heroStats[this.gameClass].attackRange
    })

    for (const prop of ['maxHP', 'maxMana', 'defense', 'hpRegen', 'manaRegen', 'attackDamage', 'attackCooldown', 'movementSpeed'])
      this.characteristics.basic[prop] = heroStats[this.gameClass][prop][0]

    this.characteristics.total = _.clone(this.characteristics.basic)

    this.hp = this.characteristics.total.maxHP
    this.mana = this.characteristics.total.maxMana

    for (const playerSkill of this.skills)
      playerSkill.currentCooldown = 0

    this.client.send('FOCUS_ON_HERO')

    this.spawnAt = Date.now()

    return { x, y }
  }

  setPosition(x: number, y: number) {
    this.x = x
    this.y = y
    this.circle.setPosition(x, y)
    this.canBuyItems = pointInRectangle(this.x, this.y, safeZones[this.team])
  }

  increaseHP(hp: number) {
    this.hp += hp
    if (this.hp > this.characteristics.total.maxHP)
      this.hp = this.characteristics.total.maxHP
  }

  increaseMana(mana: number) {
    this.mana += mana
    if (this.mana > this.characteristics.total.maxMana)
      this.mana = this.characteristics.total.maxMana
  }

  temporarilyIncreaseProps(props: Props, time: number) {
    const spawnAt = this.spawnAt

    for (let [key, value] of Object.entries(props)) {
      let currentValue = _.get(this, key)

      if (value > 0 || currentValue >= Math.abs(value)) {
        _.set(this, key, currentValue + value)
      } else {
        value = -currentValue
        _.set(this, key, 0)
        props[key] = value
      }
    }

    setTimeout(() => {
      if (spawnAt === this.spawnAt) {
        for (const [key, value] of Object.entries(props)) {
          let currentValue = _.get(this, key)
          _.set(this, key, currentValue - value)
        }
      }
    }, time)
  }

  temporarilyMakeInvisible(time: number) {
    this.visible = false
    setTimeout(() => {
      if (!this.visible)
        this.visible = true
    }, time)
  }

  buyItem(item: Item) {
    this.items.push(_.clone(item))
    this.money -= item.cost

    if (!item.usable) {
      for (const prop in item.effect) {
        this.characteristics.itemBonuses[prop] += item.effect[prop]
        this.characteristics.total[prop] += item.effect[prop]
      }
    }
  }

  sellItem(index: number) {
    const playerItem = Object.values<Item>(this.items)[index]

    if (playerItem) {
      const name = playerItem.name
      const itemDef = items[name]

      this.items.splice(index, 1)
      this.money += Math.floor(itemDef.cost / 2)

      if (!itemDef.usable) {
        for (const prop in itemDef.effect) {
          this.characteristics.itemBonuses[prop] -= itemDef.effect[prop]
          this.characteristics.total[prop] -= itemDef.effect[prop]
        }
      }
    }
  }

  getDamaged(damage: number, damageDealer?: Unit) {
    if (pointInRectangle(this.x, this.y, safeZones[this.team]))
      return

    let ret

    const damageDealerType = (damageDealer && damageDealer.constructor.name) || ''
    const now = Date.now()

    this.lastActivityAt = Date.now()

    let realDamage = Math.floor(damage - this.characteristics.total.defense)
    if (realDamage <= 0)
      return false

    if (this.hp < realDamage)
      realDamage = this.hp

    this.hp -= realDamage

    // игрок убит
    if (!this.isAlive) {
      this.target = { type: 'none' }

      if (damageDealer) {
        let damageDealerTitle

        if (damageDealerType === 'Player') {
          const _damageDealer = damageDealer as Player

          damageDealerTitle = _damageDealer.name
          _damageDealer.money += 100
          _damageDealer.stats.kills++
          this.stats.deaths++

          let battleMessage = {
            killer: {
              name: _damageDealer.name,
              team: _damageDealer.team,
              crown: _damageDealer.crown,
            },
            victim: {
              name: this.name,
              team: this.team,
              crown: this.crown,
            },
            assistant: {}
          }

          if (now - this.lastDamageReceivedAt < 1000 && _damageDealer.sessionId !== this.lastDamageDealerId) {
            let assistant = this.getPlayerByIdFunc(this.lastDamageDealerId)
            assistant.stats.assists++

            battleMessage.assistant = {
              name: assistant.name,
              team: assistant.team,
              crown: assistant.crown,
            }
          }

          this.broadcastFunc('BATTLE_MESSAGE', battleMessage)
        } else {
          this.stats.deaths++

          damageDealerTitle = damageDealerType

          let battleMessage = {
            killer: {
              name: damageDealerTitle,
              team: damageDealer.team,
              crown: '',
            },
            victim: {
              name: this.name,
              team: this.team,
              crown: this.crown,
            }
          }

          this.broadcastFunc('BATTLE_MESSAGE', battleMessage)
        }

        //@ts-ignore
        if (!(damageDealer.neutralType && damageDealer.neutralType !== '')) {
          const damageDealerTeam = this.team === 'blue' ? 'red' : 'blue'
          this.getRoom().state.teamKills[damageDealerTeam]++
        }

        this.client.send('SHOW_MESSAGE', {
          text: 'You were killed by ' + damageDealerTitle
        })
      }

      this.controlEnabled = false
      this.visible = false
      this.direction = 'down-stay'

      this.respawn()

      // for (const [id, projectile] of Object.entries<any>(this.getRoom().state.projectiles))
      //   if (projectile.victim.id === this.sessionId)
      //     this.getRoom().deleteProjectile(id)

      ret = false
    } else {
      ret = true
    }



    if (damageDealerType === 'Player') {
      const _damageDealer = damageDealer as Player

      this.lastDamageDealerId = _damageDealer.sessionId
      this.lastDamageReceivedAt = now

      _damageDealer.stats.totalDamage += realDamage
    }

    return ret
  }

  async respawn() {
    await sleep(2000)

    this.client.send('HIDE_MESSAGE')

    this.setPosition(geometry.spawn[this.team].x, geometry.spawn[this.team].y)

    this.client.send('FOCUS_ON_HERO')
    this.hp = this.characteristics.total.maxHP
    this.mana = this.characteristics.total.maxMana

    for (let i = Math.floor(this.level / 2) + 1; i > 0; i--) {
      this.client.send('HIDE_MESSAGE')
      this.client.send('SHOW_MESSAGE', {
        text: i.toString()
      })
      await sleep(1000)
    }

    this.client.send('FOCUS_ON_HERO')
    this.client.send('HIDE_MESSAGE')
    this.controlEnabled = true
    this.visible = true
  }

  getAttackDamage(): number {
    return this.characteristics.total.attackDamage
  }

  getAttackCooldown(): number {
    return this.characteristics.total.attackCooldown
  }

  getMovementSpeed() {
    return this.characteristics.total.movementSpeed
  }

  addEffect(name: string, effect: Effect, time?: number) {
    if (!this.effects[name]) {
      this.effects[name] = effect

      for (const [characteristic, value] of Object.entries<number>(effect)) {
        this.characteristics.buffBonuses[characteristic] += value
        this.characteristics.total[characteristic] += value
      }

      if (time)
        sleep(time).then(() => {
          this.removeEffect(name)
        })
    }
  }

  removeEffect(name: string) {
    const effect = this.effects[name]

    if (effect) {
      for (const [characteristic, value] of Object.entries<number>(effect)) {
        this.characteristics.buffBonuses[characteristic] -= value
        this.characteristics.total[characteristic] -= value
      }

      delete this.effects[name]
    }
  }

  increaseLevelByOne() {
    this.level++
    this.freeSkillPoints++

    for (const prop of ['maxHP', 'maxMana', 'defense', 'hpRegen', 'manaRegen', 'attackDamage', 'attackCooldown', 'movementSpeed']) {
      const valuesByLevel = heroStats[this.gameClass][prop]
      const delta = valuesByLevel[this.level-1] - valuesByLevel[this.level-2]
      this.characteristics.basic[prop] += delta
      this.characteristics.total[prop] += delta
    }

    this.client.send('PLAY_VISUAL_EFFECT', {
      name: 'level-up',
      x: this.x,
      y: this.y - 90,
      attachToPlayer: true
    })
  }

  addExp(exp: number) {
    if (this.level < 10) {
      const needExpToNextLevel = levelExpRequirements[this.level + 1]

      this.exp += exp
      if (this.exp >= needExpToNextLevel) {
        this.increaseLevelByOne()
        this.exp = this.level < 10 ? this.exp - needExpToNextLevel : 0

        // this.getRoom().broadcast('PLAY_SOUND_EFFECT', {
        //   name: 'level-up',
        //   x: this.x,
        //   y: this.y
        // })
      }

      this.needExpToNextLevel = this.level < 10 ? levelExpRequirements[this.level + 1] : 9999
    }
  }

  increaseSkillLevel(index: number) {
    this.skillLevels[index]++
    this.freeSkillPoints--
  }
}