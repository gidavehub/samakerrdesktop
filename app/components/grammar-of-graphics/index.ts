/**
 * Grammar of Graphics Engine — Public API
 * 
 * An interpreter that reads the structural language of a home
 * and compiles it into a navigable 3D world.
 * 
 * Usage:
 *   import { FirstPersonViewer } from './grammar-of-graphics';
 *   <FirstPersonViewer rooms={rooms} />
 * 
 * For lower-level access:
 *   import { parseFloorPlan, compileScene } from './grammar-of-graphics';
 *   const floorPlan = parseFloorPlan(rawRooms);
 *   const scene = compileScene(floorPlan);
 */

// Types
export type {
  RawRoom,
  ParsedRoom,
  ParsedFloorPlan,
  StructuralAnalysis,
  WallSegment,
  DoorPosition,
  WindowPosition,
  Point2D,
  Point3D,
  WorldBounds,
  RoomType,
  MaterialType,
  EngineConfig,
  NavigationNode,
} from './types';

export { DEFAULT_ENGINE_CONFIG } from './types';

// Parser
export { parseFloorPlan } from './parser/FloorPlanParser';
export { buildWallGraph } from './parser/WallGraphBuilder';
export { detectDoors } from './parser/DoorDetector';

// Structures
export { WallStructure } from './structures/WallStructure';
export { DoorStructure } from './structures/DoorStructure';
export { WindowStructure } from './structures/WindowStructure';
export { FloorStructure } from './structures/FloorStructure';
export { StructureRegistry } from './structures/StructureRegistry';

// Compiler
export { compileScene } from './compiler/SceneCompiler';
export type { CompiledScene } from './compiler/SceneCompiler';
export { compileWalls } from './compiler/WallCompiler';
export { compileDoors } from './compiler/DoorCompiler';
export { compileWindows } from './compiler/WindowCompiler';
export { compileFloors } from './compiler/FloorCompiler';
export { compileLighting } from './compiler/LightingCompiler';
export { getMaterial, createColorMaterial, clearMaterialCache } from './compiler/MaterialLibrary';

// Viewer
export { default as FirstPersonViewer } from './viewer/FirstPersonViewer';
export { FirstPersonController } from './viewer/FirstPersonController';
export { CollisionSystem } from './viewer/CollisionSystem';
