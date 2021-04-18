import Phaser from "phaser"
import skills from "../data/skills.json"
import * as colyseus from "colyseus.js"
import Player from './Player'
import _ from 'lodash'
import geometry from '../data/geometry.json'
import Tower from './Tower'
import Throne from './Throne'
import items from '../data/items.json'
import type { Item, ChatMessages } from '../types'
import Creep from './Creep'
import towerPositions from '../data/towers.json'
import { sleep, loadCollisionPolygonPoints } from '../common/functions'

declare const window: any

const name = localStorage.name
const accessHash = localStorage.accessHash
const isProduction = process.env.NODE_ENV === 'production'
const options: any = {}

Object.keys(localStorage).forEach((key) => {
  if (key.startsWith('_')) {
    let value: string | boolean = localStorage.getItem(key)

    switch (value) {
      case 'true':
        value = true
        break
      case 'false':
        value = false
        break
    }

    options[key.substr(1)] = value
  }
})

window.options = options

export default class BattleScene extends Phaser.Scene {
  needToCheckConnection = true
  runes: Phaser.GameObjects.Sprite[] = []

  teamKills = {
    blue: 0,
    red: 0
  }

  startedAt = Date.now()

  cameraScrollSpeed = 30

  movementOrderGO: Phaser.GameObjects.Sprite
  projectiles = {}
  attackLine: Phaser.GameObjects.Line
  myPlayer: Player
  players: { [key: string]: Player } = {}
  cursors: { [key: string]: any }
  camera: Phaser.Cameras.Scene2D.Camera
  mapWidth: number = 3200
  mapHeight: number = 3300
  needUpdate = false
  room: colyseus.Room
  map: Phaser.Tilemaps.Tilemap
  mapObjectsTileset: Phaser.Tilemaps.Tileset
  towers: Tower[] = []
  thrones: Throne[] = []

  chatMessages: ChatMessages = {
    messages: [],
    updatedAt: Date.now()
  }

  onlinePlayers: {
    [key: string]: object
  }
  lastPongMessageReceivedAt: number = 0
  myPlayerSpawned: boolean
  creeps: {
    [key: string]: Creep
  } = {}

  focusedPlayer: Player = null

  setRoomOnMessageEventListener() {
    this.room.onMessage('*', (type, msg) => {
      if (this.needUpdate || type === 'SPAWN') {
        let id = (msg && msg.id) ? msg.id : ''

        switch (type) {
          case 'SPAWN':
            this.players[this.room.sessionId] = this.myPlayer = new Player(this, this.room, true, 'blue', 'warrior', this.myPlayer)
            this.focusedPlayer = this.myPlayer
            this.myPlayer.setProps(msg.playerState)
            this.myPlayerSpawned = true
            break

          case 'PONG':
            this.lastPongMessageReceivedAt = Date.now()
            break

          case 'BATTLE_MESSAGE':
            document.dispatchEvent(new CustomEvent('battle-message-received', { detail: msg }))
            break

          case 'PLAY_ANIM':
            if (msg.targetType === 'player') {
              const player = this.players[msg.sessionId]
              player.playAnim(msg.type, msg.rotation)
            } else if (msg.targetType === 'tower') {
              const tower = this.towers[msg.index]
              tower.playAttackAnim(msg.rotation)
            } else if (msg.targetType === 'creep') {
              const creep = this.creeps[id]
              creep.playAnim('projectile-fire', msg.rotation)
            }
            break

          case 'FOCUS_ON_HERO':
            if (this.myPlayerSpawned)
              this.camera.startFollow(this.myPlayer.bodyGO)
            this.focusedPlayer = this.myPlayer
            break

          case 'SHOW_MESSAGE':
            document.dispatchEvent(new CustomEvent('server-message-received', {
              detail: msg.text
            }))
            break

          case 'HIDE_MESSAGE':
            document.dispatchEvent(new CustomEvent('hide-server-message-command-received'))
            break

          case 'BATTLE_STATS':
            document.dispatchEvent(new CustomEvent('received-battle-stats', { detail: msg }))
            if (msg.endBattle)
              this.needToCheckConnection = false
            break

          case 'CREATE_PLAYER':
            this.players[msg.sessionId] = new Player(this, this.room, false, msg.team, msg.gameClass, this.myPlayer)
            break

          case 'DELETE_PLAYER':
            const player = this.players[msg.sessionId]
            player.destroy()
            delete this.players[msg.sessionId]
            break

          case 'CREATE_CREEP':
            this.creeps[id] = new Creep(msg.team, id, msg.x, msg.y, this, msg.neutralType ? msg.neutralType : '', msg.maxHP)
            break

          case 'DELETE_CREEP':
            const creep = this.creeps[id]
            if (creep) {
              creep.destroy()
              delete this.creeps[id]
            }
            break

          case 'CREATE_PROJECTILE':
            this.projectiles[id] = this.physics.add.sprite(msg.x, msg.y, msg.type)
            this.projectiles[id].depth = 300
            this.projectiles[id].rotation = msg.rotation
            break

          case 'DELETE_PROJECTILE':
            if (this.projectiles[id]) {
              this.projectiles[id].destroy()
              delete this.projectiles[id]
            }
            break

          case 'CREATE_RUNE':
            this.runes[id] = this.add.sprite(msg.x, msg.y, 'rune-' + msg.type)
            break

          case 'DELETE_RUNE':
            this.runes[id].destroy()
            delete this.runes[id]
            break

          case 'CHAT_MESSAGE':
            this.chatMessages.messages.push(msg)
            this.chatMessages.updatedAt = Date.now()
            break

          case 'PLAY_VISUAL_EFFECT':
            const gameObject = this.add.sprite(msg.x, msg.y, 'effect-' + msg.name)
            gameObject.depth = 500

            if (msg.attachToPlayer)
              this.myPlayer.attachedEffectGO = gameObject

            sleep(1000).then(() => {
              gameObject.destroy()

              if (msg.attachToPlayer)
                delete this.myPlayer.attachedEffectGO
            })
            break
        }
      }
    })
  }

  setRoomOnStateChangeEventListener() {
    this.room.onStateChange(state => {
      this.updateBuildings(state)
      this.updatePlayers(state.players)
      this.updateCreeps(state.creeps)
      this.updateProjectiles(state.projectiles)

      this.teamKills = state.teamKills
    })
  }

  setInputListeners() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { worldX: x, worldY: y}  = this.input.mousePointer

      if (pointer.button === 2) {
        let move = true

        for (const [sessionId, player] of Object.entries<Player>(this.players)) {
          if (Phaser.Geom.Circle.Contains(player.circle, x, y) && player.team !== this.myPlayer.team && player.visible) {
            this.myPlayer.setTarget('player', sessionId)
            move = false
            break
          }
        }

        for (const [id, creep] of Object.entries<Creep>(this.creeps)) {
          if (Phaser.Geom.Circle.Contains(creep.circle, x, y) && creep.team !== this.myPlayer.team) {
            this.myPlayer.setTarget('creep', id)
            move = false
            break
          }
        }

        for (const [index, tower] of this.towers.entries()) {
          if (tower.rect.contains(x, y) && tower.team !== this.myPlayer.team && tower.hp > 0) {
            this.myPlayer.setTarget('tower', index.toString())
            move = false
            break
          }
        }

        for (const [index, throne] of this.thrones.entries()) {
          if (throne.rect.contains(x, y) && throne.team !== this.myPlayer.team) {
            this.myPlayer.setTarget('throne', index.toString())
            move = false
            break
          }
        }

        if (move) {
          const key = this.input.keyboard.addKey('SHIFT')
          const attack = key.isDown
          const anim = attack ? 'movement-order-attack' : 'movement-order'

          this.movementOrderGO.setVisible(true).setPosition(x, y)
          this.movementOrderGO.anims.play(anim)
          this.myPlayer.moveTo(x, y, attack)
        }

        this.focusedPlayer = this.myPlayer

      } else if (pointer.button === 0) {
        let onPlayer = false

        for (const [sessionId, player] of Object.entries<Player>(this.players)) {
          if (Phaser.Geom.Circle.Contains(player.circle, x, y) && player.visible) {
            this.focusedPlayer = this.players[sessionId]
            onPlayer = true
            break
          }
        }

        if (!onPlayer)
          this.focusedPlayer = this.myPlayer
      }
    })

    for (const [index, key] of ['ONE', 'TWO', 'THREE', 'FOUR'].entries()) {
      this.input.keyboard.addKey(key, false).on('down', () => {
        if (!this.myPlayer.animGO.anims.isPlaying && !window.chatIsActive)
          this.myPlayer.useSkill(
            this.myPlayer.skills[index].name,
            this.input.mousePointer.worldX,
            this.input.mousePointer.worldY,
            index
          )
      })
    }

    for (const [index, key] of ['Z', 'X', 'C', 'V'].entries()) {
      this.input.keyboard.addKey(key, false).on('down', () => {
        if (!this.myPlayer.animGO.anims.isPlaying && !window.chatIsActive)
          this.myPlayer.useItem(index)
      })
    }

    this.input.keyboard.addKey('SPACE', false).on('down', () => {
      if (!window.chatIsActive) {
        this.camera.startFollow(this.myPlayer.bodyGO, false, 0.2, 0.2)
        this.focusedPlayer = this.myPlayer
      }
    })

  }

  createBuildings() {
    const towersSG = this.physics.add.staticGroup()
    this.towers = towerPositions.map((position, index) => {
      const team = index <= 8 ? 'blue' : 'red'
      const x = position[0] * 32
      const y = (position[1] - 2) * 32
      return new Tower(this, towersSG, x, y, team, this.myPlayer)
    })

    const thronesSG = this.physics.add.staticGroup()
    this.thrones = [
      new Throne(this, thronesSG, geometry.thrones.positions.blue.x, geometry.thrones.positions.blue.y, 'blue'),
      new Throne(this, thronesSG, geometry.thrones.positions.red.x, geometry.thrones.positions.red.y, 'red')
    ]

    this.physics.add.collider(this.myPlayer.bodyGO, towersSG)
    this.physics.add.collider(this.myPlayer.bodyGO, thronesSG)
  }

  updateBuildings(state: any) {
    for (const [index, localTower] of this.towers.entries()) {
      const onlineTower = state.towers[index]
      localTower.updateHP(onlineTower.hp)
    }

    for (const [index, localThrone] of this.thrones.entries()) {
      const onlineThrone = state.thrones[index]
      localThrone.updateHP(onlineThrone.hp)
    }
  }

  updateCreeps(onlineCreeps: object) {
    for (const id in this.creeps) {
      const localCreep = this.creeps[id]
      const onlineCreep = onlineCreeps[id]
      if (onlineCreep) {
        localCreep.setPosition(onlineCreep.x, onlineCreep.y)
        localCreep.updateDirection(onlineCreep.direction)
        localCreep.setHP(onlineCreep.hp)
      }
    }
  }

  updatePlayers(onlinePlayers: any) {
    this.onlinePlayers = onlinePlayers

    for (const sessionId in this.players) {
      const localPlayer = this.players[sessionId]
      const onlinePlayer = onlinePlayers[sessionId]
      localPlayer.setPosition(onlinePlayer.x, onlinePlayer.y)
      localPlayer.setProps(onlinePlayer)
    }
  }

  updateProjectiles(onlineProjectiles: any) {
    if (document.hasFocus()) {
      for (const [id, projectile] of Object.entries<any>(this.projectiles)) {
        if (onlineProjectiles[id]) {
          const onlineProjectile = onlineProjectiles[id]
          this.add.tween({
            targets: projectile,
            duration: 50,
            x: onlineProjectile.x,
            y: onlineProjectile.y
          })
          projectile.rotation = onlineProjectile.rotation
        }
      }
    }
  }

  loadSpritesheets() {
    for (const skill of skills) {
      const url = `/images/skill-anims/${skill.name}.png`

      this.load.spritesheet(`skill-${skill.name}`, url, {
        frameWidth: skill.animFrameWidth,
        frameHeight: skill.animFrameHeight
      })
    }

    for (const item of <Item[]> Object.values(items)) {
      if (item.animation) {
        const url = `/images/item-anims/${item.name}.png`
        this.load.spritesheet(`item-${item.name}`, url, {
          frameWidth: item.animation.frameWidth,
          frameHeight: item.animation.frameHeight
        })
      }
    }

    this.load.spritesheet('movement-order', '/images/spritesheets/movement-order.png', {
      frameWidth: 50,
      frameHeight: 50
    })

    this.load.spritesheet('movement-order-attack', '/images/spritesheets/movement-order-attack.png', {
      frameWidth: 50,
      frameHeight: 50
    })

    this.load.spritesheet('heroes', '/images/spritesheets/heroes.png', {
      frameWidth: 48,
      frameHeight: 48
    })

    this.load.spritesheet('creeps', '/images/spritesheets/creeps.png', {
      frameWidth: 44,
      frameHeight: 44
    })

    this.load.spritesheet('dragon', '/images/spritesheets/dragon.png', {
      frameWidth: 72,
      frameHeight: 72
    })
  }

  loadImages() {
    this.load.image('rune-double-damage', '/images/runes/double-damage.png')

    this.load.image('pointer', '/images/pointer.png')
    this.load.image('pointer-red', '/images/pointer-red.png')

    this.load.image('effect-level-up', '/images/effects/level-up.png')
    this.load.image('effect-money-20', '/images/effects/money-20.png')
    this.load.image('effect-money-100', '/images/effects/money-100.png')

    this.load.image('projectile-blue-tower', '/images/projectiles/blue-tower.png')
    this.load.image('projectile-red-tower', '/images/projectiles/red-tower.png')
    this.load.image('projectile-mage', '/images/projectiles/mage.png')
    this.load.image('projectile-fire', '/images/projectiles/fire.png')
    this.load.image('projectile-assassin', '/images/projectiles/assassin.png')

    this.load.image('map-objects', '/images/spritesheets/map-objects.png')
    this.load.image('ground', '/images/ground.jpg')
    this.load.image('empty', '/images/empty.png')

    this.load.image('blue-tower', '/images/buildings/blue-tower.png')
    this.load.image('red-tower', '/images/buildings/red-tower.png')
    this.load.image('throne', '/images/buildings/throne.png')
  }

  createAnimations() {
    // загрузка анимаций скиллов
    for (const skill of skills)
      this.anims.create({
        key: skill.name,
        frames: this.anims.generateFrameNumbers(`skill-${skill.name}`, {start: 0, end: skill.numberOfFrames - 1}),
        frameRate: skill.animFrameRate,
        repeat: 0
      })

    // загрузка анимаций предметов
    for (const item of <Item[]> Object.values(items))
      if (item.animation)
        this.anims.create({
          key: item.name,
          frames: this.anims.generateFrameNumbers(`item-${item.name}`, { start: 0, end: item.animation.numberOfFrames - 1 }),
          frameRate: item.animation.frameRate,
          repeat: 0
        })

    // загрузка анимации метки движения (зеленой)
    this.anims.create({
      key: 'movement-order',
      frames: this.anims.generateFrameNumbers('movement-order', { start: 0, end: 10 }),
      frameRate: 40,
      repeat: 0
    })


    // загрузка анимации метки движения (красной)
    this.anims.create({
      key: 'movement-order-attack',
      frames: this.anims.generateFrameNumbers('movement-order-attack', { start: 0, end: 10 }),
      frameRate: 40,
      repeat: 0
    })

    const firstFrameIndexes = {
      heroes: {
        'warrior-up': 45,
        'warrior-right': 30,
        'warrior-down': 0,
        'warrior-left': 15,

        'assassin-up': 111,
        'assassin-right': 96,
        'assassin-down': 66,
        'assassin-left': 81,

        'mage-up': 114,
        'mage-right': 99,
        'mage-down': 69,
        'mage-left': 84,

        'undead-up': 57,
        'undead-right': 42,
        'undead-down': 12,
        'undead-left': 27,
      },
      creeps: {
        'creep-blue-up': 9,
        'creep-blue-right': 6,
        'creep-blue-down': 0,
        'creep-blue-left': 3,

        'creep-red-up': 21,
        'creep-red-right': 18,
        'creep-red-down': 12,
        'creep-red-left': 15,

        'creep-neutral-bat-up': 33,
        'creep-neutral-bat-right': 30,
        'creep-neutral-bat-down': 24,
        'creep-neutral-bat-left': 27,

        'creep-neutral-beaver-up': 45,
        'creep-neutral-beaver-right': 42,
        'creep-neutral-beaver-down': 36,
        'creep-neutral-beaver-left': 39,

        'creep-neutral-eye-up': 57,
        'creep-neutral-eye-right': 54,
        'creep-neutral-eye-down': 48,
        'creep-neutral-eye-left': 51,
      },
      dragon: {
        'creep-neutral-dragon-up': 9,
        'creep-neutral-dragon-right': 6,
        'creep-neutral-dragon-down': 0,
        'creep-neutral-dragon-left': 3,
      }
    }

    for (const spritesheetKey of ['heroes', 'creeps', 'dragon']) {
      for (const key in firstFrameIndexes[spritesheetKey]) {
        const frameNo = firstFrameIndexes[spritesheetKey][key]

        const frames1 = this.anims.generateFrameNumbers(spritesheetKey, {
          start: frameNo,
          end: frameNo + 2
        })

        const frames2 = this.anims.generateFrameNumbers(spritesheetKey, {
          start: frameNo + 1,
          end: frameNo + 1
        })

        const frames = frames1.concat(frames2)

        this.anims.create({
          key,
          frames,
          frameRate: 6,
          repeat: -1
        })

        this.anims.create({
          key: `${key}-stay`,
          frames: this.anims.generateFrameNumbers(spritesheetKey, {
            start: frameNo + 1,
            end: frameNo + 1
          }),
          frameRate: 1,
          repeat: 1
        })
      }
    }
  }

  connectToRoom() {
    let protocol
    let port

    if (isProduction) {
      protocol = 'wss://'
      port = 500
    } else {
      protocol = 'ws://'
      port = 1500
    }

    const url = `${protocol}${location.hostname}:${port}`
    const colyseusClient = new colyseus.Client(url)

    colyseusClient.joinOrCreate('battle', { name, accessHash }).then(room => {
      this.initColyseusRoom(room)
    })
      .catch(e => {
        alert("Error! Can't join the battle.")
        location.href = '/'
      })
  }

  initColyseusRoom(room: colyseus.Room) {
    this.room = room
    this.room.onMessage('*', () => {})
  }

  async preload() {
    this.loadImages()
    this.loadSpritesheets()
    this.load.tilemapTiledJSON('map', 'map.json')
  }

  async create() {
    this.attackLine = this.add.line()
    window.chatIsActive = false
    this.connectToRoom()
    document.dispatchEvent(new Event('hide-loading-and-show-ui'))
    this.input.setDefaultCursor('url(/images/pointer.png), pointer')

    if (!(name && accessHash))
      location.href = '/'

    this.createAnimations()

    this.add.image(0, 0, 'ground').setOrigin(0, 0)
    this.map = this.make.tilemap({ key: 'map' })
    this.mapObjectsTileset = this.map.addTilesetImage('map-objects', 'map-objects')
    this.map.createLayer('objectsWithoutCollision', this.mapObjectsTileset, 0, 0)
    this.map.createLayer('objectsWithCollision', this.mapObjectsTileset, 0, 0)
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight)

    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }, false)

    this.input.on('wheel', (pointer: Phaser.Input.Pointer, currentlyOver: never, dx: number, dy: number) => {
      let zoom = dy > 0 ? this.camera.zoom - 0.05 : this.camera.zoom + 0.05

      const min = 0.5 * this.getScreenWidthMultiplier()
      const max = 2 * this.getScreenWidthMultiplier()

      if (zoom < min)
        zoom = min
      else if (zoom > max)
        zoom = max

      this.camera.setZoom(zoom)
    })

    while (!this.room)
      await sleep(100)

    this.setRoomOnMessageEventListener()

    this.needUpdate = true

    this.room.send('NEED_SPAWN', {
      name,
      accessHash
    })

    while (!this.myPlayerSpawned)
      await sleep(100)

    this.camera = this.cameras.main
    this.camera.startFollow(this.myPlayer.bodyGO, false, 0.2, 0.2)
    this.camera.setBounds(0, 0, this.mapWidth, this.mapHeight)
    this.camera.setZoom(this.getScreenWidthMultiplier())

    this.createBuildings()
    this.setRoomOnStateChangeEventListener()
    this.setInputListeners()

    this.needUpdate = true
    this.lastPongMessageReceivedAt = Date.now()

    setInterval(() => {
      if (this.needToCheckConnection && Date.now() - this.lastPongMessageReceivedAt > 3000) {
        alert('Connection lost')
        location.href = '/'
      }
    }, 5000)

    this.attackLine = this.add.line(0, 0, 0, 0, 0, 0, 0xff0000).setOrigin(0, 0)
    this.movementOrderGO = this.add.sprite(0, 0, 'empty')

    if (options.showCollisions)
      loadCollisionPolygonPoints('collisions').forEach(points => {
        this.add.polygon(0, 0, points, 0xff0000, 0.3).setOrigin(0, 0)
      })
  }

  getMyPlayerForUI = ((includeFunctions = true) => {
    let result = _.pick(this.focusedPlayer, [
      'stats', 'effects', 'needExpToNextLevel', 'skillLevels', 'freeSkillPoints', 'level',
      'exp', 'characteristics', 'hp', 'mana', 'maxHP', 'maxMana', 'attackSpeed', 'attackDamage', 'movementSpeed',
      'hpRegen', 'manaRegen', 'money', 'defense', 'canBuyItems', 'team', 'gameClass',
      'name', 'my'
    ])

    if (this.focusedPlayer) {
      result = {
        ...result,

        items: this.focusedPlayer ? _.cloneDeep(this.focusedPlayer.items) : [],
        skills: _.cloneDeep(this.focusedPlayer.skills)
      }

      if (includeFunctions)
        ['changeTeamAndClass', 'sendMessage', 'buyItem', 'sellItem', 'increaseSkillLevel', 'useItem']
          .forEach((propName: string) =>
            result[propName] = this.myPlayer[propName].bind(this.myPlayer))
    }

    return result
  }).bind(this)

  getChatMessagesForUI = (() => {
    return this.chatMessages
  }).bind(this)

  getPlayersForUI = (() => {
    return _.cloneDeep(this.onlinePlayers)
  }).bind(this)

  getTeamKillsForUI = (() => {
    return this.teamKills
  }).bind(this)

  updateUnitHPBarsAndInteractive() {
    this.towers.forEach(tower => {
      tower.setInteractive()
      tower.fillHPBar()
    })

    Object.values(this.creeps).forEach(creep => {
      creep.setInteractive()
      creep.fillHPBar()
    })
  }

  getScreenWidthMultiplier() {
    return window.innerWidth / 1366
  }

  update() {
    if (!this.needUpdate)
      return

    if (this.myPlayerSpawned) {
      let targetX: number
      let targetY: number

      const targetType = this.myPlayer.target.type
      const targetId = this.myPlayer.target.id

      let drawLine = false

      switch (targetType) {
        case 'creep':
          if (this.creeps[targetId]) {
            targetX = this.creeps[targetId].x
            targetY = this.creeps[targetId].y
            drawLine = true
          }
          break

        case 'player':
          if (this.players[targetId]) {
            targetX = this.players[targetId].x
            targetY = this.players[targetId].y
            drawLine = true
          }
          break

        case 'tower':
          targetX = this.towers[targetId].x + 15
          targetY = this.towers[targetId].y + 30
          drawLine = true
          break

        case 'throne':
          targetX = this.thrones[targetId].x + 75
          targetY = this.thrones[targetId].y + 60
          drawLine = true
          break

        case 'none':
        case 'point':
          this.attackLine.setVisible(false)
          break
      }

      if (drawLine) {
        if (!this.attackLine.visible)
          this.attackLine.setVisible(true)

        this.attackLine.setTo(this.myPlayer.x, this.myPlayer.y, targetX, targetY)
      }
    }

    if (options.showTechStats)
      window.techStats.innerHTML = Math.floor(this.game.loop.actualFps) + ' fps'

    if (!window.chatIsActive) {
      let stopFollow = false

      if (this.cursors.left.isDown) {
        stopFollow = true
        this.camera.scrollX -= this.cameraScrollSpeed
      }

      if (this.cursors.right.isDown) {
        stopFollow = true
        this.camera.scrollX += this.cameraScrollSpeed
      }

      if (this.cursors.up.isDown) {
        stopFollow = true
        this.camera.scrollY -= this.cameraScrollSpeed
      }

      if (this.cursors.down.isDown) {
        stopFollow = true
        this.camera.scrollY += this.cameraScrollSpeed
      }

      if (stopFollow)
        this.camera.stopFollow()
    }
  }
}
