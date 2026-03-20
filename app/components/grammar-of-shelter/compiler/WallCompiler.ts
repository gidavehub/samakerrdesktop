/**
 * Grammar of Shelter — Wall Compiler
 * 
 * Converts WallSegment data into Three.js BoxGeometry meshes.
 * 
 * For walls with doors, the wall is split into segments:
 * - Left segment (before door)
 * - Above-door segment (lintel)
 * - Right segment (after door)
 * 
 * For walls without doors, a single BoxGeometry is created.
 */

import * as THREE from 'three';
import { WallSegment, DoorPosition, ParsedRoom } from '../types';
import { WallStructure } from '../structures/WallStructure';
import { getMaterial } from './MaterialLibrary';

/**
 * Compute the world-space position of a door along a wall.
 * Returns the center X/Z of the door opening.
 */
function getDoorWorldPosition(wall: WallSegment, door: DoorPosition): { x: number; z: number } {
  const t = door.positionAlongWall;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    z: wall.start.z + (wall.end.z - wall.start.z) * t,
  };
}

/**
 * Compile a single wall segment (no doors) into a BoxGeometry mesh.
 */
function compileSimpleWall(
  wall: WallSegment,
  rooms: ParsedRoom[]
): THREE.Mesh {
  const roomTypes = wall.roomIds
    .map(id => rooms.find(r => r.id === id)?.roomType || 'generic');

  const structure = new WallStructure(wall.isExterior, roomTypes as any);
  const material = getMaterial(structure.material);

  // Wall dimensions
  const length = wall.length;
  const height = wall.height;
  const thickness = wall.thickness;

  const geometry = new THREE.BoxGeometry(
    wall.orientation === 'horizontal' ? length : thickness,
    height,
    wall.orientation === 'horizontal' ? thickness : length
  );

  const mesh = new THREE.Mesh(geometry, material);

  // Position at the center of the wall segment, half-height up from ground
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
 * Compile a wall with door cutout(s) into multiple mesh segments.
 * 
 * For a horizontal wall with a door:
 * ┌──────────┐  ┌─────┐  ┌──────────┐
 * │ Left seg │  │Above│  │ Right seg│
 * │          │  │door │  │          │
 * │          │  ├─────┤  │          │
 * │          │  │     │  │          │
 * │          │  │DOOR │  │          │
 * └──────────┘  └─────┘  └──────────┘
 */
function compileWallWithDoors(
  wall: WallSegment,
  rooms: ParsedRoom[]
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { type: 'wall_group', wallId: wall.id };

  const roomTypes = wall.roomIds
    .map(id => rooms.find(r => r.id === id)?.roomType || 'generic');

  const structure = new WallStructure(wall.isExterior, roomTypes as any);
  const material = getMaterial(structure.material);

  const height = wall.height;
  const thickness = wall.thickness;

  // Sort doors by position along wall
  const sortedDoors = [...wall.doors].sort((a, b) => a.positionAlongWall - b.positionAlongWall);

  // Build wall segments around door openings
  let currentPos = 0; // 0 to 1 along wall

  for (const door of sortedDoors) {
    const doorHalfWidth = (door.width / wall.length) / 2;
    const doorStart = Math.max(0, door.positionAlongWall - doorHalfWidth);
    const doorEnd = Math.min(1, door.positionAlongWall + doorHalfWidth);

    // LEFT SEGMENT (from currentPos to doorStart)
    if (doorStart > currentPos + 0.01) {
      const segLength = (doorStart - currentPos) * wall.length;
      const segCenter = (currentPos + doorStart) / 2;

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

    // ABOVE-DOOR SEGMENT (lintel)
    const lintelHeight = height - door.height;
    if (lintelHeight > 0.05) {
      const geo = new THREE.BoxGeometry(
        wall.orientation === 'horizontal' ? door.width : thickness,
        lintelHeight,
        wall.orientation === 'horizontal' ? thickness : door.width
      );

      const mesh = new THREE.Mesh(geo, material);
      const doorPos = getDoorWorldPosition(wall, door);
      mesh.position.set(
        doorPos.x,
        door.height + lintelHeight / 2,
        doorPos.z
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'wall', wallId: wall.id, segment: 'lintel', isCollider: true };
      group.add(mesh);
    }

    currentPos = doorEnd;
  }

  // RIGHT SEGMENT (from last door to end)
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
 * 
 * @param walls - Wall segments from the parser
 * @param rooms - Parsed rooms for material lookup
 * @returns A Three.js Group containing all wall geometry
 */
export function compileWalls(
  walls: WallSegment[],
  rooms: ParsedRoom[]
): THREE.Group {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'walls';

  for (const wall of walls) {
    if (wall.doors.length > 0) {
      wallGroup.add(compileWallWithDoors(wall, rooms));
    } else {
      wallGroup.add(compileSimpleWall(wall, rooms));
    }
  }

  return wallGroup;
}
