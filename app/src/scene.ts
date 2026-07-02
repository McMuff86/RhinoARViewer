import {
  Box3,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Placement } from './ar/placement';

/**
 * Owns renderer, scene graph and the render loop. Works in two modes:
 * desktop preview (orbit controls, grid) and AR (camera passthrough,
 * model hidden until placed via hit-test).
 */
export class Viewer {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;

  private readonly controls: OrbitControls;
  private readonly grid: GridHelper;
  private readonly modelRoot: Group;
  private frameHook: ((frame: XRFrame | undefined) => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(60, 1, 0.01, 100);
    this.camera.position.set(1.4, 1.1, 1.4);

    this.scene.add(new HemisphereLight(0xffffff, 0x60666e, 1.4));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(1, 2, 1.5);
    this.scene.add(sun);

    this.grid = new GridHelper(4, 8, 0x4c8bf5, 0x3f454d);
    this.scene.add(this.grid);

    this.modelRoot = new Group();
    this.modelRoot.name = 'model-root';
    this.scene.add(this.modelRoot);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.2, 0);
    this.controls.enableDamping = true;

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      this.camera.aspect = clientWidth / Math.max(clientHeight, 1);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(clientWidth, clientHeight);
    };
    new ResizeObserver(resize).observe(container);
    resize();

    this.renderer.setAnimationLoop((_time: number, frame?: XRFrame) => {
      this.frameHook?.(frame);
      if (!this.renderer.xr.isPresenting) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  /** Replace the currently shown model. */
  setModel(object: Object3D): void {
    this.modelRoot.clear();
    this.modelRoot.add(object);
    if (!this.renderer.xr.isPresenting) this.frameModel();
  }

  hasModel(): boolean {
    return this.modelRoot.children.length > 0;
  }

  /** Fit the desktop camera to the current model. */
  private frameModel(): void {
    const box = new Box3().setFromObject(this.modelRoot);
    if (box.isEmpty()) return;
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());
    const distance = Math.max(size * 1.2, 0.5);
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(new Vector3(distance, distance * 0.7, distance));
    this.controls.update();
  }

  /** Per-frame hook used by the AR session for hit-testing. */
  setFrameHook(hook: ((frame: XRFrame | undefined) => void) | null): void {
    this.frameHook = hook;
  }

  enterArMode(): void {
    this.grid.visible = false;
    // Hidden until the user taps a detected surface.
    this.modelRoot.visible = false;
    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.quaternion.identity();
  }

  placeModel(placement: Placement): void {
    this.modelRoot.position.copy(placement.position);
    this.modelRoot.quaternion.copy(placement.rotation);
    this.modelRoot.visible = true;
  }

  exitArMode(): void {
    this.grid.visible = true;
    this.modelRoot.visible = true;
    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.quaternion.identity();
    this.frameModel();
  }
}
