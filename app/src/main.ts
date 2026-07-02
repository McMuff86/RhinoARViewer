import { BoxGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial } from 'three';
import { Viewer } from './scene';
import { createReticle, isArSupported, startArSession, type ArSessionHandle } from './ar/session';
import { load3dm } from './loaders/load3dm';
import { loadGlb } from './loaders/loadGlb';
import type { LoadedModel } from './loaders/types';

const viewport = document.getElementById('viewport') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;
const arButton = document.getElementById('btn-ar') as HTMLButtonElement;
const exitButton = document.getElementById('btn-exit-ar') as HTMLButtonElement;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const overlayRoot = document.getElementById('ar-overlay') as HTMLElement;
const arHint = document.getElementById('ar-hint') as HTMLElement;

const viewer = new Viewer(viewport);
const reticle = createReticle();
viewer.scene.add(reticle);

let arSession: ArSessionHandle | null = null;

function setStatus(text: string, isError = false): void {
  statusEl.textContent = text;
  statusEl.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

/** Built-in fallback model so the app works without any file. */
function makeTestCube(): LoadedModel {
  const group = new Group();
  const size = 0.4;
  const geometry = new BoxGeometry(size, size, size);
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({ color: 0x4c8bf5, metalness: 0.1, roughness: 0.6 })
  );
  mesh.position.y = size / 2; // stand on the ground, not in it
  const edges = new LineSegments(
    new EdgesGeometry(geometry),
    new LineBasicMaterial({ color: 0xffffff })
  );
  edges.position.y = size / 2;
  group.add(mesh, edges);
  return { object: group, warnings: [] };
}

function showModel(model: LoadedModel, label: string): void {
  viewer.setModel(model.object);
  if (model.warnings.length > 0) {
    setStatus(`${label} geladen — Hinweis: ${model.warnings.join(' ')}`, false);
  } else {
    setStatus(`${label} geladen.`);
  }
}

async function loadFromBuffer(buffer: ArrayBuffer, fileName: string): Promise<void> {
  const lower = fileName.toLowerCase();
  setStatus(`Lade ${fileName} …`);
  try {
    let model: LoadedModel;
    if (lower.endsWith('.3dm')) {
      model = await load3dm(buffer);
    } else if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
      model = await loadGlb(buffer);
    } else {
      throw new Error('Nicht unterstütztes Format. Bitte .3dm oder .glb/.gltf wählen.');
    }
    showModel(model, fileName);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : `Fehler beim Laden von ${fileName}.`, true);
  }
}

async function selectBuiltinModel(value: string): Promise<void> {
  if (value === 'cube') {
    showModel(makeTestCube(), 'Testwürfel');
    return;
  }
  if (value === 'sample-3dm') {
    setStatus('Lade Beispiel-Box …');
    try {
      const response = await fetch('models/sample-box.3dm');
      if (!response.ok) throw new Error('Beispieldatei nicht gefunden.');
      showModel(await load3dm(await response.arrayBuffer()), 'Beispiel-Box (.3dm)');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Beispieldatei konnte nicht geladen werden.', true);
    }
  }
}

modelSelect.addEventListener('change', () => void selectBuiltinModel(modelSelect.value));

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  await loadFromBuffer(await file.arrayBuffer(), file.name);
});

arButton.addEventListener('click', async () => {
  if (arSession) return;
  if (!viewer.hasModel()) {
    setStatus('Zuerst ein Modell laden.', true);
    return;
  }
  arButton.disabled = true;
  try {
    viewer.enterArMode();
    document.body.classList.add('in-ar');
    arHint.textContent = 'Bewege das Handy langsam, bis der Ring erscheint – dann tippen.';

    arSession = await startArSession({
      renderer: viewer.renderer,
      reticle,
      overlayRoot,
      onPlace: (placement) => {
        viewer.placeModel(placement);
        arHint.textContent = 'Tippe erneut, um das Modell neu zu platzieren.';
      },
      onEnd: () => {
        arSession = null;
        document.body.classList.remove('in-ar');
        viewer.setFrameHook(null);
        viewer.exitArMode();
        arButton.disabled = false;
        setStatus('AR-Sitzung beendet.');
      },
    });
    viewer.setFrameHook(arSession.updateFrame);
  } catch (error) {
    document.body.classList.remove('in-ar');
    viewer.exitArMode();
    arButton.disabled = false;
    setStatus(error instanceof Error ? error.message : 'AR-Sitzung konnte nicht gestartet werden.', true);
  }
});

exitButton.addEventListener('click', () => void arSession?.end());

async function init(): Promise<void> {
  showModel(makeTestCube(), 'Testwürfel');

  if (await isArSupported()) {
    arButton.disabled = false;
    setStatus('Bereit. Modell wählen und „AR starten".');
  } else {
    arButton.disabled = true;
    arButton.title = 'WebXR AR wird von diesem Browser nicht unterstützt.';
    setStatus('Kein AR verfügbar — 3D-Vorschau aktiv. Auf einem ARCore-Android in Chrome öffnen (HTTPS).');
  }
}

void init();
