import {
  Box3,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Placement } from './ar/placement';
import { composeModelTransform, DEFAULT_ADJUST, type ModelAdjust } from './ar/modelTransform';

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
  private readonly shadowPlane: Mesh;
  private currentModel: Object3D | null = null;
  private frameHook: ((frame: XRFrame | undefined) => void) | null = null;
  private lastPlacement: Placement | null = null;
  private adjust: ModelAdjust = { ...DEFAULT_ADJUST };

  constructor(container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(60, 1, 0.01, 100);
    this.camera.position.set(1.4, 1.1, 1.4);

    this.scene.add(new HemisphereLight(0xffffff, 0x60666e, 1.4));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(1, 2, 1.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    this.grid = new GridHelper(4, 8, 0x4c8bf5, 0x3f454d);
    this.scene.add(this.grid);

    this.modelRoot = new Group();
    this.modelRoot.name = 'model-root';
    this.scene.add(this.modelRoot);

    // Shadow catcher: invisible plane that only shows the model's soft
    // shadow — anchors the model visually on real (and virtual) ground.
    this.shadowPlane = new Mesh(
      new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new ShadowMaterial({ opacity: 0.35 })
    );
    this.shadowPlane.name = 'shadow-catcher';
    this.shadowPlane.receiveShadow = true;
    this.shadowPlane.position.y = 0.002; // avoid z-fighting with real/virtual floor
    this.modelRoot.add(this.shadowPlane);

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
    if (this.currentModel) this.modelRoot.remove(this.currentModel);
    this.currentModel = object;
    this.modelRoot.add(object);

    object.traverse((child) => {
      if ((child as Mesh).isMesh) child.castShadow = true;
    });

    // Size the shadow catcher to the model footprint.
    const box = new Box3().setFromObject(object);
    if (!box.isEmpty()) {
      const size = box.getSize(new Vector3());
      const footprint = Math.max(size.x, size.z, 0.2) * 1.6;
      this.shadowPlane.scale.set(footprint, 1, footprint);
      this.shadowPlane.position.x = (box.min.x + box.max.x) / 2;
      this.shadowPlane.position.z = (box.min.z + box.max.z) / 2;
    }

    if (!this.renderer.xr.isPresenting) this.frameModel();
  }

  getModel(): Object3D | null {
    return this.currentModel;
  }

  hasModel(): boolean {
    return this.currentModel !== null;
  }

  /** Fit the desktop camera to the current model. */
  private frameModel(): void {
    if (!this.currentModel) return;
    const box = new Box3().setFromObject(this.currentModel);
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
    this.lastPlacement = null;
    this.adjust = { ...DEFAULT_ADJUST };
    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.quaternion.identity();
    this.modelRoot.scale.set(1, 1, 1);
  }

  placeModel(placement: Placement): void {
    this.lastPlacement = placement;
    this.applyPlacement();
    this.modelRoot.visible = true;
  }

  /** Live adjustments from the AR overlay sliders (scale / rotation). */
  setAdjust(adjust: ModelAdjust): void {
    this.adjust = adjust;
    if (this.lastPlacement) this.applyPlacement();
  }

  private applyPlacement(): void {
    if (!this.lastPlacement) return;
    const t = composeModelTransform(this.lastPlacement, this.adjust);
    this.modelRoot.position.copy(t.position);
    this.modelRoot.quaternion.copy(t.rotation);
    this.modelRoot.scale.copy(t.scale);
  }

  exitArMode(): void {
    this.grid.visible = true;
    this.modelRoot.visible = true;
    this.lastPlacement = null;
    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.quaternion.identity();
    this.modelRoot.scale.set(1, 1, 1);
    this.frameModel();
  }
}
