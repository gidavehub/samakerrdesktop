/**
 * Grammar of Graphics — Floor Compiler
 * 
 * Creates floor planes for each room using appropriate materials.
 * Supports AI-detected floor colors from structural analysis.
 */

import * as THREE from 'three';
import { ParsedRoom } from '../types';
import { FloorStructure } from '../structures/FloorStructure';
import { getMaterial, createColorMaterial, getFloorRoughness } from './MaterialLibrary';

/**
 * Compile a single room's floor into a PlaneGeometry mesh.
 */
function compileRoomFloor(room: ParsedRoom): THREE.Mesh {
  let material: THREE.MeshStandardMaterial;

  // Use AI-detected floor color if available
  if (room.structuralAnalysis?.floorColor && room.structuralAnalysis?.floorMaterial) {
    const { roughness, metalness } = getFloorRoughness(room.structuralAnalysis.floorMaterial);
    material = createColorMaterial(room.structuralAnalysis.floorColor, roughness, metalness);
  } else {
    // Fallback to room-type-based material
    const structure = new FloorStructure(room.roomType, room.floorLevel);
    material = getMaterial(structure.material);
  }

  const width = room.bounds.maxX - room.bounds.minX;
  const depth = room.bounds.maxZ - room.bounds.minZ;

  const geometry = new THREE.PlaneGeometry(width, depth);

  const mesh = new THREE.Mesh(geometry, material);

  // Rotate to lay flat (PlaneGeometry faces +Y by default)
  mesh.rotation.x = -Math.PI / 2;

  // Position at the center of the room, at floor level
  const level = room.floorLevel || 0;
  mesh.position.set(
    room.center.x,
    level * 0.01, // tiny offset to avoid z-fighting
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
 */
export function compileFloors(rooms: ParsedRoom[]): THREE.Group {
  const floorGroup = new THREE.Group();
  floorGroup.name = 'floors';

  for (const room of rooms) {
    floorGroup.add(compileRoomFloor(room));
  }

  return floorGroup;
}
