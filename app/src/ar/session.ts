import { Matrix4, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import type { WebGLRenderer } from 'three';
import { uprightPlacement, type Placement } from './placement';

export async function isArSupported(xr: XRSystem | undefined = navigator.xr): Promise<boolean> {
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

/** Flat ring shown on detected surfaces where the model would be placed. */
export function createReticle(): Mesh {
  const geometry = new RingGeometry(0.06, 0.075, 32).rotateX(-Math.PI / 2);
  const material = new MeshBasicMaterial({ color: 0xffffff });
  const reticle = new Mesh(geometry, material);
  reticle.name = 'reticle';
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  return reticle;
}

export interface ArSessionOptions {
  renderer: WebGLRenderer;
  /** Reticle mesh; must already be part of the scene. */
  reticle: Mesh;
  /** DOM element promoted to the in-session overlay (dom-overlay feature). */
  overlayRoot?: HTMLElement;
  onPlace: (placement: Placement) => void;
  onEnd: () => void;
}

export interface ArSessionHandle {
  session: XRSession;
  /** Call once per rendered frame to keep the reticle on the latest hit-test result. */
  updateFrame: (frame: XRFrame | undefined) => void;
  end: () => Promise<void>;
}

export async function startArSession(options: ArSessionOptions): Promise<ArSessionHandle> {
  const xr = navigator.xr;
  if (!xr) throw new Error('WebXR ist auf diesem Gerät nicht verfügbar.');

  const { renderer, reticle } = options;

  const sessionInit: XRSessionInit = { requiredFeatures: ['hit-test'], optionalFeatures: [] };
  if (options.overlayRoot) {
    sessionInit.optionalFeatures = ['dom-overlay'];
    (sessionInit as XRSessionInit & { domOverlay: { root: Element } }).domOverlay = {
      root: options.overlayRoot,
    };
  }

  const session = await xr.requestSession('immersive-ar', sessionInit);

  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session as unknown as Parameters<typeof renderer.xr.setSession>[0]);

  const viewerSpace = await session.requestReferenceSpace('viewer');
  const hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });
  if (!hitTestSource) {
    await session.end();
    throw new Error('Hit-Test wird von diesem Gerät nicht unterstützt.');
  }

  const onSelect = () => {
    if (!reticle.visible) return;
    const cameraPosition = new Vector3().setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
    options.onPlace(uprightPlacement(reticle.matrix as Matrix4, cameraPosition));
  };
  session.addEventListener('select', onSelect);

  session.addEventListener('end', () => {
    hitTestSource.cancel();
    reticle.visible = false;
    options.onEnd();
  });

  const updateFrame = (frame: XRFrame | undefined) => {
    if (!frame) return;
    const referenceSpace = renderer.xr.getReferenceSpace();
    if (!referenceSpace) return;

    const pose = frame.getHitTestResults(hitTestSource)[0]?.getPose(referenceSpace);
    if (pose) {
      reticle.visible = true;
      reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      reticle.visible = false;
    }
  };

  return {
    session,
    updateFrame,
    end: async () => {
      try {
        await session.end();
      } catch {
        // Session already ended — fine.
      }
    },
  };
}
