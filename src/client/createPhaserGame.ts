import Phaser from 'phaser'
import BattleScene from './BattleScene'

export default function createPhaserGame() {
  const config = {
    type: Phaser.AUTO,
    width: 1366,
    height: 768,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: document.querySelector('.game'),
    disableContextMenu: true,
    banner: false,
    transparent: true,
    //fps: 30,
    scene: [BattleScene]
  }

  // @ts-ignore
  return new Phaser.Game(config)
}

