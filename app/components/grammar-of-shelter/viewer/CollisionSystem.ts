/**
 * Grammar of Shelter — Collision System
 * 
 * Prevents the player from walking through walls using raycasting.
 * Doors are passable (they don't have collision geometry).
 */

import * as THREE from 'three';
import { EngineConfig, DEFAULT_ENGINE_CONFIG } from '../types';

/**
 * Collision detection system using Three.js raycasting.
 * 
 * Casts rays in the movement direction to detect wall meshes.
 * Only meshes with `userData.isCollider === true` are considered.
 */
export class CollisionSystem {
  private raycaster: THREE.Raycaster;
  private colliders: THREE.Object3D[] = [];

  constructor(
    private config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ) {
    this.raycaster = new THREE.Raycaster();
    // Only check nearby objects
    this.raycaster.near = 0;
    this.raycaster.far = config.playerCollisionRadius + config.movementSpeed * 0.1;
  }

  /**
   * Set the wall group to use for collision detection.
   * Extracts all meshes that have isCollider=true in their userData.
   */
  setWallGroup(wallGroup: THREE.Group): void {
    this.colliders = [];
    wallGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.isCollider) {
        this.colliders.push(child);
      }
    });
  }

  /**
   * Check if movement from `position` in `direction` for `distance`
   * would collide with any wall.
   * 
   * Casts multiple rays at different heights for robust detection.
   * 
   * @returns true if movement is blocked
   */
  checkCollision(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    distance: number
  ): boolean {
    if (this.colliders.length === 0) return false;

    // Cast rays at multiple heights for robustness
    const heights = [0.3, 0.8, 1.4]; // ankle, waist, chest

    for (const h of heights) {
      const origin = new THREE.Vector3(position.x, h, position.z);
      const dir = new THREE.Vector3(direction.x, 0, direction.z).normalize();

      this.raycaster.set(origin, dir);
      this.raycaster.far = distance;

      const intersections = this.raycaster.intersectObjects(this.colliders, false);

      if (intersections.length > 0) {
        return true; // blocked!
      }
    }

    // Also check diagonal rays for corner collisions
    const sideOffset = this.config.playerCollisionRadius;
    const right = new THREE.Vector3(-direction.z, 0, direction.x).normalize();

    for (const side of [-1, 1]) {
      const sideOrigin = new THREE.Vector3(
        position.x + right.x * sideOffset * side,
        1.0,
        position.z + right.z * sideOffset * side
      );
      const dir = new THREE.Vector3(direction.x, 0, direction.z).normalize();

      this.raycaster.set(sideOrigin, dir);
      this.raycaster.far = distance;

      const intersections = this.raycaster.intersectObjects(this.colliders, false);
      if (intersections.length > 0) {
        return true;
      }
    }

    return false; // clear to move
  }
}
