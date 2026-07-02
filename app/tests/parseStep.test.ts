import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import occtimportjs from 'occt-import-js';
import { parseStep, type OcctModule } from '../src/loaders/parseStep';

let occt: OcctModule;

beforeAll(async () => {
  occt = (await (occtimportjs as unknown as () => Promise<unknown>)()) as OcctModule;
}, 30000);

describe('parseStep', () => {
  it('tessellates a STEP cube into renderable mesh data', () => {
    const data = new Uint8Array(readFileSync(join(__dirname, 'fixtures', 'cube.stp')));
    const result = parseStep(occt, data);

    expect(result.meshes.length).toBeGreaterThanOrEqual(1);
    const mesh = result.meshes[0]!;

    expect(mesh.positions.length).toBeGreaterThan(0);
    expect(mesh.positions.length % 3).toBe(0);
    expect(mesh.indices.length % 3).toBe(0); // triangles
    expect(mesh.opacity).toBe(1);

    // every index must reference an existing vertex
    const vertexCount = mesh.positions.length / 3;
    const maxIndex = Math.max(...Array.from(mesh.indices));
    expect(maxIndex).toBeLessThan(vertexCount);

    // all coordinates finite
    for (const value of mesh.positions) expect(Number.isFinite(value)).toBe(true);
  });

  it('throws a readable error on garbage input', () => {
    expect(() => parseStep(occt, new Uint8Array([1, 2, 3, 4]))).toThrow(/STEP/);
  });
});
