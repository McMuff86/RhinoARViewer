// Dedicated worker: parses .3dm off the main thread so large files
// don't freeze the UI (and the AR render loop) during WASM parsing.
import rhino3dm from 'rhino3dm';
import wasmUrl from 'rhino3dm/rhino3dm.wasm?url';
import { parse3dm, type Parsed3dm, type RhinoModule } from './parse3dm';

export interface Worker3dmRequest {
  id: number;
  data: ArrayBuffer;
}

export type Worker3dmResponse =
  | { id: number; ok: true; parsed: Parsed3dm }
  | { id: number; ok: false; message: string };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Worker3dmRequest>) => void) | null;
  postMessage(message: Worker3dmResponse, options?: { transfer: Transferable[] }): void;
};

let rhinoPromise: Promise<RhinoModule> | null = null;

scope.onmessage = async (event) => {
  const { id, data } = event.data;
  try {
    rhinoPromise ??= (rhino3dm as unknown as (opts: object) => Promise<RhinoModule>)({
      locateFile: () => wasmUrl,
    });
    const rhino = await rhinoPromise;
    const parsed = parse3dm(rhino, new Uint8Array(data));

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
      message: error instanceof Error ? error.message : 'Unbekannter Fehler beim Parsen der .3dm-Datei.',
    });
  }
};
