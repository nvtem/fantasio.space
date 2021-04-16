import Phaser from "phaser";
import geometry from "../data/geometry.json";

export default {
  blue: new Phaser.Geom.Rectangle(geometry.safeZones.blue.x, geometry.safeZones.blue.y, geometry.safeZones.width, geometry.safeZones.height),
  red: new Phaser.Geom.Rectangle(geometry.safeZones.red.x, geometry.safeZones.red.y, geometry.safeZones.width, geometry.safeZones.height)
}