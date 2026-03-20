/**
 * Grammar of Shelter — Door Compiler
 * 
 * Creates visual door frame geometry for door openings.
 * The door aperture itself is empty (no collision) so the player can walk through.
 */

import * as THREE from 'three';
import { WallSegment, DoorPosition, ParsedRoom } from '../types';
import { DoorStructure } from '../structures/DoorStructure';
import { getMaterial } from './MaterialLibrary';

/**
 * Create a door frame mesh (the visual frame around the door opening).
 * The door frame consists of two vertical posts and a horizontal header.
 */
function compileDoorFrame(
  wall: WallSegment,
  door: DoorPosition,
  rooms: ParsedRoom[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = `door_frame_${door.id}`;

  const room1 = rooms.find(r => r.id === door.connectsRooms[0]);
  const room2 = rooms.find(r => r.id === door.connectsRooms[1]);

  const structure = new DoorStructure([
    room1?.roomType || 'generic',
    room2?.roomType || 'generic',
  ]);

  const frameMat = getMaterial(structure.frameMaterial);
  const frameThick = structure.frameThickness;

  // Door position in world space
  const t = door.positionAlongWall;
  const doorCenter = {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    z: wall.start.z + (wall.end.z - wall.start.z) * t,
  };

  const halfDoorWidth = door.width / 2;
  const isHorizontal = wall.orientation === 'horizontal';

  // Left post
  const leftPostGeo = new THREE.BoxGeometry(
    isHorizontal ? frameThick : wall.thickness + 0.02,
    door.height,
    isHorizontal ? wall.thickness + 0.02 : frameThick
  );
  const leftPost = new THREE.Mesh(leftPostGeo, frameMat);
  leftPost.position.set(
    doorCenter.x + (isHorizontal ? -halfDoorWidth : 0),
    door.height / 2,
    doorCenter.z + (isHorizontal ? 0 : -halfDoorWidth)
  );
  leftPost.userData = { type: 'door_frame', doorId: door.id, isCollider: false };
  group.add(leftPost);

  // Right post
  const rightPostGeo = new THREE.BoxGeometry(
    isHorizontal ? frameThick : wall.thickness + 0.02,
    door.height,
    isHorizontal ? wall.thickness + 0.02 : frameThick
  );
  const rightPost = new THREE.Mesh(rightPostGeo, frameMat);
  rightPost.position.set(
    doorCenter.x + (isHorizontal ? halfDoorWidth : 0),
    door.height / 2,
    doorCenter.z + (isHorizontal ? 0 : halfDoorWidth)
  );
  rightPost.userData = { type: 'door_frame', doorId: door.id, isCollider: false };
  group.add(rightPost);

  // Header (top bar)
  const headerGeo = new THREE.BoxGeometry(
    isHorizontal ? door.width + frameThick * 2 : wall.thickness + 0.02,
    frameThick,
    isHorizontal ? wall.thickness + 0.02 : door.width + frameThick * 2
  );
  const header = new THREE.Mesh(headerGeo, frameMat);
  header.position.set(
    doorCenter.x,
    door.height + frameThick / 2,
    doorCenter.z
  );
  header.userData = { type: 'door_frame', doorId: door.id, isCollider: false };
  group.add(header);

  return group;
}

/**
 * Compile all door frames for all walls.
 * 
 * @param walls - Wall segments (with doors attached)
 * @param rooms - Parsed rooms for context
 * @returns A Three.js Group containing all door frame geometry
 */
export function compileDoors(
  walls: WallSegment[],
  rooms: ParsedRoom[]
): THREE.Group {
  const doorGroup = new THREE.Group();
  doorGroup.name = 'doors';

  for (const wall of walls) {
    for (const door of wall.doors) {
      doorGroup.add(compileDoorFrame(wall, door, rooms));
    }
  }

  return doorGroup;
}
