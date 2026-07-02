import type { ParsedMesh } from './types';

export interface ParsedStep {
  meshes: ParsedMesh[];
  warnings: string[];
}

interface OcctMesh {
  name?: string;
  /** [r, g, b] as 0–1 floats. */
  color?: number[];
  attributes: { position: { array: number[] }; normal?: { array: number[] } };
  index?: { array: number[] };
}

export interface OcctModule {
  ReadStepFile(content: Uint8Array, params: null): { success: boolean; meshes: OcctMesh[] };
}

/**
 * Tessellate a STEP file via occt-import-js (OpenCascade WASM).
 *
 * Unlike .3dm, STEP needs no cached render meshes — OCCT meshes the
 * BREPs itself. Coordinates are returned as stored in the file; STEP
 * files are conventionally Z-up in millimeters, which is what the
 * caller assumes when applying the coordinate correction.
 */
export function parseStep(occt: OcctModule, data: Uint8Array): ParsedStep {
  let result: ReturnType<OcctModule['ReadStepFile']>;
  try {
    result = occt.ReadStepFile(data, null);
  } catch {
    throw new Error('Datei konnte nicht als STEP gelesen werden (beschädigt oder kein STEP-Format).');
  }
  if (!result?.success) {
    throw new Error('Datei konnte nicht als STEP gelesen werden (beschädigt oder kein STEP-Format).');
  }

  const meshes: ParsedMesh[] = [];
  result.meshes.forEach((m, i) => {
    const position = m.attributes?.position?.array;
    if (!position || position.length === 0) return;

    const index = m.index?.array;
    const normal = m.attributes.normal?.array;

    meshes.push({
      positions: new Float32Array(position),
      indices:
        index && index.length > 0
          ? new Uint32Array(index)
          : Uint32Array.from({ length: position.length / 3 }, (_, k) => k),
      normals: normal && normal.length === position.length ? new Float32Array(normal) : null,
      color: colorToHex(m.color),
      opacity: 1,
      name: m.name || `Teil ${i + 1}`,
    });
  });

  return { meshes, warnings: [] };
}

function colorToHex(color: number[] | undefined): number | null {
  if (!color || color.length < 3) return null;
  const to255 = (v: number) => Math.round(Math.min(Math.max(v, 0), 1) * 255);
  return (to255(color[0]!) << 16) | (to255(color[1]!) << 8) | to255(color[2]!);
}
