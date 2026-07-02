import { Quaternion, Vector3 } from 'three';
import type { Placement } from './placement';

const WORLD_UP = new Vector3(0, 1, 0);

/** User adjustments applied on top of a placement (AR overlay sliders). */
export interface ModelAdjust {
  /** Uniform scale factor, 1 = true size. */
  scale: number;
  /** Additional rotation around the model's up axis, in degrees. */
  yawDeg: number;
}

export const DEFAULT_ADJUST: ModelAdjust = { scale: 1, yawDeg: 0 };

export interface ModelTransform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

/**
 * Combine a hit-test placement with user adjustments. Both the placement
 * rotation and the user yaw rotate around world up, so the model always
 * stays upright and anchored at the placed point.
 */
export function composeModelTransform(placement: Placement, adjust: ModelAdjust): ModelTransform {
  const scale = Math.max(adjust.scale, 0.001); // guard against a zeroed slider
  const yaw = new Quaternion().setFromAxisAngle(WORLD_UP, (adjust.yawDeg * Math.PI) / 180);

  return {
    position: placement.position.clone(),
    rotation: placement.rotation.clone().multiply(yaw),
    scale: new Vector3(scale, scale, scale),
  };
}
