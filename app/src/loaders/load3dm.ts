import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Uint32BufferAttribute,
} from 'three';
import type { Parsed3dm } from './parse3dm';
import type { Worker3dmRequest, Worker3dmResponse } from './worker3dm';
import { buildModelCorrection } from '../geometry/units';
import type { LoadedModel } from './types';

let worker: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<number, { resolve: (p: Parsed3dm) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker3dm.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<Worker3dmResponse>) => {
      const request = pending.get(event.data.id);
      if (!request) return;
      pending.delete(event.data.id);
      if (event.data.ok) {
        request.resolve(event.data.parsed);
      } else {
        request.reject(new Error(event.data.message));
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || '.3dm-Worker ist abgestürzt.');
      for (const request of pending.values()) request.reject(error);
      pending.clear();
      worker?.terminate();
      worker = null; // next call spawns a fresh worker
    };
  }
  return worker;
}

function parseInWorker(data: ArrayBuffer): Promise<Parsed3dm> {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++;
    pending.set(id, { resolve, reject });
    const message: Worker3dmRequest = { id, data };
    getWorker().postMessage(message, [data]); // transfer, don't copy
  });
}

const DEFAULT_COLOR = 0x9aa0a6;

export async function load3dm(data: ArrayBuffer): Promise<LoadedModel> {
  const parsed = await parseInWorker(data);

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
      opacity: pm.opacity,
      transparent: pm.opacity < 1,
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = pm.name;
    group.add(mesh);
  }

  // Rhino Z-up / model units → three.js Y-up / meters.
  group.applyMatrix4(buildModelCorrection(parsed.unitSystem));

  return { object: group, warnings: parsed.warnings };
}
