/**
 * Grammar of Shelter — Scene Compiler
 * 
 * THE HEART OF THE ENGINE.
 * 
 * The SceneCompiler is the main interpreter. It takes a ParsedFloorPlan
 * (the output of the parser tier) and compiles it into a complete
 * Three.js scene graph ready for rendering.
 * 
 * Pipeline:
 *   ParsedFloorPlan → compile walls → compile doors → compile floors
 *                   → compile lighting → compute spawn point
 *                   → assemble → THREE.Group
 */

import * as THREE from 'three';
import {
  ParsedFloorPlan, ParsedRoom, NavigationNode, Point3D,
  EngineConfig, DEFAULT_ENGINE_CONFIG
} from '../types';
import { compileWalls } from './WallCompiler';
import { compileDoors } from './DoorCompiler';
import { compileFloors } from './FloorCompiler';
import { compileLighting } from './LightingCompiler';

/** The output of the scene compiler */
export interface CompiledScene {
  /** The root Three.js group containing all geometry */
  sceneGroup: THREE.Group;
  /** walls subgroup — used for collision detection */
  wallsGroup: THREE.Group;
  /** Spawn point for the camera */
  spawnPoint: Point3D;
  /** Initial camera look direction */
  spawnLookAt: Point3D;
  /** Navigation graph for room-to-room traversal */
  navigationNodes: NavigationNode[];
  /** Floor plan metadata */
  metadata: {
    roomCount: number;
    wallCount: number;
    doorCount: number;
    floorArea: number;
    worldWidth: number;
    worldDepth: number;
  };
}

/**
 * Determine the best spawn point — the largest room's center,
 * or the first hallway/entry if one exists.
 */
function computeSpawnPoint(
  rooms: ParsedRoom[],
  config: EngineConfig
): { point: Point3D; lookAt: Point3D } {
  // Prefer entry/hallway, then living room, then largest room
  const priorityOrder: string[] = ['entry', 'hallway', 'living_room', 'dining_room'];

  let spawnRoom: ParsedRoom | null = null;

  for (const type of priorityOrder) {
    spawnRoom = rooms.find(r => r.roomType === type) || null;
    if (spawnRoom) break;
  }

  if (!spawnRoom) {
    // Fall back to the largest room
    spawnRoom = rooms.reduce((largest, r) =>
      r.area > largest.area ? r : largest
    , rooms[0]);
  }

  const point: Point3D = {
    x: spawnRoom.center.x,
    y: config.playerEyeHeight,
    z: spawnRoom.center.z,
  };

  // Look toward the center of the floor plan
  const avgX = rooms.reduce((sum, r) => sum + r.center.x, 0) / rooms.length;
  const avgZ = rooms.reduce((sum, r) => sum + r.center.z, 0) / rooms.length;

  const lookAt: Point3D = {
    x: avgX,
    y: config.playerEyeHeight,
    z: avgZ,
  };

  // If spawn and lookAt are the same point, offset the lookAt
  if (Math.abs(point.x - lookAt.x) < 0.5 && Math.abs(point.z - lookAt.z) < 0.5) {
    lookAt.z += 2;
  }

  return { point, lookAt };
}

/**
 * Build a navigation graph connecting rooms through doors.
 */
function buildNavigationGraph(
  floorPlan: ParsedFloorPlan,
  config: EngineConfig
): NavigationNode[] {
  const nodes: NavigationNode[] = [];

  for (const room of floorPlan.rooms) {
    const connectedRooms: NavigationNode['connectedRooms'] = [];

    // Find all doors that connect to this room
    for (const door of floorPlan.doors) {
      if (!door.connectsRooms.includes(room.id)) continue;

      const otherRoomId = door.connectsRooms.find(id => id !== room.id) || door.connectsRooms[1];
      const wall = floorPlan.walls.find(w => w.id === door.wallId);

      if (wall) {
        const t = door.positionAlongWall;
        const doorPos: Point3D = {
          x: wall.start.x + (wall.end.x - wall.start.x) * t,
          y: config.playerEyeHeight,
          z: wall.start.z + (wall.end.z - wall.start.z) * t,
        };

        connectedRooms.push({
          roomId: otherRoomId,
          doorId: door.id,
          doorPosition: doorPos,
        });
      }
    }

    nodes.push({
      roomId: room.id,
      center: {
        x: room.center.x,
        y: config.playerEyeHeight,
        z: room.center.z,
      },
      connectedRooms,
    });
  }

  return nodes;
}

/**
 * Add a ground plane beneath the entire floor plan.
 * This prevents "seeing into the void" below the house.
 */
function createGroundPlane(
  floorPlan: ParsedFloorPlan
): THREE.Mesh {
  const width = floorPlan.totalBounds.maxX - floorPlan.totalBounds.minX + 10;
  const depth = floorPlan.totalBounds.maxZ - floorPlan.totalBounds.minZ + 10;

  const geometry = new THREE.PlaneGeometry(width, depth);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd0d0d0,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(
    (floorPlan.totalBounds.minX + floorPlan.totalBounds.maxX) / 2,
    -0.02,
    (floorPlan.totalBounds.minZ + floorPlan.totalBounds.maxZ) / 2,
  );
  mesh.receiveShadow = true;
  mesh.userData = { type: 'ground', isCollider: false };

  return mesh;
}

/**
 * Add floating room labels for orientation
 */
function createRoomLabels(rooms: ParsedRoom[], config: EngineConfig): THREE.Group {
  const labelGroup = new THREE.Group();
  labelGroup.name = 'labels';

  for (const room of rooms) {
    // Create a simple sprite label using a canvas texture
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = 512;
    canvas.height = 128;

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 48px Inter, Arial, sans-serif';
    ctx.fillStyle = '#605e5c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(
      room.center.x,
      config.defaultWallHeight - 0.3,
      room.center.z
    );
    sprite.scale.set(2, 0.5, 1);
    sprite.userData = { type: 'label', roomId: room.id, roomName: room.name };

    labelGroup.add(sprite);
  }

  return labelGroup;
}

/**
 * MAIN ENTRY POINT — Compile a ParsedFloorPlan into a complete 3D scene.
 * 
 * This is the Grammar of Shelter interpreter. It takes the abstract
 * structural description and produces a concrete Three.js scene.
 * 
 * @param floorPlan - The parsed floor plan from the parser tier
 * @param config - Engine configuration
 * @returns A CompiledScene ready for the viewer
 */
export function compileScene(
  floorPlan: ParsedFloorPlan,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): CompiledScene {
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'grammar-of-shelter-scene';

  // 1. Compile floors
  const floorsGroup = compileFloors(floorPlan.rooms);
  sceneGroup.add(floorsGroup);

  // 2. Compile walls
  const wallsGroup = compileWalls(floorPlan.walls, floorPlan.rooms);
  sceneGroup.add(wallsGroup);

  // 3. Compile door frames
  const doorsGroup = compileDoors(floorPlan.walls, floorPlan.rooms);
  sceneGroup.add(doorsGroup);

  // 4. Add lighting
  const lightingGroup = compileLighting(floorPlan.rooms, config);
  sceneGroup.add(lightingGroup);

  // 5. Add ground plane
  sceneGroup.add(createGroundPlane(floorPlan));

  // 6. Add room labels (only in browser environment)
  if (typeof document !== 'undefined') {
    sceneGroup.add(createRoomLabels(floorPlan.rooms, config));
  }

  // 7. Compute spawn point
  const spawn = computeSpawnPoint(floorPlan.rooms, config);

  // 8. Build navigation graph
  const navigationNodes = buildNavigationGraph(floorPlan, config);

  // 9. Center the scene at origin for easier camera handling
  const centerX = (floorPlan.totalBounds.minX + floorPlan.totalBounds.maxX) / 2;
  const centerZ = (floorPlan.totalBounds.minZ + floorPlan.totalBounds.maxZ) / 2;

  return {
    sceneGroup,
    wallsGroup,
    spawnPoint: spawn.point,
    spawnLookAt: spawn.lookAt,
    navigationNodes,
    metadata: {
      roomCount: floorPlan.rooms.length,
      wallCount: floorPlan.walls.length,
      doorCount: floorPlan.doors.length,
      floorArea: floorPlan.metadata.estimatedFloorArea,
      worldWidth: floorPlan.totalBounds.maxX - floorPlan.totalBounds.minX,
      worldDepth: floorPlan.totalBounds.maxZ - floorPlan.totalBounds.minZ,
    },
  };
}
