import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Uint32BufferAttribute,
} from 'three';
import rhino3dm from 'rhino3dm';
import wasmUrl from 'rhino3dm/rhino3dm.wasm?url';
import { parse3dm, type RhinoModule } from './parse3dm';
import { buildModelCorrection } from '../geometry/units';
import type { LoadedModel } from './types';

let rhinoPromise: Promise<RhinoModule> | null = null;

function getRhino(): Promise<RhinoModule> {
  // rhino3dm's emscripten loader fetches the .wasm relative to its own
  // script URL, which breaks under Vite's bundling — point it explicitly.
  rhinoPromise ??= (rhino3dm as unknown as (opts: object) => Promise<RhinoModule>)({
    locateFile: () => wasmUrl,
  });
  return rhinoPromise;
}

const DEFAULT_COLOR = 0x9aa0a6;

export async function load3dm(data: ArrayBuffer): Promise<LoadedModel> {
  const rhino = await getRhino();
  const parsed = parse3dm(rhino, new Uint8Array(data));

  if (parsed.meshes.length === 0) {
    const detail = parsed.warnings.length > 0 ? ` ${parsed.warnings.join(' ')}` : '';
    throw new Error(`Keine darstellbare Geometrie in der Datei gefunden.${detail}`);
  }

  const group = new Group();
  group.name = '3dm';

  for (const pm of parsed.meshes) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(pm.positions, 3));
    geometry.setIndex(new Uint32BufferAttribute(pm.indices, 1));
    if (pm.normals) {
      geometry.setAttribute('normal', new Float32BufferAttribute(pm.normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    const material = new MeshStandardMaterial({
      color: pm.color ?? DEFAULT_COLOR,
      metalness: 0.05,
      roughness: 0.8,
      side: DoubleSide,
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = pm.name;
    group.add(mesh);
  }

  // Rhino Z-up / model units → three.js Y-up / meters.
  group.applyMatrix4(buildModelCorrection(parsed.unitSystem));

  return { object: group, warnings: parsed.warnings };
}
