/**
 * Grammar of Graphics — Material Library
 * 
 * Central registry of Three.js materials mapped to engine MaterialTypes.
 * Each material type produces a reusable THREE.Material instance.
 * Supports dynamic color creation from AI structural analysis.
 */

import * as THREE from 'three';
import { MaterialType } from '../types';

/** Color definitions for each material type */
const MATERIAL_COLORS: Record<string, { color: string; roughness: number; metalness: number }> = {
  // Plaster walls
  plaster_white:   { color: '#f5f0eb', roughness: 0.9,  metalness: 0.0 },
  plaster_cream:   { color: '#f0e6d3', roughness: 0.9,  metalness: 0.0 },
  plaster_grey:    { color: '#c8c4bf', roughness: 0.85, metalness: 0.0 },

  // Brick
  brick_red:       { color: '#8b4513', roughness: 0.95, metalness: 0.0 },
  brick_white:     { color: '#e8e0d8', roughness: 0.92, metalness: 0.0 },

  // Concrete
  concrete:        { color: '#a0a0a0', roughness: 0.95, metalness: 0.0 },

  // Wood
  wood_oak:        { color: '#b8860b', roughness: 0.7,  metalness: 0.0 },
  wood_dark:       { color: '#5c3317', roughness: 0.65, metalness: 0.0 },
  wood_pine:       { color: '#deb887', roughness: 0.75, metalness: 0.0 },

  // Tile
  tile_white:      { color: '#f0f0f0', roughness: 0.3,  metalness: 0.1 },
  tile_marble:     { color: '#e8e0d0', roughness: 0.25, metalness: 0.15 },
  tile_ceramic:    { color: '#d4c5a9', roughness: 0.4,  metalness: 0.05 },

  // Carpet
  carpet_beige:    { color: '#d2b48c', roughness: 1.0,  metalness: 0.0 },
  carpet_grey:     { color: '#b0b0b0', roughness: 1.0,  metalness: 0.0 },

  // Door
  door_wood:       { color: '#8b6914', roughness: 0.6,  metalness: 0.0 },
  door_white:      { color: '#f0ede8', roughness: 0.5,  metalness: 0.05 },

  // Glass
  glass:           { color: '#c8e8ff', roughness: 0.1,  metalness: 0.3 },
  window_glass:    { color: '#d0ecff', roughness: 0.05, metalness: 0.1 },

  // Custom (fallback)
  custom:          { color: '#cccccc', roughness: 0.8,  metalness: 0.0 },
};

/** Cache of created materials to avoid duplicates */
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Create or retrieve a Three.js material for the given type.
 * Materials are cached and reused.
 */
export function getMaterial(type: MaterialType): THREE.MeshStandardMaterial {
  const cacheKey = type;

  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey)!;
  }

  const def = MATERIAL_COLORS[type] || MATERIAL_COLORS.plaster_white;
  
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color),
    roughness: def.roughness,
    metalness: def.metalness,
    side: THREE.DoubleSide,
  });

  materialCache.set(cacheKey, material);
  return material;
}

/**
 * Create a material from an AI-detected hex color.
 * Used for structural analysis wall/floor colors.
 * Results are cached by color + roughness + metalness.
 */
export function createColorMaterial(
  hexColor: string,
  roughness: number = 0.85,
  metalness: number = 0.0
): THREE.MeshStandardMaterial {
  const cacheKey = `custom_${hexColor}_${roughness}_${metalness}`;

  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey)!;
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hexColor),
    roughness,
    metalness,
    side: THREE.DoubleSide,
  });

  materialCache.set(cacheKey, material);
  return material;
}

/**
 * Get the appropriate roughness for a floor material type.
 */
export function getFloorRoughness(
  floorMaterial: string
): { roughness: number; metalness: number } {
  switch (floorMaterial) {
    case 'wood':
    case 'laminate':
      return { roughness: 0.7, metalness: 0.0 };
    case 'tile':
    case 'marble':
      return { roughness: 0.3, metalness: 0.1 };
    case 'carpet':
      return { roughness: 1.0, metalness: 0.0 };
    case 'concrete':
      return { roughness: 0.95, metalness: 0.0 };
    default:
      return { roughness: 0.8, metalness: 0.0 };
  }
}

/**
 * Get a wireframe material for debug rendering.
 */
export function getWireframeMaterial(color: string = '#00ff00'): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
}

/**
 * Clear the material cache (useful for hot-reloading or cleanup).
 */
export function clearMaterialCache(): void {
  materialCache.forEach(mat => mat.dispose());
  materialCache.clear();
}
