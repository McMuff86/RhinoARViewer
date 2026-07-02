import type { Color, Material, Mesh, Object3D } from 'three';

/** User overrides for how the current model is displayed. */
export interface Appearance {
  /** 0.05–1; 1 = opaque. */
  opacity: number;
  /** CSS hex color overriding all materials, or null for original colors. */
  color: string | null;
}

export const DEFAULT_APPEARANCE: Appearance = { opacity: 1, color: null };

interface OriginalState {
  color: number | null;
  opacity: number;
  transparent: boolean;
}

type ColorMaterial = Material & { color?: Color };

const ORIGINAL_KEY = '__originalAppearance';

/**
 * Apply opacity/color overrides to every mesh material under `root`.
 * The first touch snapshots the original state into material.userData,
 * so overrides are fully reversible (opacity 1 + color null = original).
 * Lines (e.g. edge overlays) are deliberately left untouched.
 */
export function applyAppearance(root: Object3D, appearance: Appearance): void {
  const opacity = Math.min(Math.max(appearance.opacity, 0.05), 1);

  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials as ColorMaterial[]) {
      let original = material.userData[ORIGINAL_KEY] as OriginalState | undefined;
      if (!original) {
        original = {
          color: material.color ? material.color.getHex() : null,
          opacity: material.opacity,
          transparent: material.transparent,
        };
        material.userData[ORIGINAL_KEY] = original;
      }

      if (material.color && original.color !== null) {
        if (appearance.color) {
          material.color.set(appearance.color);
        } else {
          material.color.setHex(original.color);
        }
      }

      material.opacity = original.opacity * opacity;
      material.transparent = original.transparent || material.opacity < 1;
      material.needsUpdate = true;
    }
  });
}
