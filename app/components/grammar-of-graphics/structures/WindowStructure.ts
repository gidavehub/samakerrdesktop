/**
 * Grammar of Graphics — Window Structure Definition
 * 
 * Defines what a WINDOW is: width, height, sill height, frame, and glass.
 */

import { WindowConfig, MaterialType, RoomType } from '../types';

const DEFAULT_WINDOW: WindowConfig = {
  width: 1.2,
  height: 1.0,
  sillHeight: 0.9,
  frameThickness: 0.06,
  frameMaterial: 'door_white',
  glassMaterial: 'window_glass',
  paneCount: 2,
};

/**
 * Determines window configuration based on room type.
 */
function getWindowConfigForRoom(roomType: RoomType): Partial<WindowConfig> {
  switch (roomType) {
    case 'living_room':
    case 'dining_room':
      return { width: 1.5, height: 1.2, sillHeight: 0.8 };
    case 'bedroom':
      return { width: 1.2, height: 1.0, sillHeight: 0.9 };
    case 'bathroom':
      return { width: 0.6, height: 0.5, sillHeight: 1.5 };
    case 'kitchen':
      return { width: 1.0, height: 0.8, sillHeight: 1.0 };
    case 'garage':
      return { width: 0.8, height: 0.6, sillHeight: 1.6 };
    default:
      return {};
  }
}

export class WindowStructure {
  readonly config: WindowConfig;

  constructor(
    public readonly roomType: RoomType = 'generic',
    overrides: Partial<WindowConfig> = {}
  ) {
    const roomDefaults = getWindowConfigForRoom(roomType);
    this.config = { ...DEFAULT_WINDOW, ...roomDefaults, ...overrides };
  }

  get width(): number { return this.config.width; }
  get height(): number { return this.config.height; }
  get sillHeight(): number { return this.config.sillHeight; }
  get frameThickness(): number { return this.config.frameThickness; }
  get frameMaterial(): MaterialType { return this.config.frameMaterial; }
  get glassMaterial(): MaterialType { return this.config.glassMaterial; }
  get paneCount(): number { return this.config.paneCount; }
}
