import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { LoadedModel } from './types';

/**
 * Load a glTF/GLB binary buffer. glTF is Y-up and in meters per spec,
 * so no coordinate correction is needed.
 */
export function loadGlb(data: ArrayBuffer): Promise<LoadedModel> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(
      data,
      '',
      (gltf) => resolve({ object: gltf.scene, warnings: [] }),
      (error) => reject(error instanceof Error ? error : new Error('GLB konnte nicht gelesen werden.'))
    );
  });
}
