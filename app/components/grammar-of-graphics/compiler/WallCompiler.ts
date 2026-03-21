/**
 * Grammar of Graphics — Wall Compiler
 * 
 * Converts WallSegment data into Three.js BoxGeometry meshes.
 * 
 * For walls with doors or windows, the wall is split into segments:
 * - Left segment (before opening)
 * - Above-opening segment (lintel)
 * - Below-opening segment (sill, for windows only)
 * - Right segment (after opening)
 * 
 * Supports AI-detected wall colors from structural analysis.
 */

import * as THREE from 'three';
import { WallSegment, DoorPosition, WindowPosition, ParsedRoom } from '../types';
import { WallStructure } from '../structures/WallStructure';
import { getMaterial, createColorMaterial } from './MaterialLibrary';

/**
 * Get the appropriate wall material, using AI-detected color if available.
 */
function getWallMaterial(
  wall: WallSegment,
  rooms: ParsedRoom[]
): THREE.MeshStandardMaterial {
  // Check if any adjacent room has structural analysis with wall color
  for (const roomId of wall.roomIds) {
    const room = rooms.find(r => r.id === roomId);
    if (room?.structuralAnalysis?.wallColor) {
      return createColorMaterial(room.structuralAnalysis.wallColor, 0.9, 0.0);
    }
  }

  // Fallback to room-type-based material
  const roomTypes = wall.roomIds
    .map(id => rooms.find(r => r.id === id)?.roomType || 'generic');
  const structure = new WallStructure(wall.isExterior, roomTypes as any);
  return getMaterial(structure.material);
}

/**
 * Compute the world-space position of a door along a wall.
 */
function getDoorWorldPosition(wall: WallSegment, door: DoorPosition): { x: number; z: number } {
  const t = door.positionAlongWall;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    z: wall.start.z + (wall.end.z - wall.start.z) * t,
  };
}

/**
 * Represents a cutout in the wall (door or window opening).
 */
interface WallOpening {
  positionAlongWall: number;
  width: number;
  bottomY: number;  // 0 for doors, sillHeight for windows
  topY: number;     // door.height for doors, sillHeight + window.height for windows
  id: string;
  type: 'door' | 'window';
}

/**
 * Convert doors and windows into a unified opening list for wall segmentation.
 */
function getOpenings(wall: WallSegment): WallOpening[] {
  const openings: WallOpening[] = [];

  for (const door of wall.doors) {
    openings.push({
      positionAlongWall: door.positionAlongWall,
      width: door.width,
      bottomY: 0,
      topY: door.height,
      id: door.id,
      type: 'door',
    });
  }

  for (const win of wall.windows) {
    openings.push({
      positionAlongWall: win.positionAlongWall,
      width: win.width,
      bottomY: win.sillHeight,
      topY: win.sillHeight + win.height,
      id: win.id,
      type: 'window',
    });
  }

  return openings.sort((a, b) => a.positionAlongWall - b.positionAlongWall);
}

/**
 * Compile a single wall segment (no doors/windows) into a BoxGeometry mesh.
 */
function compileSimpleWall(
  wall: WallSegment,
  rooms: ParsedRoom[]
): THREE.Mesh {
  const material = getWallMaterial(wall, rooms);

  const length = wall.length;
  const height = wall.height;
  const thickness = wall.thickness;

  const geometry = new THREE.BoxGeometry(
    wall.orientation === 'horizontal' ? length : thickness,
    height,
    wall.orientation === 'horizontal' ? thickness : length
  );

  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    (wall.start.x + wall.end.x) / 2,
    height / 2,
    (wall.start.z + wall.end.z) / 2
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    type: 'wall',
    wallId: wall.id,
    isExterior: wall.isExterior,
    isCollider: true,
  };

  return mesh;
}

/**
 * Compile a wall with openings (doors and/or windows).
 */
function compileWallWithOpenings(
  wall: WallSegment,
  rooms: ParsedRoom[]
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { type: 'wall_group', wallId: wall.id };

  const material = getWallMaterial(wall, rooms);
  const height = wall.height;
  const thickness = wall.thickness;

  const openings = getOpenings(wall);

  let currentPos = 0; // 0 to 1 along wall

  for (const opening of openings) {
    const openingHalfWidth = (opening.width / wall.length) / 2;
    const openingStart = Math.max(0, opening.positionAlongWall - openingHalfWidth);
    const openingEnd = Math.min(1, opening.positionAlongWall + openingHalfWidth);

    // SOLID SEGMENT before this opening
    if (openingStart > currentPos + 0.01) {
      const segLength = (openingStart - currentPos) * wall.length;
      const segCenter = (currentPos + openingStart) / 2;

      const geo = new THREE.BoxGeometry(
        wall.orientation === 'horizontal' ? segLength : thickness,
        height,
        wall.orientation === 'horizontal' ? thickness : segLength
      );

      const mesh = new THREE.Mesh(geo, material);
      const cx = wall.start.x + (wall.end.x - wall.start.x) * segCenter;
      const cz = wall.start.z + (wall.end.z - wall.start.z) * segCenter;
      mesh.position.set(cx, height / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'wall', wallId: wall.id, isCollider: true };
      group.add(mesh);
    }

    // ABOVE-OPENING segment (lintel) — for both doors and windows
    const lintelHeight = height - opening.topY;
    if (lintelHeight > 0.05) {
      const geo = new THREE.BoxGeometry(
        wall.orientation === 'horizontal' ? opening.width : thickness,
        lintelHeight,
        wall.orientation === 'horizontal' ? thickness : opening.width
      );

      const mesh = new THREE.Mesh(geo, material);
      const openingWorldPos = {
        x: wall.start.x + (wall.end.x - wall.start.x) * opening.positionAlongWall,
        z: wall.start.z + (wall.end.z - wall.start.z) * opening.positionAlongWall,
      };
      mesh.position.set(
        openingWorldPos.x,
        opening.topY + lintelHeight / 2,
        openingWorldPos.z
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'wall', wallId: wall.id, segment: 'lintel', isCollider: true };
      group.add(mesh);
    }

    // BELOW-OPENING segment (sill wall) — only for windows
    if (opening.type === 'window' && opening.bottomY > 0.05) {
      const geo = new THREE.BoxGeometry(
        wall.orientation === 'horizontal' ? opening.width : thickness,
        opening.bottomY,
        wall.orientation === 'horizontal' ? thickness : opening.width
      );

      const mesh = new THREE.Mesh(geo, material);
      const openingWorldPos = {
        x: wall.start.x + (wall.end.x - wall.start.x) * opening.positionAlongWall,
        z: wall.start.z + (wall.end.z - wall.start.z) * opening.positionAlongWall,
      };
      mesh.position.set(
        openingWorldPos.x,
        opening.bottomY / 2,
        openingWorldPos.z
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'wall', wallId: wall.id, segment: 'sill', isCollider: true };
      group.add(mesh);
    }

    currentPos = openingEnd;
  }

  // FINAL SEGMENT after last opening
  if (currentPos < 0.99) {
    const segLength = (1 - currentPos) * wall.length;
    const segCenter = (currentPos + 1) / 2;

    const geo = new THREE.BoxGeometry(
      wall.orientation === 'horizontal' ? segLength : thickness,
      height,
      wall.orientation === 'horizontal' ? thickness : segLength
    );

    const mesh = new THREE.Mesh(geo, material);
    const cx = wall.start.x + (wall.end.x - wall.start.x) * segCenter;
    const cz = wall.start.z + (wall.end.z - wall.start.z) * segCenter;
    mesh.position.set(cx, height / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'wall', wallId: wall.id, isCollider: true };
    group.add(mesh);
  }

  return group;
}

/**
 * Compile all wall segments into Three.js objects.
 */
export function compileWalls(
  walls: WallSegment[],
  rooms: ParsedRoom[]
): THREE.Group {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'walls';

  for (const wall of walls) {
    if (wall.doors.length > 0 || wall.windows.length > 0) {
      wallGroup.add(compileWallWithOpenings(wall, rooms));
    } else {
      wallGroup.add(compileSimpleWall(wall, rooms));
    }
  }

  return wallGroup;
}
