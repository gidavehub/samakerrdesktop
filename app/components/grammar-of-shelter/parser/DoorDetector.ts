/**
 * Grammar of Shelter — Door Detector
 * 
 * Automatically places doors in shared (interior) walls.
 * 
 * Rules:
 * 1. Every shared wall between two rooms gets at least one door
 * 2. Doors are placed at the midpoint of the shared wall
 * 3. Door width depends on room types (bathroom = narrow, living = wide)
 * 4. All doors start open for navigation
 */

import {
  WallSegment, DoorPosition, ParsedRoom,
  EngineConfig, DEFAULT_ENGINE_CONFIG
} from '../types';
import { DoorStructure } from '../structures/DoorStructure';

/**
 * Detects and places doors in all interior (shared) walls.
 * Mutates the wall segments to add door references.
 * Returns the complete list of door positions.
 */
export function detectDoors(
  walls: WallSegment[],
  rooms: ParsedRoom[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): DoorPosition[] {
  const allDoors: DoorPosition[] = [];
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  let doorId = 0;

  for (const wall of walls) {
    // Only interior (shared) walls get doors
    if (wall.isExterior) continue;
    if (wall.roomIds.length < 2) continue;

    // Get the room types for contextual door sizing
    const room1 = roomMap.get(wall.roomIds[0]);
    const room2 = roomMap.get(wall.roomIds[1]);

    if (!room1 || !room2) continue;

    const doorStructure = new DoorStructure([room1.roomType, room2.roomType]);

    // Only place a door if the wall is long enough
    const minWallLengthForDoor = doorStructure.width + 0.4; // door + some wall on each side
    if (wall.length < minWallLengthForDoor) continue;

    const door: DoorPosition = {
      id: `door_${doorId++}`,
      wallId: wall.id,
      positionAlongWall: 0.5,  // centered
      width: Math.min(doorStructure.width, wall.length * 0.6), // don't exceed 60% of wall
      height: doorStructure.height,
      isOpen: true,
      connectsRooms: [wall.roomIds[0], wall.roomIds[1]],
    };

    wall.doors.push(door);
    allDoors.push(door);
  }

  return allDoors;
}
