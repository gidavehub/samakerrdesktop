/**
 * Grammar of Shelter — Wall Structure Definition
 * 
 * Defines what a WALL is: its physical properties, defaults,
 * and how to determine the right configuration for a given context.
 */

import { WallConfig, MaterialType, RoomType } from '../types';

/** Default wall configurations */
const INTERIOR_WALL: WallConfig = {
  height: 2.8,
  thickness: 0.15,
  material: 'plaster_white',
  exteriorMaterial: 'plaster_white',
};

const EXTERIOR_WALL: WallConfig = {
  height: 2.8,
  thickness: 0.25,
  material: 'plaster_white',
  exteriorMaterial: 'concrete',
};

/**
 * Determines the interior wall material based on room type.
 * Different rooms tend to have different wall finishes.
 */
function getMaterialForRoom(roomType: RoomType): MaterialType {
  switch (roomType) {
    case 'bathroom':
      return 'tile_white';
    case 'kitchen':
      return 'tile_ceramic';
    case 'garage':
    case 'utility':
      return 'concrete';
    default:
      return 'plaster_white';
  }
}

export class WallStructure {
  readonly config: WallConfig;

  constructor(
    public readonly isExterior: boolean = false,
    public readonly adjacentRoomTypes: RoomType[] = []
  ) {
    const base = isExterior ? { ...EXTERIOR_WALL } : { ...INTERIOR_WALL };

    // If we know which rooms border this wall, use the first room's material
    if (adjacentRoomTypes.length > 0) {
      base.material = getMaterialForRoom(adjacentRoomTypes[0]);
    }

    this.config = base;
  }

  get height(): number { return this.config.height; }
  get thickness(): number { return this.config.thickness; }
  get material(): MaterialType { return this.config.material; }
  get exteriorMaterial(): MaterialType { return this.config.exteriorMaterial; }
}
