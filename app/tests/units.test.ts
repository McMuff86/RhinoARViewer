import { describe, expect, it } from 'vitest';
import { buildModelCorrection, metersPerUnit, rhinoPointToThree } from '../src/geometry/units';

describe('metersPerUnit', () => {
  it('maps common Rhino unit systems (RhinoCommon numbering)', () => {
    expect(metersPerUnit(2)).toBe(0.001); // Millimeters
    expect(metersPerUnit(3)).toBe(0.01); // Centimeters
    expect(metersPerUnit(4)).toBe(1); // Meters
    expect(metersPerUnit(8)).toBe(0.0254); // Inches
    expect(metersPerUnit(9)).toBe(0.3048); // Feet
  });

  it('falls back to meters for unknown values', () => {
    expect(metersPerUnit(999)).toBe(1);
    expect(metersPerUnit(-1)).toBe(1);
  });
});

describe('buildModelCorrection', () => {
  it('maps Rhino up (Z) to three.js up (Y)', () => {
    const p = rhinoPointToThree(0, 0, 1, 4); // meters
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(0);
  });

  it('maps Rhino forward (Y) to three.js -Z (proper rotation, not a mirror)', () => {
    const p = rhinoPointToThree(0, 1, 0, 4);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(-1);
  });

  it('scales millimeters to meters', () => {
    const p = rhinoPointToThree(500, 0, 1000, 2); // mm
    expect(p.x).toBeCloseTo(0.5);
    expect(p.y).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(0);
  });

  it('preserves handedness (positive determinant → winding intact)', () => {
    expect(buildModelCorrection(2).determinant()).toBeGreaterThan(0);
  });
});
