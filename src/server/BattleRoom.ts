import Creep from './Creep'
import '@geckos.io/phaser-on-nodejs'
import Phaser from 'phaser'
import Throne from './Throne'
import {NetMessage, Projectile, Skill} from '../types'
import { Client as ColyseusClient, Room as ColyseusRoom } from 'colyseus'
import geometry from '../data/geometry.json'
import _ from 'lodash'
import Tower from './Tower'
import PlayerModel from './PlayerModel'
import { sleep, pointInRectangle, loadCollisionPolygonPoints } from '../common/functions'
import pf from 'pathfinding'
import map from '../data/map.json'
import Player from './Player'
import creepsDefImported from '../data/creeps.json'
import Unit from './Unit'
import towerPositions from '../data/towers.json'
import handleMessage from './handleMessage'
import checkAccessHash from "./checkAccessHash";

const creepsDef = creepsDefImported as any

const safeZones = {
  blue: new Phaser.Geom.Rectangle(geometry.safeZones.blue.x, geometry.safeZones.blue.y, geometry.safeZones.width, geometry.safeZones.height),
  red: new Phaser.Geom.Rectangle(geometry.safeZones.red.x, geometry.safeZones.red.y, geometry.safeZones.width, geometry.safeZones.height)
}

type BattleStatsCommonArray = {
  name: string
  crown: string | undefined,
  team: string,
  number: number | string,
  points: number
}[] | []

type BattleStatsTotalArray = {
  name: string
  crown: string | undefined,
  team: string,
  points: number,
}[] | []

type BattleStats = {
  killsAssistsDeaths: BattleStatsCommonArray,
  destroyedTowers: BattleStatsCommonArray,
  totalDamage: BattleStatsCommonArray,
  buffs: BattleStatsCommonArray,
  total: BattleStatsTotalArray
}

export default class BattleRoom extends ColyseusRoom {
  ALLIES: number = 0
  ENEMIES: number = 1

  intervals: NodeJS.Timeout[] = []
  possibleToBalanceTeams = true
  lastGuestNo: number = 1
  battleInProgress = true

  pfFinder: pf.AStarFinder
  pfGrid: pf.Grid

  lastCreepId = 1
  lastRuneId = 1
  creeps: Creep[] = []
  lastProjectileId = 1
  collisionPolygons: Phaser.Geom.Polygon[] = []

  autoDispose = true
  maxClients = 10

  getPlayerById(id: string) {
    return this.state.players[id]
  }

  async updatePlayerCrowns(battleStats: BattleStats) {
    let crowns: { [key: string]: string } = {}

    for (const player of Object.values<Player>(this.state.players)) {
      player.crown = await this.getPlayerCrown(player.name)
      crowns[player.name] = player.crown
    }

    for (const prop of ['total', 'killsAssistsDeaths', 'destroyedTowers', 'totalDamage', 'buffs'])
      for (const player of battleStats[prop])
        player.crown = crowns[player.name]
  }

  async getPlayerCrown(name: string) {
    const players = await PlayerModel.findManyByParams({}, 30, {
      field: 'points',
      direction: -1
    })

    let index = undefined
    let i = 0

    for (const playerDB of players) {
      if (playerDB.name === name) {
        index = i
        break
      } else {
        i++
      }
    }

    let crown = ''

    if (index !== undefined) {
      if (index === 0)
        crown = 'draconic'
      else if (index === 1)
        crown = 'amethyst'
      else if (index === 2)
        crown = 'diamond'
      else if (index >= 3 && index <= 9)
        crown = 'gold'
      else if (index >= 10 && index <= 19)
        crown = 'silver'
      else if (index >= 20 && index <= 29)
        crown = 'bronze'
    } else {
      crown = 'none'
    }

    return crown
  }

  createBattleStats() {
    const players = this.state.players

    const killsAssistsDeaths: BattleStatsCommonArray = Object.values<Player>(players).map(p => {
      return {
        name: p.name,
        crown: p.crown,
        team: p.team,
        number: `${p.stats.kills} / ${p.stats.assists} / ${p.stats.deaths}`,
        points: p.stats.kills * 30 + p.stats.assists * 15
      }
    }).sort((p1, p2) => p2.points - p1.points)

    const destroyedTowers: BattleStatsCommonArray = Object.values<Player>(players).map(p => {
      return {
        name: p.name,
        crown: p.crown,
        team: p.team,
        number: p.stats.destroyedTowers,
        points: p.stats.destroyedTowers * 10
      }
    }).sort((p1, p2) => p2.points - p1.points)

    const totalDamage: BattleStatsCommonArray = Object.values<Player>(players).map(p => {
      return {
        name: p.name,
        crown: p.crown,
        team: p.team,
        number: Math.floor(p.stats.totalDamage),
        points: Math.floor(p.stats.totalDamage / 1000)
      }
    }).sort((p1, p2) => p2.points - p1.points)

    const buffs: BattleStatsCommonArray = Object.values<Player>(players).map(p => {
      return {
        name: p.name,
        crown: p.crown,
        team: p.team,
        number: p.stats.buffs,
        points: p.stats.buffs * 2
      }
    }).sort((p1, p2) => p2.points - p1.points)

    const total: BattleStatsTotalArray = Object.values<Player>(players).map(p => {
      const points = (killsAssistsDeaths.find(p2 => p2.name === p.name) || { points: 0 }).points + (destroyedTowers.find(p2 => p2.name === p.name) || { points: 0 }).points + (totalDamage.find(p2 => p2.name === p.name) || { points: 0 }).points + (buffs.find(p2 => p2.name === p.name) || { points: 0 }).points

      return {
        name: p.name,
        crown: p.crown,
        team: p.team,
        points,
      }
    }).sort((item1, item2) => item2.points - item1.points)

    return {
      killsAssistsDeaths,
      destroyedTowers,
      totalDamage,
      buffs,
      total
    }
  }

  getPlayerCountByTeam(team: string) {
    return Object.values<Player>(this.state.players).filter(p => p.team === team).length
  }

  totalPlayers() {
    return Object.keys(this.state.players).length
  }

  applyToPlayers(playerType: number, myTeam: string, func: Function) {
    let players = Object.values<Player>(this.state.players).filter(item => item.hp > 0)

    if (playerType === this.ALLIES)
      players = players.filter(item => item.team === myTeam)
    else if (playerType === this.ENEMIES)
      players = players.filter(item => item.team !== myTeam)

    for (const player of players)
      func(player)
  }

  applyToEnemyCreeps(myTeam: string, func: Function) {
    const creeps = Object.values<Creep>(this.state.creeps).filter(item => item.team !== myTeam)

    for (const creep of creeps)
      func(creep)
  }

  // каждые 50 мс
  async update(timeDelta: number) {
    if (!this.battleInProgress)
      return

    //const time1 = Date.now()

    // продвижение пуль
    for (const [id, projectile] of Object.entries<Projectile>(this.state.projectiles)) {
      const owner = this.state[projectile.owner.type + 's'][projectile.owner.id]
      const victim = this.state[projectile.victim.type + 's'][projectile.victim.id]

      if (victim && (victim.type !== 'player' || victim.type === 'player' && victim.controlEnabled)) {
        let victimX: number, victimY: number

        if (victim.type === 'tower') {
          victimX = victim.x + 15
          victimY = victim.y + 30
        } else {
          victimX = victim.x
          victimY = victim.y
        }

        const distance = Phaser.Math.Distance.Between(projectile.x, projectile.y, victimX, victimY)
        const angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, victimX, victimY)

        if (distance > 10) {
          const line = Phaser.Geom.Line.SetToAngle(
            new Phaser.Geom.Line(0, 0, 0, 0),
            projectile.x,
            projectile.y,
            angle,
            15
          )
          projectile.x = line.x2
          projectile.y = line.y2
          projectile.rotation = angle
        } else {
          if (owner)
            this.damageUnit(owner, victim, projectile.damage)
          else
            this.damageUnit(undefined, victim, projectile.damage, undefined, projectile.team)
          this.deleteProjectile(id)
        }
      } else {
        this.deleteProjectile(id)
      }
    }

    // обработка тика внутри юнитов
    for (const creep of Object.values<Creep>(this.state.creeps))
      creep.handleTick(timeDelta)

    for (const player of Object.values<Player>(this.state.players))
      player.handleTick(timeDelta)

    for (const tower of this.state.towers) {
      if (tower.hp > 0)
        tower.handleTick(timeDelta)
    }

    // уменьшение кулдаунов и регенерация хп и маны игроков
    for (const player of Object.values<Player>(this.state.players).filter(item => item.isAlive)) {
      let hpRegen = timeDelta / 1000 * player.characteristics.total.hpRegen
      let manaRegen = timeDelta / 1000 * player.characteristics.total.manaRegen

      if (pointInRectangle(player.x, player.y, _.get(safeZones, player.team)) || Date.now() - player.lastActivityAt > 2000) {
        hpRegen += (timeDelta / 1000) * 1000
        manaRegen += (timeDelta / 1000) * 1000
      }

      player.increaseHP(hpRegen)
      player.increaseMana(manaRegen)

      for (const skill of player.skills) {
        if (skill.currentCooldown > 0) {
          skill.currentCooldown -= timeDelta
          if (skill.currentCooldown < 0)
            skill.currentCooldown = 0
        }
      }

      if (player.teleportCooldown > 0) {
        player.teleportCooldown -= timeDelta
        if (player.teleportCooldown < 0)
          player.teleportCooldown = 0
      }
    }

    //console.log('update: ', Date.now() - time1, ' ms')
  }

  addExpToPlayersInRange(team: string, x: number, y: number, range: number, exp: number, except: Player = null) {
    const players = Object.values<Player>(this.state.players)
      .filter(
        p => p.hp > 0 && p.team === team && Phaser.Math.Distance.Between(x, y, p.x, p.y) < range && p !== except
      )

    if (players.length > 0) {
      const expToEach = Math.floor(exp / players.length)
      players.map(p => p.addExp(expToEach))
    }
  }

  calculateSkillDelay(skill: Skill, unit1: Unit, unit2: Unit) {
    const distanceToEnemy = Phaser.Math.Distance.Between(unit1.x, unit1.y, unit2.x, unit2.y)

    const timeFactor = skill.numberOfFrames / skill.animFrameRate
    const distanceFactor = 1 - (skill.animFrameWidth - distanceToEnemy) / skill.animFrameWidth
    return timeFactor * distanceFactor * 1000
  }

  async damageUnit(damageDealer: Unit, victim: Unit, damage: number, skill?: Skill, team?: string) {
    if (skill) {
      const delay = this.calculateSkillDelay(skill, damageDealer, victim)
      await sleep(delay)
    }

    // атакуем цель
    // и если она убита, попадаем в блок
    if (!victim.getDamaged(damage, damageDealer)) {
      const id = victim.getId()
      let exp
      let _victim: any

      switch (victim.type) {

        // она была крипом
        case 'creep':
          _victim = victim as Creep
          const { x, y } = _victim
          exp = _victim.neutralType === '' ? 40 : creepsDef.neutral.types[_victim.neutralType].exp

          this.broadcast('PLAY_CUSTOM_ANIM', {
            name: 'death',
            x,
            y
          })

          if (damageDealer && damageDealer.type === 'player') {
            const _damageDealer = damageDealer as Player

            _damageDealer.addExp(exp)
            const money = _victim.neutralType === 'dragon' ? 100 : 20
            _damageDealer.money += money

            _damageDealer.client.send('PLAY_VISUAL_EFFECT', {
              name: 'money-' + money,
              x,
              y: y - 50
            })

            if (_victim.neutralType === 'dragon') {
              const id = this.lastRuneId++

              const rune = this.state.runes[id] = {
                x,
                y,
                type: 'double-damage'
              }

              this.broadcast('CREATE_RUNE', { ...rune, id: id })
            }

            if (_victim.spawnTimeout) {
              sleep(_victim.spawnTimeout)
                .then(async () => {
                  while (true) {
                    if (_victim.neutralType === 'dragon' && Object.values<any>(this.state.runes).some(rune =>
                      Phaser.Math.Distance.Between(rune.x, rune.y, x, y) < 10)
                    ) {
                      await sleep(1000)
                    } else {
                      const id = `creep-${this.lastCreepId++}`

                      const creep = this.state.creeps[id] = new Creep(
                        id,
                        'neutral',
                        x,
                        y,
                        [],
                        this.getRoom.bind(this),
                        _victim.maxHP,
                        _victim.attackDamage,
                        _victim.baseAttackCooldown,
                        _victim.attackRange,
                        _victim.defense,
                        _victim.spawnTimeout,
                        _victim.attackSprite,
                        _victim.neutralType
                      )

                      this.broadcast('CREATE_CREEP', {
                        id,
                        team: 'neutral',
                        x,
                        y,
                        neutralType: _victim.neutralType,
                        maxHP: _victim.maxHP
                      })

                      break
                    }
                  }
                })
            }
          }

          this.addExpToPlayersInRange(team ? team : damageDealer.team, victim.x, victim.y, 400, exp / 2,
            damageDealer && damageDealer.type === 'player' ? damageDealer as Player : null
          )

          this.deleteCreep(id)
          break

        // она была игроком
        case 'player':
          _victim = victim as Player
          exp = Math.floor((_victim.level * 1.2) * 30)

          if (damageDealer && damageDealer.type === 'player')
            (damageDealer as Player).addExp(exp)

          this.addExpToPlayersInRange(team ? team : damageDealer.team, _victim.x, _victim.y, 400, exp / 2,
            damageDealer && damageDealer.type === 'player' ? damageDealer as Player : null
          )
          break

        // она была башней
        case 'tower':
          if (damageDealer && damageDealer.type === 'player') {
            const _damageDealer = damageDealer as Player
            _damageDealer.addExp(200)

            _damageDealer.client.send('PLAY_VISUAL_EFFECT', {
              name: 'money-100',
              x: victim.x + 16,
              y: victim.y - 30
            })
          }

          this.addExpToPlayersInRange(team ? team : damageDealer.team, victim.x, victim.y, 400, 100,
            damageDealer && damageDealer.type === 'player' ? damageDealer as Player : null
          )

          break
      }

      // в любом случае очистить цели тех, кто ее атаковал
      this.clearAttackingTargets(id)
    }
  }

  async endBattle(teamWinner: string) {
    const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

    this.broadcast('SHOW_MESSAGE', {
      text: capitalize(teamWinner) + ' team won!'
    })

    const battleStats = this.createBattleStats()

    for (const player of battleStats.total) {
      if (player.team === teamWinner)
          player.points = Math.floor(player.points * 1.5)

      const playerDB = await PlayerModel.findOneByParams({ name: player.name })
      this.updatePlayerPoints(playerDB, player.points)
    }

    this.updatePlayerCrowns(battleStats)
    battleStats.total.sort((item1, item2) => item2.points - item1.points)

    for (const player of <any> battleStats.total.values())
      player.crown = this.getPlayerCrown(player.name)

    for (const player of <Player[]> Object.values(this.state.players)) {
      player.controlEnabled = false
      player.target = { type: 'none' }
    }

    this.battleInProgress = false

    for (const id in this.state.projectiles)
      this.deleteProjectile(id)

    await sleep(1000)

    this.broadcast('BATTLE_STATS', {
      battleStats,
      teamWinner
    })

    await sleep(2000)

    this.battleInProgress = true

    for (const tower of this.state.towers)
      tower.hp = tower.maxHP

    for (const throne of this.state.thrones)
      throne.hp = throne.maxHP

    for (const id in this.state.creeps) {
      this.broadcast('DELETE_CREEP', {id})
      delete this.state.creeps[id]
    }

    this.spawnNeutralCreeps()

    for (const player of <Player[]>Object.values(this.state.players))
      player.resetAndSpawn()

    this.broadcast('HIDE_MESSAGE')
    this.initPF()

    this.state.teamKills = {
      blue: 0,
      red: 0
    }
  }

  initPF() {
    const data = []
    for (let i = 0; i < 10000; i++)
      data[i] = map.layers[3].data[i] + map.layers[4].data[i]

    const pfMatrix = _.chunk<number>(data, 100)

    this.pfGrid = new pf.Grid(pfMatrix)

    this.pfFinder = new pf.AStarFinder(<any>{
      allowDiagonal: true,
      dontCrossCorners: true,
    })
  }

  getPfGridClone() {
    return this.pfGrid.clone()
  }

  async onCreate(options: any) {
    this.initPF()

    // создание башен
    const towers = Array.from(Array(18)).map((item, index) => {
      const team = index <= 8 ? 'blue' : 'red'
      const [x, y] = towerPositions[index]
      return new Tower(x, y, geometry.towers.width, geometry.towers.height, 0, team, this.getRoom.bind(this), index)
    })

    this.setState({
      players: {},
      creeps: {},
      towers,
      projectiles: {},
      runes: {},
      thrones: [
        new Throne(geometry.thrones.positions.blue.x, geometry.thrones.positions.blue.y, geometry.thrones.width, geometry.thrones.height, 'blue', this.endBattle.bind(this), towers, this.getRoom.bind(this)),
        new Throne(geometry.thrones.positions.red.x, geometry.thrones.positions.red.y, geometry.thrones.width, geometry.thrones.height, 'red', this.endBattle.bind(this), towers, this.getRoom.bind(this)),
      ],
      teamKills: {
        blue: 0,
        red: 0
      }
    })

    let lastTime = Date.now()

    this.intervals.push(setInterval(() => {
      const nowTime = Date.now()
      const timeDelta = nowTime - lastTime
      lastTime = nowTime
      this.update(timeDelta)
    }, 50))

    this.intervals.push(setInterval(() => {
      for (const player of <Player[]> Object.values(this.state.players)) {
        player.money++
        player.client.send('PONG')
      }
    }, 1000))

    // автобаланс
    this.intervals.push(setInterval(async () => {
      this.balanceTeams()
    }, 5000))

    // обработка сообщений клиентов
    this.onMessage("*", (client: ColyseusClient, type: string | number, msg: NetMessage) => {
      handleMessage(this, client, type, msg)
    })

    loadCollisionPolygonPoints('collisions').forEach(points => {
      this.collisionPolygons.push(new Phaser.Geom.Polygon(points))
    })

    this.spawnTeamCreeps()
    this.spawnNeutralCreeps()

    // спаун командных крипов каждые 20 секунд
    this.intervals.push(setInterval(() => {
      this.spawnTeamCreeps()
    }, 20000))
  }

  async balanceTeams() {
    const blueTeamPlayerCount = this.getPlayerCountByTeam('blue')
    const redTeamPlayerCount = this.getPlayerCountByTeam('red')

    const difference = Math.abs(blueTeamPlayerCount - redTeamPlayerCount)

    if (difference >= 2) {
      const teamWithMostPlayers = blueTeamPlayerCount > redTeamPlayerCount ? 'blue' : 'red'
      const players = (<Player[]> Object.values(this.state.players))
        .filter(p => p.team === teamWithMostPlayers)
        .sort((p1, p2) => p2.stats.kills - p1.stats.kills)
        .slice(- Math.floor(difference / 2))

      for (const player of players)
        player.client.send('SHOW_MESSAGE', {
          text: '[Auto balance] You will be transferred to the enemy team within 5 seconds'
        })

      this.possibleToBalanceTeams = false

      await sleep(5000)

      if (blueTeamPlayerCount === this.getPlayerCountByTeam('blue') && redTeamPlayerCount === this.getPlayerCountByTeam('red')) {
        for (const player of players) {
          player.team = player.team === 'blue' ? 'red' : 'blue'

          const { x, y } = geometry.spawn[player.team]
          player.setPosition(x, y)

          player.client.send('FOCUS_ON_HERO')
        }

        for (const player of players)
          player.client.send('HIDE_MESSAGE')
      } else {
        for (const player of players)
          player.client.send('SHOW_MESSAGE', {
            text: 'Aborted'
          })

        await sleep(1000)

        for (const player of players)
          player.client.send('HIDE_MESSAGE')
      }
      this.possibleToBalanceTeams = true
    }
  }

  async onAuth(client: any, options: any, request: any) {
    const name = options.name

    return (
      await checkAccessHash(options.name, options.accessHash)
      &&
      !Object.values<Player>(this.state.players).some((p: Player) => p.name === name)
    )
  }

  broadcastChatMessage(msg: any) {
    if (msg.forTeam)
      for (const player of Object.values<Player>(this.state.players).filter(p => p.team === msg.team))
        player.client.send('CHAT_MESSAGE', msg)
    else
      this.broadcast('CHAT_MESSAGE', msg)
  }

  updatePlayerPoints(playerDB: PlayerModel, points: number) {
    points = playerDB.data.points + points

    if (points < 0)
      points = 0

    playerDB.update({
      points
    }, PlayerModel)
  }

  async onLeave(client: any) {
    const name = this.state.players[client.sessionId].name

    console.log(`${name} left`)
    this.broadcastChatMessage({
      team: 'system',
      author: 'game',
      text: `${name} left`,
    })

    delete this.state.players[client.sessionId]

    this.broadcast('DELETE_PLAYER', {
      sessionId: client.sessionId
    })
  }

  clearAttackingTargets(unitId: string) {
    for (const player of Object.values<Player>(this.state.players))
      if (
        ['player', 'creep', 'tower'].includes(player.target.type)
        &&
        player.target.id === unitId
      ) {

        player.target = { type: 'none' }

        if (!player.direction.endsWith('-stay'))
          player.direction += '-stay'
      }
  }

  getRoom() {
    return this
  }

  createProjectile(props: Projectile) {
    const id = this.lastProjectileId++
    this.state.projectiles[id] = props
    this.broadcast('CREATE_PROJECTILE', {
      id,
      x: props.x,
      y: props.y,
      type: props.type,
      rotation: props.rotation
    })
  }

  spawnNeutralCreeps() {
    for (const creepPos of creepsDef.neutral.positions) {
      const id = `creep-${this.lastCreepId++}`
      const team = 'neutral'

      const creepTypeDef = creepsDef.neutral.types[creepPos.type]

      const creep = this.state.creeps[id] = new Creep(
        id,
        team,
        creepPos.x,
        creepPos.y,
        [],
        this.getRoom.bind(this),
        creepTypeDef.hp,
        creepTypeDef.attackDamage,
        creepTypeDef.attackCooldown,
        creepTypeDef.attackRange,
        creepTypeDef.defense,
        creepTypeDef.spawnTimeout,
        creepTypeDef.attackSprite,
        creepPos.type,
        creepPos.direction ? creepPos.direction : undefined
      )

      this.broadcast('CREATE_CREEP', {
        id,
        team,
        x: creep.x,
        y: creep.y,
        neutralType: creepPos.type,
        maxHP: creepTypeDef.hp
      })
    }
  }

  spawnTeamCreeps() {
    for (const creepDef of creepsDef.team) {
      for (const team of ['blue', 'red']) {
        const id = `creep-${this.lastCreepId++}`

        const waypoints = team === 'blue' ? _.clone(creepDef.waypoints) : _.clone(creepDef.waypoints.slice().reverse())

        const creep = this.state.creeps[id] = new Creep(
          id,
          team,
          waypoints[0][0] * 32,
          waypoints[0][1] * 32,
          waypoints,
          this.getRoom.bind(this)
        )

        this.broadcast('CREATE_CREEP', {
          id,
          team,
          x: creep.x,
          y: creep.y,
          maxHP: creep.maxHP
        })
      }
    }
  }

  deleteProjectile(id: string) {
    this.broadcast('DELETE_PROJECTILE', { id })
    delete this.state.projectiles[id]
  }

  getDistanceToCollision(line: Phaser.Geom.Line) {
    const intersection = Phaser.Geom.Intersects.GetLineToPolygon(line, this.collisionPolygons)
    return intersection ? Phaser.Math.Distance.Between(line.x1, line.y1, intersection.x, intersection.y) : 999999
  }

  deleteCreep(id: string) {
    this.broadcast('DELETE_CREEP', { id })
    delete this.state.creeps[id]
  }

  onDispose() {
    for (const interval of this.intervals)
      clearInterval(interval)
  }
}
