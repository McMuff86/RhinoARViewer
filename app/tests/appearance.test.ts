import { describe, expect, it } from 'vitest';
import {
  BoxGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { applyAppearance, DEFAULT_APPEARANCE } from '../src/appearance';

function makeModel(color = 0x4c8bf5): { group: Group; material: MeshStandardMaterial } {
  const material = new MeshStandardMaterial({ color });
  const group = new Group();
  group.add(new Mesh(new BoxGeometry(1, 1, 1), material));
  return { group, material };
}

describe('applyAppearance', () => {
  it('overrides the material color and restores the original', () => {
    const { group, material } = makeModel(0x112233);

    applyAppearance(group, { opacity: 1, color: '#ff0000' });
    expect(material.color.getHex()).toBe(0xff0000);

    applyAppearance(group, { opacity: 1, color: null });
    expect(material.color.getHex()).toBe(0x112233);
  });

  it('keeps the original snapshot across repeated overrides', () => {
    const { group, material } = makeModel(0x112233);

    applyAppearance(group, { opacity: 1, color: '#ff0000' });
    applyAppearance(group, { opacity: 1, color: '#00ff00' }); // must not re-snapshot green as "original"
    applyAppearance(group, DEFAULT_APPEARANCE);
    expect(material.color.getHex()).toBe(0x112233);
  });

  it('applies opacity and marks the material transparent', () => {
    const { group, material } = makeModel();

    applyAppearance(group, { opacity: 0.5, color: null });
    expect(material.opacity).toBeCloseTo(0.5);
    expect(material.transparent).toBe(true);

    applyAppearance(group, DEFAULT_APPEARANCE);
    expect(material.opacity).toBe(1);
    expect(material.transparent).toBe(false);
  });

  it('respects a material that was transparent to begin with', () => {
    const material = new MeshStandardMaterial({ transparent: true, opacity: 0.8 });
    const group = new Group();
    group.add(new Mesh(new BoxGeometry(1, 1, 1), material));

    applyAppearance(group, { opacity: 0.5, color: null });
    expect(material.opacity).toBeCloseTo(0.4); // scales the original 0.8

    applyAppearance(group, DEFAULT_APPEARANCE);
    expect(material.opacity).toBeCloseTo(0.8);
    expect(material.transparent).toBe(true); // stays transparent as authored
  });

  it('handles multi-material meshes', () => {
    const a = new MeshStandardMaterial({ color: 0x111111 });
    const b = new MeshStandardMaterial({ color: 0x222222 });
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), [a, b]);
    const group = new Group();
    group.add(mesh);

    applyAppearance(group, { opacity: 0.3, color: '#ffffff' });
    expect(a.color.getHex()).toBe(0xffffff);
    expect(b.color.getHex()).toBe(0xffffff);
    expect(a.opacity).toBeCloseTo(0.3);
    expect(b.opacity).toBeCloseTo(0.3);
  });

  it('leaves line materials (edge overlays) untouched', () => {
    const lineMaterial = new LineBasicMaterial({ color: 0xffffff });
    const group = new Group();
    group.add(new LineSegments(new BoxGeometry(1, 1, 1), lineMaterial));

    applyAppearance(group, { opacity: 0.2, color: '#ff0000' });
    expect(lineMaterial.color.getHex()).toBe(0xffffff);
    expect(lineMaterial.opacity).toBe(1);
  });

  it('clamps opacity so the model never fully disappears', () => {
    const { group, material } = makeModel();
    applyAppearance(group, { opacity: 0, color: null });
    expect(material.opacity).toBeGreaterThan(0);
  });
});
