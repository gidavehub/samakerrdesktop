/**
 * Grammar of Graphics — Door & Window Detector
 *
 * Places doors and windows directly based on AI structural and blueprint analysis.
 * Maps 'north', 'south', 'east', 'west' directives to exact wall segments.
 */

import {
  WallSegment, DoorPosition, WindowPosition, ParsedRoom,
  EngineConfig, DEFAULT_ENGINE_CONFIG
} from '../types';

/**
 * Helper to determine which side of the room a wall is on.
 * In our coordinate system:
 * - minZ = top = North
 * - maxZ = bottom = South
 * - minX = left = West
 * - maxX = right = East
 */
function getWallSide(wall: WallSegment, room: ParsedRoom): 'north' | 'south' | 'east' | 'west' | null {
  if (wall.orientation === 'horizontal') {
    return wall.start.z < room.center.z ? 'north' : 'south';
  } else {
    return wall.start.x < room.center.x ? 'west' : 'east';
  }
}

/**
 * Detects and places doors and windows in walls based on AI analysis.
 */
export function detectDoors(
  walls: WallSegment[],
  rooms: ParsedRoom[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): { doors: DoorPosition[]; windows: WindowPosition[] } {
  const allDoors: DoorPosition[] = [];
  const allWindows: WindowPosition[] = [];

  let doorId = 0;
  let windowId = 0;

  // Track which walls already have a door to prevent duplicates from shared rooms
  const wallsWithDoors = new Set<string>();

  for (const room of rooms) {
    // 1. Process Doors (Blueprint + Structural Photos)
    const doors = [
      ...(room.structuralAnalysis?.doors || []),
      ...(room.blueprintDoors || [])
    ];

    for (const aiDoor of doors) {
      if (!aiDoor.wall) continue;

      // Find the wall segment for this room that matches the requested side
      const targetWall = walls.find(w => w.roomIds.includes(room.id) && getWallSide(w, room) === aiDoor.wall.toLowerCase());

      if (targetWall && !wallsWithDoors.has(targetWall.id)) {
        const minLength = config.defaultDoorWidth + 0.2;
        if (targetWall.length >= minLength) {
          const doorPos: DoorPosition = {
            id: `door_${doorId++}`,
            wallId: targetWall.id,
            positionAlongWall: aiDoor.position || 0.5,
            width: config.defaultDoorWidth,
            height: config.defaultDoorHeight,
            isOpen: true,
            connectsRooms: [targetWall.roomIds[0], targetWall.roomIds[1] || 'outside'],
          };
          targetWall.doors.push(doorPos);
          allDoors.push(doorPos);
          wallsWithDoors.add(targetWall.id);
        }
      }
    }

    // 2. Process Windows (Blueprint + Structural Photos)
    const windows = [
      ...(room.structuralAnalysis?.windows || []),
      ...(room.blueprintWindows || [])
    ];

    for (const aiWin of windows) {
      if (!aiWin.wall) continue;

      // Find the wall segment for this room that matches the requested side
      const targetWall = walls.find(w => w.roomIds.includes(room.id) && getWallSide(w, room) === aiWin.wall.toLowerCase());

      if (targetWall) {
        // AI width or default
        const winWidth = aiWin.width || config.defaultWindowWidth;
        if (targetWall.length > winWidth + 0.2) {
          const winPos: WindowPosition = {
            id: `window_${windowId++}`,
            wallId: targetWall.id,
            positionAlongWall: aiWin.position || 0.5,
            width: winWidth,
            height: aiWin.height || config.defaultWindowHeight,
            sillHeight: aiWin.sillHeight || config.defaultWindowSillHeight,
            paneCount: aiWin.type === 'sliding' ? 2 : 1,
            frameColor: aiWin.color || '#ffffff'
          };
          targetWall.windows.push(winPos);
          allWindows.push(winPos);
        }
      }
    }
  }

  return { doors: allDoors, windows: allWindows };
}
