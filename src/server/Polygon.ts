import '@geckos.io/phaser-on-nodejs'
import Phaser from 'phaser'

export default class Polygon {
  line1: Phaser.Geom.Line
  line2: Phaser.Geom.Line
  line3: Phaser.Geom.Line
  line4: Phaser.Geom.Line

  phaserPolygon: Phaser.Geom.Polygon

  constructor(x1: number, y1: number, x2: number, y2: number, rotation: number, width: number, height: number) {
    const translateAngle = (angle: number) => {
      if (angle < -180)
        return angle + 360
      else if (angle > 180)
        return angle - 360
      else
        return angle
    }

    let angleRad = rotation
    let angleDeg = Phaser.Math.RadToDeg(angleRad)

    // 1
    angleDeg = translateAngle(angleDeg - 90)
    angleRad = Phaser.Math.DegToRad(angleDeg)
    this.line1 = Phaser.Geom.Line.SetToAngle(new Phaser.Geom.Line(0, 0, 0, 0), x1, y1, angleRad, width / 2)

    // 2
    angleDeg = translateAngle(angleDeg + 90)
    angleRad = Phaser.Math.DegToRad(angleDeg)
    this.line2 = Phaser.Geom.Line.SetToAngle(new Phaser.Geom.Line(0, 0, 0, 0), this.line1.x2, this.line1.y2, angleRad, height)

    // 3
    angleDeg = translateAngle(angleDeg + 90)
    angleRad = Phaser.Math.DegToRad(angleDeg)
    this.line3 = Phaser.Geom.Line.SetToAngle(new Phaser.Geom.Line(0, 0, 0, 0), this.line2.x2, this.line2.y2, angleRad, width)

    // 4set
    angleDeg = translateAngle(angleDeg + 90)
    angleRad = Phaser.Math.DegToRad(angleDeg)
    this.line4 = Phaser.Geom.Line.SetToAngle(new Phaser.Geom.Line(0, 0, 0, 0), this.line3.x2, this.line3.y2, angleRad, height)

    this.phaserPolygon = new Phaser.Geom.Polygon([
      new Phaser.Geom.Point(this.line1.x2, this.line1.y2),
      new Phaser.Geom.Point(this.line2.x2, this.line2.y2),
      new Phaser.Geom.Point(this.line3.x2, this.line3.y2),
      new Phaser.Geom.Point(this.line4.x2, this.line4.y2)
    ])
  }

  intersectsWithRectangle(rect: Phaser.Geom.Rectangle) {
    for (const line of [this.line1, this.line2, this.line3, this.line4])
      if (Phaser.Geom.Intersects.LineToRectangle(line, rect))
        return true

    if (this.phaserPolygon.contains(rect.centerX, rect.centerY))
      return true

    return false
  }

  intersectsWithCircle(circle: Phaser.Geom.Circle) {
    for (const line of [this.line1, this.line2, this.line3, this.line4])
      if (Phaser.Geom.Intersects.LineToCircle(line, circle))
        return true

    if (this.phaserPolygon.contains(circle.x, circle.y))
      return true

    return false
  }
}