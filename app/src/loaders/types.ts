import type { Object3D } from 'three';

export interface LoadedModel {
  object: Object3D;
  /** Non-fatal issues to surface in the UI (e.g. skipped objects). */
  warnings: string[];
}
