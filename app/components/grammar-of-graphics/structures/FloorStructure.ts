/**
 * Grammar of Shelter — Floor Structure Definition
 * 
 * Defines what a FLOOR is: material and level for each room type.
 */

import { FloorConfig, MaterialType, RoomType } from '../types';

/**
 * Determines floor material based on room type.
 */
function getFloorMaterial(roomType: RoomType): MaterialType {
  switch (roomType) {
    case 'bathroom':
      return 'tile_marble';
    case 'kitchen':
      return 'tile_ceramic';
    case 'bedroom':
      return 'carpet_beige';
    case 'living_room':
    case 'dining_room':
    case 'office':
      return 'wood_oak';
    case 'hallway':
    case 'entry':
      return 'tile_ceramic';
    case 'garage':
    case 'utility':
      return 'concrete';
    case 'balcony':
    case 'patio':
      return 'tile_ceramic';
    case 'closet':
      return 'carpet_grey';
    default:
      return 'wood_oak';
  }
}

export class FloorStructure {
  readonly config: FloorConfig;

  constructor(
    public readonly roomType: RoomType = 'generic',
    level: number = 0
  ) {
    this.config = {
      material: getFloorMaterial(roomType),
      level,
    };
  }

  get material(): MaterialType { return this.config.material; }
  get level(): number { return this.config.level; }
}
