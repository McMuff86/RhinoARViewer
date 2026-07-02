import type { Object3D } from 'three';

export interface LoadedModel {
  object: Object3D;
  /** Non-fatal issues to surface in the UI (e.g. skipped objects). */
  warnings: string[];
}

/** Format-agnostic mesh data as produced by the .3dm/.step parsers. */
export interface ParsedMesh {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array | null;
  /** 0xRRGGBB display color, or null when the object has no usable color. */
  color: number | null;
  /** 0.05–1, 1 = opaque. */
  opacity: number;
  name: string;
}
