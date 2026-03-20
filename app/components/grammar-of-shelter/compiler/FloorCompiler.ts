/**
 * Grammar of Shelter — Floor Compiler
 * 
 * Creates floor planes for each room using appropriate materials.
 */

import * as THREE from 'three';
import { ParsedRoom } from '../types';
import { FloorStructure } from '../structures/FloorStructure';
import { getMaterial } from './MaterialLibrary';

/**
 * Compile a single room's floor into a PlaneGeometry mesh.
 */
function compileRoomFloor(room: ParsedRoom): THREE.Mesh {
  const structure = new FloorStructure(room.roomType, room.floorLevel);
  const material = getMaterial(structure.material);

  const width = room.bounds.maxX - room.bounds.minX;
  const depth = room.bounds.maxZ - room.bounds.minZ;

  const geometry = new THREE.PlaneGeometry(width, depth);

  const mesh = new THREE.Mesh(geometry, material);

  // Rotate to lay flat (PlaneGeometry faces +Y by default)
  mesh.rotation.x = -Math.PI / 2;

  // Position at the center of the room, at floor level
  mesh.position.set(
    room.center.x,
    structure.level * 0.01, // tiny offset to avoid z-fighting
    room.center.z
  );

  mesh.receiveShadow = true;
  mesh.userData = {
    type: 'floor',
    roomId: room.id,
    roomName: room.name,
    roomType: room.roomType,
    isCollider: false,
  };

  return mesh;
}

/**
 * Compile all room floors.
 * 
 * @param rooms - Parsed rooms
 * @returns A Three.js Group containing all floor planes
 */
export function compileFloors(rooms: ParsedRoom[]): THREE.Group {
  const floorGroup = new THREE.Group();
  floorGroup.name = 'floors';

  for (const room of rooms) {
    floorGroup.add(compileRoomFloor(room));
  }

  return floorGroup;
}
