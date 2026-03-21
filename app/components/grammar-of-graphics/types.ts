/**
 * Grammar of Graphics Engine — Core Type Definitions
 * 
 * The structural vocabulary of a home: rooms, walls, doors, windows, floors.
 * These types are the "language" the engine interprets.
 */

// ============================================================================
// RAW INPUT TYPES (from Gemini analyze-floorplan)
// ============================================================================

/** Structural analysis data extracted from room photographs by Gemini */
export interface StructuralAnalysis {
  wallColor: string;          // hex color e.g. "#e8d5c4"
  floorMaterial: 'wood' | 'tile' | 'carpet' | 'concrete' | 'marble' | 'laminate' | 'unknown';
  floorColor: string;         // hex color
  doors: {
    wall: 'north' | 'south' | 'east' | 'west';
    position: number;         // 0.0–1.0 along the wall
    type: 'single' | 'double' | 'sliding' | 'french';
    color: string;            // hex color
  }[];
  windows: {
    wall: 'north' | 'south' | 'east' | 'west';
    position: number;         // 0.0–1.0 along the wall
    width: number;            // meters (approximate)
    height: number;           // meters (approximate)
    sillHeight: number;       // meters from floor
    type: 'single' | 'double' | 'bay' | 'sliding' | 'casement';
    color: string;            // frame color hex
  }[];
  furniture?: {
    type: string;             // e.g. "sofa", "bed", "table"
    position: { x: number; z: number };  // approximate room-relative position 0-1
  }[];
}

/** Raw room data as returned by the Gemini Vision API */
export interface RawRoom {
  id: string;
  name: string;
  boundingBox: {
    x: number;      // 0-100 percentage from left
    y: number;      // 0-100 percentage from top
    width: number;  // 0-100 percentage
    height: number; // 0-100 percentage
  };
  doors?: {
    wall: 'north' | 'south' | 'east' | 'west';
    position: number;
    type?: string;
  }[];
  windows?: {
    wall: 'north' | 'south' | 'east' | 'west';
    position: number;
    width?: number;
  }[];
  photos?: string[];
  heroImageUrl?: string;      // legacy single image (backward compat)
  heroImageUrls?: string[];   // 3 studio-quality images
  heroPrompt?: string;
  structuralAnalysis?: StructuralAnalysis;
}

// ============================================================================
// PARSED / INTERMEDIATE TYPES (output of Parser, input to Compiler)
// ============================================================================

/** A 2D point in world space (meters) */
export interface Point2D {
  x: number;
  z: number;
}

/** A 3D point in world space */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** Axis-aligned bounding box in world space */
export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** A room after coordinate normalization */
export interface ParsedRoom {
  id: string;
  name: string;
  bounds: WorldBounds;
  center: Point2D;
  area: number;         // square meters
  roomType: RoomType;
  floorLevel: number;   // 0 = ground floor
  structuralAnalysis?: StructuralAnalysis;
  blueprintDoors?: { wall: string, position: number, type?: string }[];
  blueprintWindows?: { wall: string, position: number, width?: number }[];
}

/** Recognized room types for material/behavior assignment */
export type RoomType =
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'living_room'
  | 'dining_room'
  | 'hallway'
  | 'closet'
  | 'balcony'
  | 'patio'
  | 'garage'
  | 'utility'
  | 'office'
  | 'entry'
  | 'stairway'
  | 'generic';

/** Orientation of a wall segment */
export type WallOrientation = 'horizontal' | 'vertical';

/** A wall segment in the floor plan */
export interface WallSegment {
  id: string;
  start: Point2D;
  end: Point2D;
  orientation: WallOrientation;
  thickness: number;      // meters
  height: number;         // meters
  isExterior: boolean;    // exterior walls are thicker
  roomIds: string[];      // rooms this wall borders (1 = exterior, 2 = shared)
  roomSideMap: Record<string, 'north' | 'south' | 'east' | 'west'>; // Maps roomId to the wall's cardinal direction
  doors: DoorPosition[];  // doors cut into this wall
  windows: WindowPosition[];  // windows cut into this wall
  length: number;         // computed length in meters
}

/** A door position within a wall */
export interface DoorPosition {
  id: string;
  wallId: string;
  /** Position along the wall, 0.0 = start, 1.0 = end */
  positionAlongWall: number;
  width: number;      // meters
  height: number;     // meters
  isOpen: boolean;
  connectsRooms: [string, string];  // the two room IDs this door connects
}

/** A window position within a wall */
export interface WindowPosition {
  id: string;
  wallId: string;
  /** Position along the wall, 0.0 = start, 1.0 = end */
  positionAlongWall: number;
  width: number;      // meters
  height: number;     // meters
  sillHeight: number; // meters from floor to bottom of window
  paneCount: number;  // 1 = single pane, 2 = double, etc.
  frameColor: string; // hex color
}

/** Complete parsed floor plan — the output of the parser tier */
export interface ParsedFloorPlan {
  rooms: ParsedRoom[];
  walls: WallSegment[];
  doors: DoorPosition[];
  windows: WindowPosition[];
  totalBounds: WorldBounds;
  scaleFactor: number;    // how we converted % → meters
  metadata: {
    originalRoomCount: number;
    wallCount: number;
    doorCount: number;
    windowCount: number;
    estimatedFloorArea: number;  // total sq meters
  };
}

// ============================================================================
// STRUCTURE DEFINITION TYPES (Tier 2 — what things ARE)
// ============================================================================

/** Material types available in the engine */
export type MaterialType =
  | 'plaster_white'
  | 'plaster_cream'
  | 'plaster_grey'
  | 'brick_red'
  | 'brick_white'
  | 'concrete'
  | 'wood_oak'
  | 'wood_dark'
  | 'wood_pine'
  | 'tile_white'
  | 'tile_marble'
  | 'tile_ceramic'
  | 'carpet_beige'
  | 'carpet_grey'
  | 'door_wood'
  | 'door_white'
  | 'glass'
  | 'window_glass'
  | 'custom';            // for AI-detected colors

/** Configuration for a wall structure */
export interface WallConfig {
  height: number;
  thickness: number;
  material: MaterialType;
  exteriorMaterial: MaterialType;
  customColor?: string;   // hex color from structural analysis
}

/** Configuration for a door structure */
export interface DoorConfig {
  width: number;
  height: number;
  frameThickness: number;
  frameMaterial: MaterialType;
  isOpen: boolean;
}

/** Configuration for a window structure */
export interface WindowConfig {
  width: number;
  height: number;
  sillHeight: number;
  frameThickness: number;
  frameMaterial: MaterialType;
  glassMaterial: MaterialType;
  paneCount: number;
}

/** Configuration for a floor structure */
export interface FloorConfig {
  material: MaterialType;
  level: number;
  customColor?: string;   // hex color from structural analysis
}

// ============================================================================
// COMPILED SCENE TYPES (Tier 3 output)
// ============================================================================

/** A compiled element ready for Three.js rendering */
export interface CompiledElement {
  id: string;
  type: 'wall' | 'door' | 'floor' | 'window' | 'light' | 'label';
  position: Point3D;
  rotation: Point3D;
  scale: Point3D;
  metadata: Record<string, any>;
}

/** The complete compiled scene descriptor */
export interface CompiledScene {
  sceneGroup: import('three').Group;
  wallsGroup: import('three').Group;
  spawnPoint: Point3D;         // where the camera starts
  spawnLookAt: Point3D;        // where the camera looks initially
  navigationGraph: NavigationNode[];  // for pathfinding
  metadata: {
    roomCount: number;
    wallCount: number;
    doorCount: number;
    windowCount: number;
    floorArea: number;
    worldWidth: number;
    worldDepth: number;
  };
}

/** A node in the navigation graph for door traversal */
export interface NavigationNode {
  roomId: string;
  center: Point3D;
  connectedRooms: { roomId: string; doorId: string; doorPosition: Point3D }[];
}

// ============================================================================
// ENGINE CONFIGURATION
// ============================================================================

/** Global engine settings */
export interface EngineConfig {
  /** Scale factor: 1 unit in percentage space = N meters */
  metersPerUnit: number;
  /** Default wall height in meters */
  defaultWallHeight: number;
  /** Interior wall thickness in meters */
  interiorWallThickness: number;
  /** Exterior wall thickness in meters */
  exteriorWallThickness: number;
  /** Default door width in meters */
  defaultDoorWidth: number;
  /** Default door height in meters */
  defaultDoorHeight: number;
  /** Default window width in meters */
  defaultWindowWidth: number;
  /** Default window height in meters */
  defaultWindowHeight: number;
  /** Default window sill height in meters */
  defaultWindowSillHeight: number;
  /** Player eye height in meters */
  playerEyeHeight: number;
  /** Player collision radius in meters */
  playerCollisionRadius: number;
  /** Movement speed in meters/second */
  movementSpeed: number;
  /** Rotation speed in radians/second */
  rotationSpeed: number;
  /** Adjacency tolerance — how close walls must be to count as shared (meters) */
  adjacencyTolerance: number;
}

/** Default engine configuration */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  metersPerUnit: 0.2,           // 100% = 20 meters
  defaultWallHeight: 2.8,
  interiorWallThickness: 0.15,
  exteriorWallThickness: 0.25,
  defaultDoorWidth: 0.9,
  defaultDoorHeight: 2.1,
  defaultWindowWidth: 1.2,
  defaultWindowHeight: 1.0,
  defaultWindowSillHeight: 0.9,
  playerEyeHeight: 1.6,
  playerCollisionRadius: 0.3,
  movementSpeed: 3.0,
  rotationSpeed: 2.0,
  adjacencyTolerance: 0.5,
};
