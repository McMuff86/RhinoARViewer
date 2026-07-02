import type rhino3dm from 'rhino3dm';

export type RhinoModule = Awaited<ReturnType<typeof rhino3dm>>;

export interface ParsedMesh {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array | null;
  /** 0xRRGGBB display color, or null when the object has no usable color. */
  color: number | null;
  name: string;
}

export interface Parsed3dm {
  meshes: ParsedMesh[];
  /** Rhino UnitSystem value (RhinoCommon numbering), see geometry/units.ts. */
  unitSystem: number;
  warnings: string[];
}

interface ThreejsJson {
  data: {
    attributes: {
      position: { array: number[] };
      normal?: { array: number[] };
    };
    index?: { array: number[] };
  };
}

/**
 * Extract renderable meshes from a .3dm file, fully client-side.
 *
 * Mesh objects are used directly. Breps, extrusions and SubDs can only be
 * shown when the file contains cached render meshes — Rhino writes those
 * when the model was displayed in a shaded mode before saving ("save with
 * render meshes"). rhino3dm cannot mesh BREPs itself; that requires
 * Rhino.Compute, which we deliberately do not depend on (ADR-002).
 *
 * Geometry is returned in raw Rhino coordinates (Z-up, model units);
 * callers apply `buildModelCorrection()` from geometry/units.ts.
 */
export function parse3dm(rhino: RhinoModule, data: Uint8Array): Parsed3dm {
  const r = rhino as any;
  const doc = r.File3dm.fromByteArray(data);
  if (!doc) {
    throw new Error('Datei konnte nicht als .3dm gelesen werden (beschädigt oder kein 3dm-Format).');
  }

  const meshes: ParsedMesh[] = [];
  const warnings: string[] = [];
  let unitSystem = 0;

  try {
    unitSystem = enumValue(doc.settings().modelUnitSystem);
    const objects = doc.objects();

    for (let i = 0; i < objects.count; i++) {
      const obj = objects.get(i);
      const geometry = obj?.geometry();
      if (!geometry) continue;

      const attributes = obj.attributes();
      // Mirror Rhino: hidden objects and objects on hidden layers don't render.
      if (isHidden(doc, attributes)) continue;
      const name: string = attributes?.name || `Objekt ${i + 1}`;
      const color = extractColor(r, doc, attributes);
      const objectType = enumValue(geometry.objectType);

      const renderMeshes: any[] = [];
      let needsRenderMesh = false;

      if (objectType === enumValue(r.ObjectType.Mesh)) {
        renderMeshes.push(geometry);
      } else if (objectType === enumValue(r.ObjectType.Brep)) {
        needsRenderMesh = true;
        const faces = geometry.faces();
        for (let f = 0; f < faces.count; f++) {
          const face = faces.get(f);
          const m = face?.getMesh(r.MeshType.Render);
          if (m && m.vertices().count > 0) renderMeshes.push(m);
        }
      } else if (objectType === enumValue(r.ObjectType.Extrusion)) {
        needsRenderMesh = true;
        const m = geometry.getMesh(r.MeshType.Render);
        if (m && m.vertices().count > 0) renderMeshes.push(m);
      } else if (objectType === enumValue(r.ObjectType.SubD)) {
        warnings.push(`"${name}" (SubD) wird übersprungen — SubD-Objekte vor dem Speichern in ein Mesh umwandeln.`);
        continue;
      } else {
        // Curves, points, annotations etc. — nothing to render in AR.
        continue;
      }

      if (renderMeshes.length === 0 && needsRenderMesh) {
        warnings.push(
          `"${name}" hat keine gespeicherten Render-Meshes. ` +
            'In Rhino das Modell im schattierten Modus anzeigen und erneut speichern.'
        );
        continue;
      }

      for (const rhinoMesh of renderMeshes) {
        const parsed = meshToParsed(rhinoMesh, color, name);
        if (parsed) meshes.push(parsed);
      }
    }
  } finally {
    doc.delete?.();
  }

  return { meshes, unitSystem, warnings };
}

function isHidden(doc: any, attributes: any): boolean {
  try {
    if (attributes?.visible === false) return true;
    const layerIndex = attributes?.layerIndex;
    if (typeof layerIndex === 'number' && layerIndex >= 0) {
      const layer = doc.layers().get(layerIndex);
      if (layer && layer.visible === false) return true;
    }
  } catch {
    // If visibility can't be determined, show the object rather than drop it.
  }
  return false;
}

/** Emscripten enums are objects with a numeric `.value`; plain numbers pass through. */
function enumValue(e: unknown): number {
  if (typeof e === 'number') return e;
  const v = (e as { value?: number } | null)?.value;
  return typeof v === 'number' ? v : -1;
}

function meshToParsed(rhinoMesh: any, color: number | null, name: string): ParsedMesh | null {
  try {
    rhinoMesh.faces()?.convertQuadsToTriangles?.();
  } catch {
    // Non-fatal: toThreejsJSON triangulates as well.
  }

  const json = rhinoMesh.toThreejsJSON() as ThreejsJson;
  const position = json?.data?.attributes?.position?.array;
  if (!position || position.length === 0) return null;

  const index = json.data.index?.array;
  const indices = index
    ? new Uint32Array(index)
    : Uint32Array.from({ length: position.length / 3 }, (_, k) => k);

  const normalArray = json.data.attributes.normal?.array;

  return {
    positions: new Float32Array(position),
    indices,
    normals: normalArray && normalArray.length === position.length ? new Float32Array(normalArray) : null,
    color,
    name,
  };
}

function extractColor(r: any, doc: any, attributes: any): number | null {
  try {
    const source = enumValue(attributes.colorSource);
    if (source === enumValue(r.ObjectColorSource.ColorFromObject)) {
      return rgbToHex(attributes.objectColor);
    }
    if (source === enumValue(r.ObjectColorSource.ColorFromLayer)) {
      const layer = doc.layers().get(attributes.layerIndex);
      if (layer) return rgbToHex(layer.color);
    }
  } catch {
    // Color is cosmetic — never fail parsing over it.
  }
  return null;
}

function rgbToHex(c: { r: number; g: number; b: number } | null): number | null {
  if (!c) return null;
  return ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}
