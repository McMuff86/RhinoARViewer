import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';
import { loadGlb } from '../src/loaders/loadGlb';

describe('loadGlb', () => {
  it('parses a binary glTF into a three.js object tree', async () => {
    const data = readFileSync(join(__dirname, 'fixtures', 'Box.glb'));
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

    const { object, warnings } = await loadGlb(buffer);

    expect(warnings).toEqual([]);
    let meshCount = 0;
    object.traverse((child) => {
      if (child instanceof Mesh) meshCount++;
    });
    expect(meshCount).toBe(1);
  });

  it('rejects on garbage input', async () => {
    await expect(loadGlb(new Uint8Array([9, 9, 9, 9]).buffer)).rejects.toThrow();
  });
});
