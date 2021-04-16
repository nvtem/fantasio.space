import Phaser from 'phaser'
import { convertIndexToCoordinate } from "../common/functions"
import Unit from "./Unit"


export default abstract class Creature extends Unit {
  circle: Phaser.Geom.Circle
  hp: number
  id: string
  waypoints: number[][] = []
  sessionId?: string
  attackCooldown: number
  direction = 'down-stay'

  abstract getMovementSpeed(): number
  abstract setPosition(x: number, y: number): void

  constructor(public getRoom: Function) {
    super(getRoom)
  }

  step() {
    const maxDistance = this.getMovementSpeed() / 20

    if (this.waypoints[0]) {
      const [indexX, indexY] = this.waypoints[0]

      let x1, y1, x2, y2, oldX, oldY, newX, newY

      oldX = x1 = this.x
      oldY = y1 = this.y
      x2 = convertIndexToCoordinate(indexX)
      y2 = convertIndexToCoordinate(indexY)

      let angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
      const distance1 = Phaser.Math.Distance.Between(x1, y1, x2, y2)

      let line, distance

      let stay = false

      // не можем сделать дополнительный рывок
      if (distance1 > maxDistance) {
        distance = maxDistance
      } else if (!this.waypoints[1]) { // можем сделать рывок, но нет следующего вейпоинта
        distance = distance1
        this.waypoints.shift()
        this.target = { type: 'none' }
        stay = true
      } else { // можем сделать еще рывок
        x1 = convertIndexToCoordinate(this.waypoints[0][0])
        y1 = convertIndexToCoordinate(this.waypoints[0][1])
        x2 = convertIndexToCoordinate(this.waypoints[1][0])
        y2 = convertIndexToCoordinate(this.waypoints[1][1])

        angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
        distance = maxDistance - distance1

        this.waypoints.shift()
      }

      line = Phaser.Geom.Line.SetToAngle(
        new Phaser.Geom.Line(0, 0, 0, 0),
        x1,
        y1,
        angle,
        distance
      )

      newX = line.x2
      newY = line.y2

      this.setPosition(newX, newY)
      this.updateDirection(oldX, oldY, newX, newY, stay)

      if (this.type === 'player' && this.target.type === 'point') {
        const runes = this.getRoom().state.runes

        for (const id in runes) {
          const rune = runes[id]

          if (Phaser.Math.Distance.Between(rune.x, rune.y, this.x, this.y) < 32) {
            switch (rune.type) {
              case 'double-damage':
                (this as any).addEffect('double-damage', {
                  attackDamage: 100
                }, 60000)
                break
            }

            delete runes[id]
            this.getRoom().broadcast('DELETE_RUNE', {
              id
            })
          }
        }
      }
    }
  }

  updateDirection(x1: number, y1: number, x2: number, y2: number, stay: boolean) {
    const angle = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(x1, y1, x2, y2)
    )

    let direction = 'down-stay'

    if (angle >= -135 && angle < -45)
      direction = 'up'
    else if (angle >= -45 && angle < 45)
      direction = 'right'
    else if (angle >= 45 && angle < 135)
      direction = 'down'
    else if (angle >= 135 || angle < -135)
      direction = 'left'

    if (stay)
      direction += '-stay'

    if (direction !== this.direction)
      this.direction = direction
  }
}