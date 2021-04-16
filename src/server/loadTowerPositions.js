const map = require("../data/map.json")
const fs = require("fs")
const _ = require('lodash')

const towerPositionsLayer = _.chunk(map.layers[4].data, 100)
const towerPositions = []
const offset = 12023

for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    const tileID = towerPositionsLayer[y][x]
    if (tileID > 0)
      towerPositions[tileID - offset] = [x, y]
  }
}

fs.writeFileSync('../data/towers.json', JSON.stringify(towerPositions))