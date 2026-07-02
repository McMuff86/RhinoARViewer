import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Uint32BufferAttribute,
} from 'three';
import type { ParsedMesh } from './types';

const DEFAULT_COLOR = 0x9aa0a6;

/** Turn parser output into a three.js group, applying a coordinate correction. */
export function buildMeshGroup(meshes: ParsedMesh[], correction: Matrix4, name: string): Group {
  const group = new Group();
  group.name = name;

  for (const pm of meshes) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(pm.positions, 3));
    geometry.setIndex(new Uint32BufferAttribute(pm.indices, 1));
    if (pm.normals) {
      geometry.setAttribute('normal', new Float32BufferAttribute(pm.normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    const material = new MeshStandardMaterial({
      color: pm.color ?? DEFAULT_COLOR,
      metalness: 0.05,
      roughness: 0.8,
      side: DoubleSide,
      opacity: pm.opacity,
      transparent: pm.opacity < 1,
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = pm.name;
    group.add(mesh);
  }

  group.applyMatrix4(correction);
  return group;
}
