// Dedicated worker: tessellates STEP files off the main thread. The
// OCCT WASM (~7 MB) is only fetched when the first STEP file is opened.
import occtimportjs from 'occt-import-js';
import wasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import { parseStep, type OcctModule, type ParsedStep } from './parseStep';
import type { WorkerRequest, WorkerResponse } from './workerChannel';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse<ParsedStep>, options?: { transfer: Transferable[] }): void;
};

let occtPromise: Promise<OcctModule> | null = null;

scope.onmessage = async (event) => {
  const { id, data } = event.data;
  try {
    occtPromise ??= (occtimportjs as unknown as (opts: object) => Promise<OcctModule>)({
      locateFile: () => wasmUrl,
    });
    const occt = await occtPromise;
    const parsed = parseStep(occt, new Uint8Array(data));

    const transfer: Transferable[] = [];
    for (const mesh of parsed.meshes) {
      transfer.push(mesh.positions.buffer, mesh.indices.buffer);
      if (mesh.normals) transfer.push(mesh.normals.buffer);
    }
    scope.postMessage({ id, ok: true, parsed }, { transfer });
  } catch (error) {
    scope.postMessage({
      id,
      ok: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler beim Parsen der STEP-Datei.',
    });
  }
};
