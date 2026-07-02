import { buildMeshGroup } from './buildGroup';
import { createWorkerChannel } from './workerChannel';
import type { ParsedStep } from './parseStep';
import { buildModelCorrection } from '../geometry/units';
import type { LoadedModel } from './types';

const channel = createWorkerChannel<ParsedStep>(
  () => new Worker(new URL('./workerStep.ts', import.meta.url), { type: 'module' }),
  'STEP-Worker ist abgestürzt.'
);

/** STEP files are conventionally Z-up millimeters (Rhino unit system 2). */
const STEP_UNIT_SYSTEM = 2;

export async function loadStep(data: ArrayBuffer): Promise<LoadedModel> {
  const parsed = await channel.request(data);

  if (parsed.meshes.length === 0) {
    throw new Error('Keine darstellbare Geometrie in der STEP-Datei gefunden.');
  }

  const group = buildMeshGroup(parsed.meshes, buildModelCorrection(STEP_UNIT_SYSTEM), 'step');
  return { object: group, warnings: parsed.warnings };
}
