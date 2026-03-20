/**
 * Grammar of Shelter — Structure Registry
 * 
 * A registry of all known structure types for extensibility.
 * New structure types can be registered at runtime.
 */

import { WallStructure } from './WallStructure';
import { DoorStructure } from './DoorStructure';
import { FloorStructure } from './FloorStructure';

export type StructureType = 'wall' | 'door' | 'floor';

interface StructureConstructor {
  new (...args: any[]): WallStructure | DoorStructure | FloorStructure;
}

class StructureRegistryClass {
  private registry = new Map<StructureType, StructureConstructor>();

  constructor() {
    // Register built-in types
    this.register('wall', WallStructure);
    this.register('door', DoorStructure);
    this.register('floor', FloorStructure);
  }

  register(type: StructureType, constructor: StructureConstructor): void {
    this.registry.set(type, constructor);
  }

  get(type: StructureType): StructureConstructor | undefined {
    return this.registry.get(type);
  }

  has(type: StructureType): boolean {
    return this.registry.has(type);
  }

  getRegisteredTypes(): StructureType[] {
    return Array.from(this.registry.keys());
  }
}

/** Singleton registry instance */
export const StructureRegistry = new StructureRegistryClass();
