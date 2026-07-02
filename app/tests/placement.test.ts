import { describe, expect, it } from 'vitest';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { uprightPlacement } from '../src/ar/placement';

function hitMatrixAt(x: number, y: number, z: number, tilt = 0): Matrix4 {
  // Hit poses on slanted surfaces carry arbitrary tilt — simulate that.
  return new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromEuler(new Euler(tilt, 0.4, tilt)),
    new Vector3(1, 1, 1)
  );
}

describe('uprightPlacement', () => {
  it('takes the position from the hit pose', () => {
    const { position } = uprightPlacement(hitMatrixAt(1, 0.02, -2));
    expect(position.x).toBeCloseTo(1);
    expect(position.y).toBeCloseTo(0.02);
    expect(position.z).toBeCloseTo(-2);
  });

  it('ignores pose tilt — result rotation has no roll or pitch', () => {
    const { rotation } = uprightPlacement(hitMatrixAt(0, 0, 0, 0.8), new Vector3(3, 1.6, 4));
    const up = new Vector3(0, 1, 0).applyQuaternion(rotation);
    expect(up.x).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(1);
    expect(up.z).toBeCloseTo(0);
  });

  it('turns the model front (+Z) towards the camera', () => {
    const camera = new Vector3(0, 1.6, 5); // straight ahead of the hit point
    const { rotation } = uprightPlacement(hitMatrixAt(0, 0, 0), camera);
    const front = new Vector3(0, 0, 1).applyQuaternion(rotation);
    expect(front.x).toBeCloseTo(0);
    expect(front.z).toBeCloseTo(1); // facing the camera

    const cameraRight = new Vector3(5, 1.6, 0);
    const sideways = uprightPlacement(hitMatrixAt(0, 0, 0), cameraRight).rotation;
    const frontRight = new Vector3(0, 0, 1).applyQuaternion(sideways);
    expect(frontRight.x).toBeCloseTo(1);
    expect(frontRight.z).toBeCloseTo(0);
  });

  it('returns identity rotation when the camera is directly above', () => {
    const { rotation } = uprightPlacement(hitMatrixAt(2, 0, 3), new Vector3(2, 1.8, 3));
    expect(rotation.equals(new Quaternion())).toBe(true);
  });

  it('returns identity rotation without a camera position', () => {
    const { rotation } = uprightPlacement(hitMatrixAt(1, 2, 3));
    expect(rotation.equals(new Quaternion())).toBe(true);
  });
});
