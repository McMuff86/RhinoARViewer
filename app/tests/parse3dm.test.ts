import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import rhino3dm from 'rhino3dm';
import { parse3dm, type RhinoModule } from '../src/loaders/parse3dm';
import { metersPerUnit } from '../src/geometry/units';

const fixturesDir = join(__dirname, 'fixtures');
let rhino: RhinoModule;

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixturesDir, name)));
}

beforeAll(async () => {
  rhino = await rhino3dm();
});

describe('parse3dm', () => {
  it('validates the unit map against the live rhino3dm enum', () => {
    const r = rhino as any;
    expect(metersPerUnit(r.UnitSystem.Millimeters.value)).toBe(0.001);
    expect(metersPerUnit(r.UnitSystem.Meters.value)).toBe(1);
    expect(metersPerUnit(r.UnitSystem.Inches.value)).toBe(0.0254);
  });

  it('extracts a mesh object with triangulated faces and unit system', () => {
    const result = parse3dm(rhino, fixture('mesh-box.3dm'));

    expect(result.warnings).toEqual([]);
    expect(result.meshes).toHaveLength(1);
    expect(metersPerUnit(result.unitSystem)).toBe(0.001); // saved in mm

    const mesh = result.meshes[0]!;
    expect(mesh.name).toBe('box-mesh');
    expect(mesh.positions.length % 3).toBe(0);
    expect(mesh.positions.length).toBeGreaterThanOrEqual(8 * 3);
    expect(mesh.indices.length).toBe(36); // 12 triangles
    // 500 mm box in raw Rhino coordinates (no unit scaling at parse level)
    const max = Math.max(...mesh.positions);
    expect(max).toBeCloseTo(500);
  });

  it('returns no meshes for an empty file', () => {
    const result = parse3dm(rhino, fixture('empty.3dm'));
    expect(result.meshes).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('silently skips non-renderable geometry like curves', () => {
    const result = parse3dm(rhino, fixture('curve-only.3dm'));
    expect(result.meshes).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('warns clearly when a solid has no cached render mesh', () => {
    const result = parse3dm(rhino, fixture('extrusion-no-rendermesh.3dm'));
    expect(result.meshes).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('extrusion-no-mesh');
    expect(result.warnings[0]).toContain('Render-Meshes');
  });

  it('throws a readable error on garbage input', () => {
    expect(() => parse3dm(rhino, new Uint8Array([1, 2, 3, 4]))).toThrow(/3dm/);
  });
});
