'use client';

/**
 * Grammar of Graphics — First-Person Viewer (React Component)
 * 
 * The consumption layer of the engine. This React component:
 * 1. Takes raw room data from Gemini's analyze-floorplan
 * 2. Runs it through the Parser → Compiler pipeline
 * 3. Renders the resulting 3D scene with first-person controls
 * 
 * Usage:
 *   <FirstPersonViewer rooms={rooms} />
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RawRoom, DEFAULT_ENGINE_CONFIG, EngineConfig } from '../types';
import { parseFloorPlan } from '../parser/FloorPlanParser';
import { compileScene, CompiledScene } from '../compiler/SceneCompiler';
import { FirstPersonController } from './FirstPersonController';
import { CollisionSystem } from './CollisionSystem';

// ─── Internal Scene Component (runs inside Canvas) ─────────────────────────

interface SceneContentProps {
  compiledScene: CompiledScene;
  config: EngineConfig;
}

function SceneContent({ compiledScene, config }: SceneContentProps) {
  const { camera, scene } = useThree();
  const controllerRef = useRef<FirstPersonController | null>(null);
  const collisionRef = useRef<CollisionSystem | null>(null);
  const sceneAddedRef = useRef(false);

  // Add compiled scene to Three.js scene (once)
  useEffect(() => {
    if (sceneAddedRef.current) return;
    sceneAddedRef.current = true;

    scene.add(compiledScene.sceneGroup);

    // Set up collision
    const collision = new CollisionSystem(config);
    collision.setWallGroup(compiledScene.wallsGroup);
    collisionRef.current = collision;

    // Set up controller
    const controller = new FirstPersonController(camera, config);
    controller.collisionChecker = (pos, dir, dist) =>
      collision.checkCollision(pos, dir, dist);
    controllerRef.current = controller;

    // Teleport to spawn point
    controller.teleport(
      compiledScene.spawnPoint.x,
      compiledScene.spawnPoint.z,
      compiledScene.spawnLookAt.x,
      compiledScene.spawnLookAt.z
    );

    // Bind keyboard
    const unbind = controller.bind();

    return () => {
      unbind();
      scene.remove(compiledScene.sceneGroup);
      sceneAddedRef.current = false;
    };
  }, [compiledScene, camera, scene, config]);

  // Update controller every frame
  useFrame((_state, delta) => {
    if (controllerRef.current) {
      // Clamp delta to avoid huge jumps
      const clampedDelta = Math.min(delta, 0.1);
      controllerRef.current.update(clampedDelta);
    }
  });

  return null;
}

// ─── HUD Overlay ───────────────────────────────────────────────────────────

function HUDOverlay({ metadata }: { metadata: CompiledScene['metadata'] }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-3 rounded-lg pointer-events-none">
        <p className="text-white/90 text-[11px] font-medium mb-1.5">Navigation Controls</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-white/60">
          <span>↑ / W</span><span>Move forward</span>
          <span>↓ / S</span><span>Move backward</span>
          <span>← →</span><span>Turn left / right</span>
          <span>A / D</span><span>Strafe</span>
        </div>
      </div>

      {/* Scene info */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-3 rounded-lg pointer-events-none">
        <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider mb-1">Grammar of Graphics</p>
        <div className="text-[10px] text-white/60 space-y-0.5">
          <p>{metadata.roomCount} rooms · {metadata.wallCount} walls · {metadata.doorCount} doors</p>
          <p>{metadata.floorArea.toFixed(1)}m² · {metadata.worldWidth.toFixed(1)}m × {metadata.worldDepth.toFixed(1)}m</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Viewer Component ─────────────────────────────────────────────────

interface FirstPersonViewerProps {
  /** Raw room data from Gemini's analyze-floorplan API */
  rooms: RawRoom[];
  /** Optional engine configuration overrides */
  config?: Partial<EngineConfig>;
  /** Optional CSS class */
  className?: string;
}

/**
 * The Grammar of Graphics First-Person Viewer.
 * 
 * Feed it raw room data and it handles the entire pipeline:
 * parse → compile → render → navigate
 */
export default function FirstPersonViewer({
  rooms,
  config: configOverrides,
  className = '',
}: FirstPersonViewerProps) {
  const config = useMemo(() => ({
    ...DEFAULT_ENGINE_CONFIG,
    ...configOverrides,
  }), [configOverrides]);

  // Run the engine pipeline: parse → compile
  const compiledScene = useMemo(() => {
    if (!rooms || rooms.length === 0) return null;

    try {
      const floorPlan = parseFloorPlan(rooms, config);
      return compileScene(floorPlan, config);
    } catch (err) {
      console.error('[Grammar of Graphics] Compilation failed:', err);
      return null;
    }
  }, [rooms, config]);

  if (!compiledScene) {
    return (
      <div className={`flex items-center justify-center bg-[#1a1a1a] text-white/50 ${className}`}>
        <div className="text-center p-8">
          <div className="text-[40px] mb-2">🏠</div>
          <p className="text-[14px] font-medium">No floor plan data available</p>
          <p className="text-[12px] mt-1 text-white/30">Upload a blueprint to generate the 3D model</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-[#1a1a1a] ${className}`}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        camera={{
          fov: 70,
          near: 0.1,
          far: 100,
          position: [
            compiledScene.spawnPoint.x,
            compiledScene.spawnPoint.y,
            compiledScene.spawnPoint.z,
          ],
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <SceneContent
          compiledScene={compiledScene}
          config={config}
        />
      </Canvas>

      <HUDOverlay metadata={compiledScene.metadata} />
    </div>
  );
}
