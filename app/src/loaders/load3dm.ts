import { buildMeshGroup } from './buildGroup';
import { createWorkerChannel } from './workerChannel';
import type { Parsed3dm } from './parse3dm';
import { buildModelCorrection } from '../geometry/units';
import type { LoadedModel } from './types';

const channel = createWorkerChannel<Parsed3dm>(
  () => new Worker(new URL('./worker3dm.ts', import.meta.url), { type: 'module' }),
  '.3dm-Worker ist abgestürzt.'
);

export async function load3dm(data: ArrayBuffer): Promise<LoadedModel> {
  const parsed = await channel.request(data);

  if (parsed.meshes.length === 0) {
    const detail = parsed.warnings.length > 0 ? ` ${parsed.warnings.join(' ')}` : '';
    throw new Error(`Keine darstellbare Geometrie in der Datei gefunden.${detail}`);
  }

  // Rhino Z-up / model units → three.js Y-up / meters.
  const group = buildMeshGroup(parsed.meshes, buildModelCorrection(parsed.unitSystem), '3dm');
  return { object: group, warnings: parsed.warnings };
}
