import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { composeModelTransform, DEFAULT_ADJUST } from '../src/ar/modelTransform';
import type { Placement } from '../src/ar/placement';

function placementAt(x: number, y: number, z: number, yawRad = 0): Placement {
  return {
    position: new Vector3(x, y, z),
    rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yawRad),
  };
}

describe('composeModelTransform', () => {
  it('passes the placement through unchanged with default adjustments', () => {
    const t = composeModelTransform(placementAt(1, 0, -2), DEFAULT_ADJUST);
    expect(t.position.x).toBeCloseTo(1);
    expect(t.position.z).toBeCloseTo(-2);
    expect(t.rotation.equals(new Quaternion())).toBe(true);
    expect(t.scale.x).toBe(1);
  });

  it('applies uniform scale', () => {
    const t = composeModelTransform(placementAt(0, 0, 0), { scale: 0.25, yawDeg: 0 });
    expect(t.scale.x).toBeCloseTo(0.25);
    expect(t.scale.y).toBeCloseTo(0.25);
    expect(t.scale.z).toBeCloseTo(0.25);
  });

  it('rotates the model front by the yaw angle', () => {
    const t = composeModelTransform(placementAt(0, 0, 0), { scale: 1, yawDeg: 90 });
    const front = new Vector3(0, 0, 1).applyQuaternion(t.rotation);
    expect(front.x).toBeCloseTo(1);
    expect(front.z).toBeCloseTo(0);
  });

  it('composes user yaw with the placement yaw (both around world up)', () => {
    const t = composeModelTransform(placementAt(0, 0, 0, Math.PI / 2), { scale: 1, yawDeg: 90 });
    const front = new Vector3(0, 0, 1).applyQuaternion(t.rotation);
    expect(front.x).toBeCloseTo(0);
    expect(front.z).toBeCloseTo(-1); // 90° + 90° = 180°

    const up = new Vector3(0, 1, 0).applyQuaternion(t.rotation);
    expect(up.y).toBeCloseTo(1); // still upright
  });

  it('never collapses to zero scale', () => {
    const t = composeModelTransform(placementAt(0, 0, 0), { scale: 0, yawDeg: 0 });
    expect(t.scale.x).toBeGreaterThan(0);
  });
});
