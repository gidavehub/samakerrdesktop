/**
 * Grammar of Graphics — Scene Compiler
 * 
 * The main entry point for Tier 3 (Compiler).
 * Orchestrates the conversion of a ParsedFloorPlan into a complete
 * Three.js scene graph ready for rendering.
 */

import * as THREE from 'three';
import { ParsedFloorPlan, EngineConfig, CompiledScene, DEFAULT_ENGINE_CONFIG, Point3D } from '../types';
export type { CompiledScene };
import { compileWalls } from './WallCompiler';
import { compileDoors } from './DoorCompiler';
import { compileWindows } from './WindowCompiler';
import { compileFloors } from './FloorCompiler';
import { compileLighting } from './LightingCompiler';
import { getMaterial } from './MaterialLibrary';

/**
 * Heuristically determine the best room to spawn the player in.
 * Prefers entry > hallway > living_room > generic.
 */
function determineSpawnRoom(floorPlan: ParsedFloorPlan) {
  const rooms = floorPlan.rooms;
  if (!rooms || rooms.length === 0) return null;

  const typePriority = ['entry', 'hallway', 'living_room', 'generic'];
  
  for (const type of typePriority) {
    const match = rooms.find(r => r.roomType === type);
    if (match) return match;
  }

  return rooms[0];
}

/**
 * Builds a simple navigation graph linking rooms via doors.
 * Useful for future pathfinding or automated guided tours.
 */
function buildNavigationGraph(floorPlan: ParsedFloorPlan): CompiledScene['navigationGraph'] {
  const graph: CompiledScene['navigationGraph'] = floorPlan.rooms.map(r => ({
    roomId: r.id,
    center: { x: r.center.x, y: 0, z: r.center.z },
    connectedRooms: [],
  }));

  const nodeMap = new Map(graph.map(n => [n.roomId, n]));

  // Add edges for each door
  for (const door of floorPlan.doors) {
    if (door.connectsRooms.length === 2) {
      const parentWall = floorPlan.walls.find(w => w.id === door.wallId);
      if (!parentWall) continue;

      const [r1, r2] = door.connectsRooms;
      const n1 = nodeMap.get(r1);
      const n2 = nodeMap.get(r2);

      let doorPos: Point3D = { x: 0, y: 0, z: 0 };
      if (parentWall) {
        const t = door.positionAlongWall;
        doorPos = {
          x: parentWall.start.x + (parentWall.end.x - parentWall.start.x) * t,
          y: 0,
          z: parentWall.start.z + (parentWall.end.z - parentWall.start.z) * t,
        };
      }

      if (n1 && n2) {
        n1.connectedRooms.push({ roomId: r2, doorId: door.id, doorPosition: doorPos });
        n2.connectedRooms.push({ roomId: r1, doorId: door.id, doorPosition: doorPos });
      }
    }
  }

  return graph;
}

/**
 * Create a textured ground plane extending far beyond the house.
 */
function createGroundPlane(config: EngineConfig): THREE.Mesh {
  // Simple grass/earth plane
  const geo = new THREE.PlaneGeometry(500, 500);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2e422c, // dark muted green
    roughness: 1.0,
    metalness: 0.0,
  });
  
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.05; // slightly below floor level
  mesh.receiveShadow = true;
  mesh.name = 'ground_plane';
  
  return mesh;
}

/**
 * Converts a parsed floor plan into a renderable Three.js scene.
 * 
 * @param floorPlan - The output from the Parser tier
 * @param config - Engine configuration limits and metrics
 * @returns A CompiledScene object containing the Three.js hierarchy and metadata
 */
export function compileScene(
  floorPlan: ParsedFloorPlan,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): CompiledScene {
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'grammar_of_graphics_scene';

  // 1. Structure
  const wallsGroup = compileWalls(floorPlan.walls, floorPlan.rooms);
  sceneGroup.add(wallsGroup);

  // Doors mesh generation bypassed to render as clean structural cutouts (easier to navigate)
  const doorsGroup = compileDoors(floorPlan.walls, floorPlan.rooms);
  // sceneGroup.add(doorsGroup);

  const windowsGroup = compileWindows(floorPlan.walls, floorPlan.rooms);
  sceneGroup.add(windowsGroup);

  const floorsGroup = compileFloors(floorPlan.rooms);
  sceneGroup.add(floorsGroup);

  // 2. Environment
  const lightingGroup = compileLighting(floorPlan.rooms, config);
  sceneGroup.add(lightingGroup);

  const ground = createGroundPlane(config);
  sceneGroup.add(ground);

  // 3. Navigation setup
  const spawnRoom = determineSpawnRoom(floorPlan);
  const spawnPoint: Point3D = spawnRoom 
    ? { x: spawnRoom.center.x, y: config.playerEyeHeight, z: spawnRoom.center.z }
    : { x: 0, y: config.playerEyeHeight, z: 0 };
  
  // Look towards the center of the house bounds
  const centerOfHouse: Point3D = {
    x: (floorPlan.totalBounds.minX + floorPlan.totalBounds.maxX) / 2,
    y: config.playerEyeHeight,
    z: (floorPlan.totalBounds.minZ + floorPlan.totalBounds.maxZ) / 2,
  };

  const navGraph = buildNavigationGraph(floorPlan);

  // 4. Create text labels for rooms (simple sprites or 3D text placeholders)
  // For V1, we skip 3D text to avoid loading heavy font files,
  // but we leave attachment points
  const labelsGroup = new THREE.Group();
  labelsGroup.name = 'room_labels';
  for (const room of floorPlan.rooms) {
    const attach = new THREE.Object3D();
    attach.position.set(room.center.x, 0.1, room.center.z);
    attach.userData = { isLabelAttachment: true, roomName: room.name };
    labelsGroup.add(attach);
  }
  sceneGroup.add(labelsGroup);

  return {
    sceneGroup,
    wallsGroup, // Return walls separately for easy collision detection
    spawnPoint,
    spawnLookAt: centerOfHouse,
    navigationGraph: navGraph,
    metadata: {
      roomCount: floorPlan.metadata.originalRoomCount,
      wallCount: floorPlan.metadata.wallCount,
      doorCount: floorPlan.metadata.doorCount,
      windowCount: floorPlan.metadata.windowCount,
      floorArea: floorPlan.metadata.estimatedFloorArea,
      worldWidth: floorPlan.totalBounds.maxX - floorPlan.totalBounds.minX,
      worldDepth: floorPlan.totalBounds.maxZ - floorPlan.totalBounds.minZ,
    }
  };
}
