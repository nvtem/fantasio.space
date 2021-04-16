export interface Projectile {
  owner: {
    type: string,
    id: string
  },
  victim: {
    type: string,
    id: string
  },
  team: string,
  x: number,
  y: number,
  type: string,
  damage: number,
  rotation: number
}

export interface NetMessage {
  [key: string]: any
}

export interface ChatMessage {
  author: string,
  text: string,
  crown: string,
  team: string
}

export interface ChatMessages {
  messages: ChatMessage[],
  updatedAt: number
}

export interface SkillPower {
  [key: string]: number
}

export type Skill = {
  name: string,
  fullName: string,

  power?: SkillPower[],

  width?: number,
  height?: number
  radius?: number,

  manaCost: number[],
  cooldown: number[],

  description: string,
  animFrameWidth: number,
  animFrameHeight: number,
  animFrameRate: number,
  numberOfFrames: number,
  currentCooldown?: number
}

export type Item = {
  name: string,
  fullName: string,
  description: string,
  cost: number,
  usable?: boolean,
  power?: {
    [key: string]: number
  },
  effect?: {
    [key: string]: number
  },
  animation?: {
    frameWidth: number,
    frameHeight: number,
    frameRate: number,
    numberOfFrames: number
  }
}

// export type TCreepDef = {
//   team: 'blue' | 'red'
//   spawnX: number,
//   spawnY: number,
//   waypoints: number[][]
// }