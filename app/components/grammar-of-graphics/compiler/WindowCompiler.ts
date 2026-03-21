/**
 * Grammar of Graphics — Window Compiler
 * 
 * Creates window apertures in walls with glass pane geometry.
 * Windows are cut into walls the same way doors are, but:
 * - They have a sill (wall below the window)
 * - They have a transparent glass pane
 * - They have a frame around the opening
 */

import * as THREE from 'three';
import { WallSegment, WindowPosition, ParsedRoom } from '../types';
import { WindowStructure } from '../structures/WindowStructure';
import { getMaterial, createColorMaterial } from './MaterialLibrary';

/**
 * Create a window frame and glass pane for a single window.
 */
function compileWindowFrame(
  wall: WallSegment,
  window: WindowPosition,
  rooms: ParsedRoom[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = `window_frame_${window.id}`;

  const room = rooms.find(r => wall.roomIds.includes(r.id));
  const structure = new WindowStructure(room?.roomType || 'generic');

  const frameMat = getMaterial(structure.frameMaterial);
  const frameThick = structure.frameThickness;

  // Window position in world space
  const t = window.positionAlongWall;
  const windowCenter = {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    z: wall.start.z + (wall.end.z - wall.start.z) * t,
  };

  const halfWidth = window.width / 2;
  const isHorizontal = wall.orientation === 'horizontal';

  // Bottom frame (sill)
  const sillGeo = new THREE.BoxGeometry(
    isHorizontal ? window.width + frameThick * 2 : wall.thickness + 0.04,
    frameThick,
    isHorizontal ? wall.thickness + 0.04 : window.width + frameThick * 2
  );
  const sill = new THREE.Mesh(sillGeo, frameMat);
  sill.position.set(
    windowCenter.x,
    window.sillHeight - frameThick / 2,
    windowCenter.z
  );
  sill.userData = { type: 'window_frame', windowId: window.id, isCollider: false };
  group.add(sill);

  // Top frame (header)
  const headerGeo = new THREE.BoxGeometry(
    isHorizontal ? window.width + frameThick * 2 : wall.thickness + 0.04,
    frameThick,
    isHorizontal ? wall.thickness + 0.04 : window.width + frameThick * 2
  );
  const header = new THREE.Mesh(headerGeo, frameMat);
  header.position.set(
    windowCenter.x,
    window.sillHeight + window.height + frameThick / 2,
    windowCenter.z
  );
  header.userData = { type: 'window_frame', windowId: window.id, isCollider: false };
  group.add(header);

  // Left post
  const leftPostGeo = new THREE.BoxGeometry(
    isHorizontal ? frameThick : wall.thickness + 0.04,
    window.height,
    isHorizontal ? wall.thickness + 0.04 : frameThick
  );
  const leftPost = new THREE.Mesh(leftPostGeo, frameMat);
  leftPost.position.set(
    windowCenter.x + (isHorizontal ? -halfWidth : 0),
    window.sillHeight + window.height / 2,
    windowCenter.z + (isHorizontal ? 0 : -halfWidth)
  );
  leftPost.userData = { type: 'window_frame', windowId: window.id, isCollider: false };
  group.add(leftPost);

  // Right post
  const rightPostGeo = new THREE.BoxGeometry(
    isHorizontal ? frameThick : wall.thickness + 0.04,
    window.height,
    isHorizontal ? wall.thickness + 0.04 : frameThick
  );
  const rightPost = new THREE.Mesh(rightPostGeo, frameMat);
  rightPost.position.set(
    windowCenter.x + (isHorizontal ? halfWidth : 0),
    window.sillHeight + window.height / 2,
    windowCenter.z + (isHorizontal ? 0 : halfWidth)
  );
  rightPost.userData = { type: 'window_frame', windowId: window.id, isCollider: false };
  group.add(rightPost);

  // Glass pane
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8e8ff,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.85,
    side: THREE.DoubleSide,
  });

  const glassGeo = new THREE.PlaneGeometry(
    isHorizontal ? window.width : window.height,
    isHorizontal ? window.height : window.width
  );
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(
    windowCenter.x,
    window.sillHeight + window.height / 2,
    windowCenter.z
  );

  // Rotate glass to align with wall
  if (isHorizontal) {
    // horizontal wall runs along X — glass faces Z
    // default PlaneGeometry faces +Z, so no rotation needed
  } else {
    // vertical wall runs along Z — glass faces X
    glass.rotation.y = Math.PI / 2;
  }

  glass.userData = { type: 'window_glass', windowId: window.id, isCollider: false };
  group.add(glass);

  // Center divider if 2+ panes
  if (window.paneCount >= 2) {
    const divGeo = new THREE.BoxGeometry(
      isHorizontal ? frameThick * 0.5 : 0.01,
      window.height,
      isHorizontal ? 0.01 : frameThick * 0.5
    );
    const divider = new THREE.Mesh(divGeo, frameMat);
    divider.position.set(
      windowCenter.x,
      window.sillHeight + window.height / 2,
      windowCenter.z
    );
    divider.userData = { type: 'window_frame', windowId: window.id, isCollider: false };
    group.add(divider);
  }

  return group;
}

/**
 * Compile all window frames for all walls.
 */
export function compileWindows(
  walls: WallSegment[],
  rooms: ParsedRoom[]
): THREE.Group {
  const windowGroup = new THREE.Group();
  windowGroup.name = 'windows';

  for (const wall of walls) {
    for (const win of wall.windows) {
      windowGroup.add(compileWindowFrame(wall, win, rooms));
    }
  }

  return windowGroup;
}
