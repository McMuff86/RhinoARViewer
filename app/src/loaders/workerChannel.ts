/** Request/response envelope shared by the parser workers. */
export interface WorkerRequest {
  id: number;
  data: ArrayBuffer;
}

export type WorkerResponse<T> = { id: number; ok: true; parsed: T } | { id: number; ok: false; message: string };

/**
 * One-shot request/response channel to a parser worker. The worker is
 * created lazily on first use (so its WASM is only fetched when needed)
 * and replaced automatically if it crashes.
 */
export function createWorkerChannel<T>(makeWorker: () => Worker, crashMessage: string) {
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, { resolve: (parsed: T) => void; reject: (error: Error) => void }>();

  function getWorker(): Worker {
    if (!worker) {
      worker = makeWorker();
      worker.onmessage = (event: MessageEvent<WorkerResponse<T>>) => {
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
        const error = new Error(event.message || crashMessage);
        for (const request of pending.values()) request.reject(error);
        pending.clear();
        worker?.terminate();
        worker = null; // next request spawns a fresh worker
      };
    }
    return worker;
  }

  return {
    request(data: ArrayBuffer): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        const message: WorkerRequest = { id, data };
        getWorker().postMessage(message, [data]); // transfer, don't copy
      });
    },
  };
}
