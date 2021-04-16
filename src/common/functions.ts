import map from '../data/map.json'

export function loadCollisionPolygonPoints(layerName: string) {
  const polygonPoints = []

  let layerObjects
  for (const l of map.layers) {
    if (l.name === layerName && l.objects) {
      layerObjects = l.objects
      break
    }
  }

  for (const obj of layerObjects) {
    let i = 0
    let first

    const points = (obj as any).polygon.map((point: { x: number, y: number }) => {
      let o = {
        x: point.x + obj.x,
        y: point.y + obj.y
      }

      if (i === 0)
        first = o

      i++

      return o
    })

    points.push(first)
    polygonPoints.push(points)
  }

  return polygonPoints
}

export function pointInRectangle(x: number, y: number, rect: Phaser.Geom.Rectangle) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function convertIndexToCoordinate(n: number) {
  return n * 32 + 16
}