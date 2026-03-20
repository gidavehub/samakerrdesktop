/**
 * Grammar of Shelter — Door Structure Definition
 * 
 * Defines what a DOOR is: width, height, frame, and behavior.
 */

import { DoorConfig, MaterialType, RoomType } from '../types';

const DEFAULT_DOOR: DoorConfig = {
  width: 0.9,
  height: 2.1,
  frameThickness: 0.08,
  frameMaterial: 'door_wood',
  isOpen: true,
};

/**
 * Determines door configuration based on which rooms it connects.
 * Bathrooms get narrower doors, living rooms get wider, etc.
 */
function getDoorConfigForRooms(roomTypes: [RoomType, RoomType]): Partial<DoorConfig> {
  const hasType = (t: RoomType) => roomTypes.includes(t);

  if (hasType('bathroom') || hasType('closet')) {
    return { width: 0.75, frameMaterial: 'door_white' };
  }
  if (hasType('living_room') || hasType('dining_room')) {
    return { width: 1.0 };
  }
  if (hasType('balcony') || hasType('patio')) {
    return { width: 1.2, frameMaterial: 'door_white' };
  }
  if (hasType('garage')) {
    return { width: 2.4, height: 2.4 };
  }
  return {};
}

export class DoorStructure {
  readonly config: DoorConfig;

  constructor(
    public readonly connectingRoomTypes: [RoomType, RoomType] = ['generic', 'generic']
  ) {
    const contextOverrides = getDoorConfigForRooms(connectingRoomTypes);
    this.config = { ...DEFAULT_DOOR, ...contextOverrides };
  }

  get width(): number { return this.config.width; }
  get height(): number { return this.config.height; }
  get frameThickness(): number { return this.config.frameThickness; }
  get frameMaterial(): MaterialType { return this.config.frameMaterial; }
  get isOpen(): boolean { return this.config.isOpen; }
}
