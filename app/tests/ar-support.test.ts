// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { XRDevice, metaQuest3 } from 'iwer';
import { createReticle, isArSupported } from '../src/ar/session';

describe('isArSupported', () => {
  it('is false when WebXR is missing entirely', async () => {
    expect(await isArSupported(undefined)).toBe(false);
  });

  it('is false when the browser rejects the query', async () => {
    const xr = {
      isSessionSupported: () => Promise.reject(new Error('blocked')),
    } as unknown as XRSystem;
    expect(await isArSupported(xr)).toBe(false);
  });

  it('reflects the runtime answer (emulated via IWER)', async () => {
    // jsdom has no WebGL — IWER only needs the constructors to exist.
    (globalThis as any).WebGLRenderingContext ??= class {};
    (globalThis as any).WebGL2RenderingContext ??= class {};
    const device = new XRDevice(metaQuest3);
    device.installRuntime();
    const xr = (globalThis.navigator as Navigator).xr;
    expect(xr).toBeDefined();
    const supported = await isArSupported(xr);
    expect(supported).toBe(device.supportedSessionModes.includes('immersive-ar'));
  });
});

describe('createReticle', () => {
  it('starts hidden and drives its matrix manually (hit-test writes it)', () => {
    const reticle = createReticle();
    expect(reticle.visible).toBe(false);
    expect(reticle.matrixAutoUpdate).toBe(false);
  });
});
