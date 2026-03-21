/**
 * Grammar of Graphics — Lighting Compiler
 * 
 * Sets up lighting for the 3D scene:
 * - Ambient light for base illumination
 * - Point lights in each room for interior warmth
 * - Directional light for shadows
 */

import * as THREE from 'three';
import { ParsedRoom, EngineConfig, DEFAULT_ENGINE_CONFIG } from '../types';

/**
 * Create lighting for the scene.
 * 
 * @param rooms - Parsed rooms (used for point light placement)
 * @param config - Engine configuration
 * @returns A Three.js Group containing all lights
 */
export function compileLighting(
  rooms: ParsedRoom[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): THREE.Group {
  const lightGroup = new THREE.Group();
  lightGroup.name = 'lighting';

  // 1. Soft ambient light — base illumination so nothing is pitch black
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.4);
  lightGroup.add(ambient);

  // 2. Hemispheric light — sky blue from above, floor bounce from below
  const hemiLight = new THREE.HemisphereLight(0xe8f0ff, 0xd4c5a9, 0.5);
  hemiLight.position.set(0, config.defaultWallHeight + 2, 0);
  lightGroup.add(hemiLight);

  // 3. Directional light for shadows — simulates sunlight from a window
  const directional = new THREE.DirectionalLight(0xffffff, 0.6);
  directional.position.set(10, config.defaultWallHeight + 5, 10);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 50;
  directional.shadow.camera.left = -20;
  directional.shadow.camera.right = 20;
  directional.shadow.camera.top = 20;
  directional.shadow.camera.bottom = -20;
  lightGroup.add(directional);

  // 4. Per-room point lights — warm interior glow
  for (const room of rooms) {
    const intensity = getIntensityForRoom(room);
    const color = getColorForRoom(room);

    const pointLight = new THREE.PointLight(color, intensity, 8, 1.5);
    pointLight.position.set(
      room.center.x,
      config.defaultWallHeight - 0.5,  // near ceiling
      room.center.z
    );
    pointLight.castShadow = false; // performance: only directional casts shadows
    pointLight.userData = { type: 'room_light', roomId: room.id };
    lightGroup.add(pointLight);
  }

  return lightGroup;
}

function getIntensityForRoom(room: ParsedRoom): number {
  switch (room.roomType) {
    case 'bathroom': return 0.8;
    case 'kitchen': return 1.0;
    case 'bedroom': return 0.5;
    case 'living_room': return 0.7;
    case 'hallway': return 0.4;
    case 'closet': return 0.3;
    default: return 0.6;
  }
}

function getColorForRoom(room: ParsedRoom): number {
  switch (room.roomType) {
    case 'bathroom': return 0xf0f8ff;  // cool white
    case 'kitchen': return 0xfff8f0;   // warm white
    case 'bedroom': return 0xffe8cc;   // warm amber
    case 'living_room': return 0xfff5e6; // soft warm
    default: return 0xfff0e0;          // neutral warm
  }
}
