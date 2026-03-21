/**
 * Grammar of Graphics — Floor Plan Parser
 * 
 * The main entry point for Tier 1 (Parser).
 * Takes raw room data from Gemini and produces a complete ParsedFloorPlan.
 * 
 * Pipeline:
 *   RawRoom[] → normalize coordinates → build wall graph → detect doors/windows → ParsedFloorPlan
 */

import {
  RawRoom, ParsedRoom, ParsedFloorPlan, RoomType, WorldBounds,
  EngineConfig, DEFAULT_ENGINE_CONFIG
} from '../types';
import { buildWallGraph } from './WallGraphBuilder';
import { detectDoors } from './DoorDetector';

/**
 * Infer room type from its name string.
 * This is a heuristic — matches common room name patterns.
 */
function inferRoomType(name: string): RoomType {
  const lower = name.toLowerCase();

  if (/bed\s*room|master\s*bed|guest\s*room|sleeping/i.test(lower)) return 'bedroom';
  if (/bath\s*room|shower|toilet|wc|restroom|lavatory/i.test(lower)) return 'bathroom';
  if (/kitchen|pantry|cooking/i.test(lower)) return 'kitchen';
  if (/living|lounge|sitting|family\s*room|parlou?r/i.test(lower)) return 'living_room';
  if (/dining|eat/i.test(lower)) return 'dining_room';
  if (/hall\s*way|corridor|passage|foyer|lobby/i.test(lower)) return 'hallway';
  if (/closet|storage|wardrobe/i.test(lower)) return 'closet';
  if (/balcon|terrace|veranda|porch/i.test(lower)) return 'balcony';
  if (/patio|yard|garden|outdoor/i.test(lower)) return 'patio';
  if (/garage|carport|parking/i.test(lower)) return 'garage';
  if (/utility|laundry|wash/i.test(lower)) return 'utility';
  if (/office|study|work/i.test(lower)) return 'office';
  if (/entry|entrance|door\s*way/i.test(lower)) return 'entry';
  if (/stair/i.test(lower)) return 'stairway';

  return 'generic';
}

/**
 * Convert a raw room's percentage bounding box to world-space meters,
 * passing through structural analysis data.
 */
function normalizeRoom(raw: RawRoom, config: EngineConfig): ParsedRoom {
  const scale = config.metersPerUnit;

  const minX = raw.boundingBox.x * scale;
  const maxX = (raw.boundingBox.x + raw.boundingBox.width) * scale;
  const minZ = raw.boundingBox.y * scale;
  const maxZ = (raw.boundingBox.y + raw.boundingBox.height) * scale;

  const bounds: WorldBounds = { minX, maxX, minZ, maxZ };
  const width = maxX - minX;
  const depth = maxZ - minZ;

  return {
    id: raw.id,
    name: raw.name,
    bounds,
    center: {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    },
    area: width * depth,
    roomType: inferRoomType(raw.name),
    floorLevel: 0,
    structuralAnalysis: raw.structuralAnalysis, // Pass AI analysis through pipeline
    blueprintDoors: raw.doors,
    blueprintWindows: raw.windows,
  };
}

/**
 * Parse a raw room array into a complete floor plan with walls, doors, and windows.
 * 
 * This is the main entry point of the Grammar of Graphics parser.
 * 
 * @param rawRooms - Array of rooms from Gemini's analyze-floorplan API
 * @param config - Engine configuration (optional, uses defaults)
 * @returns A complete ParsedFloorPlan ready for the compiler
 */
export function parseFloorPlan(
  rawRooms: RawRoom[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): ParsedFloorPlan {
  // Step 1: Normalize all rooms to world-space coordinates
  const parsedRooms = rawRooms.map(r => normalizeRoom(r, config));

  // Step 2: Compute total bounds
  const totalBounds: WorldBounds = {
    minX: Math.min(...parsedRooms.map(r => r.bounds.minX)),
    maxX: Math.max(...parsedRooms.map(r => r.bounds.maxX)),
    minZ: Math.min(...parsedRooms.map(r => r.bounds.minZ)),
    maxZ: Math.max(...parsedRooms.map(r => r.bounds.maxZ)),
  };

  // Step 3: Build the wall graph
  const walls = buildWallGraph(parsedRooms, config);

  // Step 4: Detect and place doors/windows (uses AI structural analysis if available)
  const { doors, windows } = detectDoors(walls, parsedRooms, config);

  // Step 5: Compute metadata
  const estimatedFloorArea = parsedRooms.reduce((sum, r) => sum + r.area, 0);

  return {
    rooms: parsedRooms,
    walls,
    doors,
    windows,
    totalBounds,
    scaleFactor: config.metersPerUnit,
    metadata: {
      originalRoomCount: rawRooms.length,
      wallCount: walls.length,
      doorCount: doors.length,
      windowCount: windows.length,
      estimatedFloorArea,
    },
  };
}
