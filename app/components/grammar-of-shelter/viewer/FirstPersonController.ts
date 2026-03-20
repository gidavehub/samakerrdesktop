/**
 * Grammar of Shelter — First-Person Controller
 * 
 * Handles arrow key / WASD keyboard input to navigate the 3D scene.
 * Works with the CollisionSystem to prevent walking through walls.
 */

import * as THREE from 'three';
import { EngineConfig, DEFAULT_ENGINE_CONFIG } from '../types';

/** Current key states */
interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turnLeft: boolean;
  turnRight: boolean;
}

/**
 * First-person camera controller with keyboard navigation.
 * 
 * Manages camera position/rotation based on keyboard input,
 * with delta-time-based movement for consistent speed.
 */
export class FirstPersonController {
  private keys: KeyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false,
  };

  private yaw: number = 0;  // horizontal rotation
  private moveDirection = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  
  /** Collision checker callback — returns true if movement is blocked */
  public collisionChecker: ((
    position: THREE.Vector3,
    direction: THREE.Vector3,
    distance: number,
  ) => boolean) | null = null;

  constructor(
    private camera: THREE.Camera,
    private config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ) {
    // Compute initial yaw from camera orientation
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    this.yaw = Math.atan2(lookDir.x, lookDir.z);
  }

  /**
   * Bind keyboard event listeners.
   * Returns a cleanup function to unbind.
   */
  bind(): () => void {
    const onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    const onKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Ignore if user is typing in an input field
    if (e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement) return;

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = true;
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = true;
        e.preventDefault();
        break;
      case 'ArrowLeft':
        this.keys.turnLeft = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.keys.turnRight = true;
        e.preventDefault();
        break;
      case 'KeyA':
        this.keys.left = true;
        e.preventDefault();
        break;
      case 'KeyD':
        this.keys.right = true;
        e.preventDefault();
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'ArrowLeft':
        this.keys.turnLeft = false;
        break;
      case 'ArrowRight':
        this.keys.turnRight = false;
        break;
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'KeyD':
        this.keys.right = false;
        break;
    }
  }

  /**
   * Update camera position and rotation based on current key states.
   * Call this every frame (inside useFrame).
   * 
   * @param delta - Time since last frame in seconds
   */
  update(delta: number): void {
    const speed = this.config.movementSpeed;
    const rotSpeed = this.config.rotationSpeed;

    // Rotation (turning)
    if (this.keys.turnLeft) this.yaw += rotSpeed * delta;
    if (this.keys.turnRight) this.yaw -= rotSpeed * delta;

    // Movement direction based on current yaw
    this.moveDirection.set(0, 0, 0);

    if (this.keys.forward) {
      this.moveDirection.x += Math.sin(this.yaw);
      this.moveDirection.z += Math.cos(this.yaw);
    }
    if (this.keys.backward) {
      this.moveDirection.x -= Math.sin(this.yaw);
      this.moveDirection.z -= Math.cos(this.yaw);
    }
    if (this.keys.left) {
      this.moveDirection.x += Math.cos(this.yaw);
      this.moveDirection.z -= Math.sin(this.yaw);
    }
    if (this.keys.right) {
      this.moveDirection.x -= Math.cos(this.yaw);
      this.moveDirection.z += Math.sin(this.yaw);
    }

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();

      const moveDistance = speed * delta;
      const newPosition = this.camera.position.clone();
      newPosition.x += this.moveDirection.x * moveDistance;
      newPosition.z += this.moveDirection.z * moveDistance;

      // Check collision
      let blocked = false;
      if (this.collisionChecker) {
        blocked = this.collisionChecker(
          this.camera.position,
          this.moveDirection,
          moveDistance + this.config.playerCollisionRadius
        );
      }

      if (!blocked) {
        this.camera.position.x = newPosition.x;
        this.camera.position.z = newPosition.z;
      }
    }

    // Keep eye height constant
    this.camera.position.y = this.config.playerEyeHeight;

    // Update camera look direction based on yaw
    const lookTarget = new THREE.Vector3(
      this.camera.position.x + Math.sin(this.yaw) * 5,
      this.config.playerEyeHeight,
      this.camera.position.z + Math.cos(this.yaw) * 5
    );
    this.camera.lookAt(lookTarget);
  }

  /**
   * Teleport the camera to a specific position.
   */
  teleport(x: number, z: number, lookAtX?: number, lookAtZ?: number): void {
    this.camera.position.set(x, this.config.playerEyeHeight, z);

    if (lookAtX !== undefined && lookAtZ !== undefined) {
      this.yaw = Math.atan2(lookAtX - x, lookAtZ - z);
    }
  }

  /**
   * Check if any movement keys are currently pressed.
   */
  get isMoving(): boolean {
    return this.keys.forward || this.keys.backward ||
           this.keys.left || this.keys.right ||
           this.keys.turnLeft || this.keys.turnRight;
  }
}
