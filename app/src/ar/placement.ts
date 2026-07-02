import { Matrix4, Quaternion, Vector3 } from 'three';

const WORLD_UP = new Vector3(0, 1, 0);

export interface Placement {
  position: Vector3;
  /** Yaw-only rotation: the model stays upright regardless of surface tilt. */
  rotation: Quaternion;
}

/**
 * Derive an upright placement from a WebXR hit-test pose matrix.
 *
 * The position is taken from the hit pose. The rotation ignores the pose
 * orientation entirely (hit poses on horizontal planes have arbitrary yaw
 * and tilt on slanted surfaces) and instead turns the model's front (+Z)
 * horizontally towards the camera, if a camera position is given.
 */
export function uprightPlacement(hitMatrix: Matrix4, cameraPosition?: Vector3): Placement {
  const position = new Vector3().setFromMatrixPosition(hitMatrix);
  const rotation = new Quaternion();

  if (cameraPosition) {
    const dx = cameraPosition.x - position.x;
    const dz = cameraPosition.z - position.z;
    if (dx * dx + dz * dz > 1e-8) {
      rotation.setFromAxisAngle(WORLD_UP, Math.atan2(dx, dz));
    }
  }

  return { position, rotation };
}
