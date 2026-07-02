import { Matrix4, Vector3 } from 'three';

/**
 * Meters per unit for Rhino's UnitSystem enum (RhinoCommon numbering,
 * mirrored by rhino3dm). Validated against the live enum in tests.
 */
export const METERS_PER_RHINO_UNIT: Readonly<Record<number, number>> = {
  0: 1, // None — treat as meters
  1: 1e-6, // Microns
  2: 0.001, // Millimeters
  3: 0.01, // Centimeters
  4: 1, // Meters
  5: 1000, // Kilometers
  6: 2.54e-8, // Microinches
  7: 2.54e-5, // Mils
  8: 0.0254, // Inches
  9: 0.3048, // Feet
  10: 1609.344, // Miles
  12: 1e-10, // Angstroms
  13: 1e-9, // Nanometers
  14: 0.1, // Decimeters
  15: 10, // Dekameters
  16: 100, // Hectometers
};

export function metersPerUnit(unitSystem: number): number {
  return METERS_PER_RHINO_UNIT[unitSystem] ?? 1;
}

/**
 * Transform from Rhino's coordinate system (Z-up, right-handed, model units)
 * into three.js world space (Y-up, right-handed, meters).
 *
 * Implemented as a proper rotation (-90° around X), not an axis swap, so
 * handedness and triangle winding are preserved: (x, y, z) → (x, z, -y).
 */
export function buildModelCorrection(unitSystem: number): Matrix4 {
  const s = metersPerUnit(unitSystem);
  const rotation = new Matrix4().makeRotationX(-Math.PI / 2);
  const scale = new Matrix4().makeScale(s, s, s);
  return rotation.multiply(scale);
}

/** Convenience for tests and streaming: convert a single Rhino point to three.js space. */
export function rhinoPointToThree(x: number, y: number, z: number, unitSystem: number): Vector3 {
  return new Vector3(x, y, z).applyMatrix4(buildModelCorrection(unitSystem));
}
