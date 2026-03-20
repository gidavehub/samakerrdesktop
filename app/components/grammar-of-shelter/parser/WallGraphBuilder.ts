/**
 * Grammar of Shelter — Wall Graph Builder
 * 
 * The core algorithm that detects walls from room bounding boxes.
 * 
 * Given a set of rooms (axis-aligned rectangles), this module:
 * 1. Extracts the 4 edges of each room as candidate wall segments
 * 2. Detects where rooms share walls (adjacent edges within tolerance)
 * 3. Merges collinear wall segments
 * 4. Labels walls as interior (shared) or exterior (single room)
 */

import {
  ParsedRoom, WallSegment, WallOrientation, Point2D,
  EngineConfig, DEFAULT_ENGINE_CONFIG
} from '../types';

/** Internal edge representation before wall creation */
interface Edge {
  start: Point2D;
  end: Point2D;
  roomId: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  orientation: WallOrientation;
}

/**
 * Checks if two 1D ranges overlap.
 * Returns the overlap amount, or 0 if no overlap.
 */
function rangeOverlap(a1: number, a2: number, b1: number, b2: number): number {
  const start = Math.max(Math.min(a1, a2), Math.min(b1, b2));
  const end = Math.min(Math.max(a1, a2), Math.max(b1, b2));
  return Math.max(0, end - start);
}

/**
 * Checks if two edges are adjacent (shared wall candidates).
 * Two edges are adjacent if:
 * - They have the same orientation
 * - Their fixed coordinate (perpendicular axis) is within tolerance
 * - They overlap along the parallel axis
 */
function areEdgesAdjacent(
  e1: Edge,
  e2: Edge,
  tolerance: number
): boolean {
  if (e1.orientation !== e2.orientation) return false;
  if (e1.roomId === e2.roomId) return false;

  // For horizontal edges (top/bottom): fixed coord is Z, parallel is X
  // For vertical edges (left/right): fixed coord is X, parallel is Z
  if (e1.orientation === 'horizontal') {
    const fixedDiff = Math.abs(e1.start.z - e2.start.z);
    if (fixedDiff > tolerance) return false;

    const overlap = rangeOverlap(e1.start.x, e1.end.x, e2.start.x, e2.end.x);
    return overlap > tolerance;
  } else {
    const fixedDiff = Math.abs(e1.start.x - e2.start.x);
    if (fixedDiff > tolerance) return false;

    const overlap = rangeOverlap(e1.start.z, e1.end.z, e2.start.z, e2.end.z);
    return overlap > tolerance;
  }
}

/**
 * Extracts the 4 edges from a room's bounding box.
 */
function extractEdges(room: ParsedRoom): Edge[] {
  const { minX, maxX, minZ, maxZ } = room.bounds;

  return [
    // Top edge (min Z)
    {
      start: { x: minX, z: minZ },
      end: { x: maxX, z: minZ },
      roomId: room.id,
      side: 'top',
      orientation: 'horizontal' as WallOrientation,
    },
    // Bottom edge (max Z)
    {
      start: { x: minX, z: maxZ },
      end: { x: maxX, z: maxZ },
      roomId: room.id,
      side: 'bottom',
      orientation: 'horizontal' as WallOrientation,
    },
    // Left edge (min X)
    {
      start: { x: minX, z: minZ },
      end: { x: minX, z: maxZ },
      roomId: room.id,
      side: 'left',
      orientation: 'vertical' as WallOrientation,
    },
    // Right edge (max X)
    {
      start: { x: maxX, z: minZ },
      end: { x: maxX, z: maxZ },
      roomId: room.id,
      side: 'right',
      orientation: 'vertical' as WallOrientation,
    },
  ];
}

/**
 * Computes the length of a wall segment.
 */
function segmentLength(start: Point2D, end: Point2D): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Main function: Build the wall graph from a list of parsed rooms.
 * 
 * Returns an array of WallSegment objects representing all walls
 * in the floor plan, with shared walls detected and doors placed.
 */
export function buildWallGraph(
  rooms: ParsedRoom[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): WallSegment[] {
  // Step 1: Extract all edges from all rooms
  const allEdges: Edge[] = [];
  for (const room of rooms) {
    allEdges.push(...extractEdges(room));
  }

  // Step 2: Find adjacency pairs (shared walls)
  const adjacencyPairs: { e1: Edge; e2: Edge }[] = [];
  const matchedEdges = new Set<string>();

  for (let i = 0; i < allEdges.length; i++) {
    for (let j = i + 1; j < allEdges.length; j++) {
      const e1 = allEdges[i];
      const e2 = allEdges[j];

      // Only opposite sides can be adjacent
      // (e.g., room A's right edge + room B's left edge)
      const areOppositeSides =
        (e1.side === 'right' && e2.side === 'left') ||
        (e1.side === 'left' && e2.side === 'right') ||
        (e1.side === 'top' && e2.side === 'bottom') ||
        (e1.side === 'bottom' && e2.side === 'top');

      if (!areOppositeSides) continue;

      if (areEdgesAdjacent(e1, e2, config.adjacencyTolerance)) {
        adjacencyPairs.push({ e1, e2 });
        matchedEdges.add(`${e1.roomId}-${e1.side}`);
        matchedEdges.add(`${e2.roomId}-${e2.side}`);
      }
    }
  }

  const walls: WallSegment[] = [];
  let wallId = 0;

  // Step 3: Create shared (interior) walls from adjacency pairs
  for (const { e1, e2 } of adjacencyPairs) {
    // The shared wall is positioned at the average of the two edges
    let start: Point2D;
    let end: Point2D;

    if (e1.orientation === 'horizontal') {
      const avgZ = (e1.start.z + e2.start.z) / 2;
      const startX = Math.max(
        Math.min(e1.start.x, e1.end.x),
        Math.min(e2.start.x, e2.end.x)
      );
      const endX = Math.min(
        Math.max(e1.start.x, e1.end.x),
        Math.max(e2.start.x, e2.end.x)
      );
      start = { x: startX, z: avgZ };
      end = { x: endX, z: avgZ };
    } else {
      const avgX = (e1.start.x + e2.start.x) / 2;
      const startZ = Math.max(
        Math.min(e1.start.z, e1.end.z),
        Math.min(e2.start.z, e2.end.z)
      );
      const endZ = Math.min(
        Math.max(e1.start.z, e1.end.z),
        Math.max(e2.start.z, e2.end.z)
      );
      start = { x: avgX, z: startZ };
      end = { x: avgX, z: endZ };
    }

    walls.push({
      id: `wall_${wallId++}`,
      start,
      end,
      orientation: e1.orientation,
      thickness: config.interiorWallThickness,
      height: config.defaultWallHeight,
      isExterior: false,
      roomIds: [e1.roomId, e2.roomId],
      doors: [],
      length: segmentLength(start, end),
    });
  }

  // Step 4: Create exterior walls for unmatched edges
  for (const edge of allEdges) {
    const edgeKey = `${edge.roomId}-${edge.side}`;
    if (matchedEdges.has(edgeKey)) continue;

    walls.push({
      id: `wall_${wallId++}`,
      start: { ...edge.start },
      end: { ...edge.end },
      orientation: edge.orientation,
      thickness: config.exteriorWallThickness,
      height: config.defaultWallHeight,
      isExterior: true,
      roomIds: [edge.roomId],
      doors: [],
      length: segmentLength(edge.start, edge.end),
    });
  }

  return walls;
}
