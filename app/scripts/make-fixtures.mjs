/**
 * Generates .3dm test fixtures and the bundled sample model using rhino3dm.
 * Run via `npm run fixtures`. The generated files are committed to git so
 * tests do not depend on this script at runtime.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import rhino3dm from 'rhino3dm';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(appDir, 'tests', 'fixtures');
const modelsDir = join(appDir, 'public', 'models');
mkdirSync(fixturesDir, { recursive: true });
mkdirSync(modelsDir, { recursive: true });

const rhino = await rhino3dm();

/** Axis-aligned box mesh (Rhino coordinates, Z-up), sizes in model units. */
function makeBoxMesh(sx, sy, sz) {
  const mesh = new rhino.Mesh();
  const v = [
    [0, 0, 0], [sx, 0, 0], [sx, sy, 0], [0, sy, 0],
    [0, 0, sz], [sx, 0, sz], [sx, sy, sz], [0, sy, sz],
  ];
  for (const [x, y, z] of v) mesh.vertices().add(x, y, z);
  const quads = [
    [3, 2, 1, 0], // bottom (facing -Z)
    [4, 5, 6, 7], // top
    [0, 1, 5, 4], // front
    [1, 2, 6, 5], // right
    [2, 3, 7, 6], // back
    [3, 0, 4, 7], // left
  ];
  for (const [a, b, c, d] of quads) {
    mesh.faces().addTriFace(a, b, c);
    mesh.faces().addTriFace(a, c, d);
  }
  return mesh;
}

function newDocMillimeters() {
  const doc = new rhino.File3dm();
  doc.settings().modelUnitSystem = rhino.UnitSystem.Millimeters;
  return doc;
}

function save(doc, dir, name) {
  const bytes = doc.toByteArray();
  const path = join(dir, name);
  writeFileSync(path, bytes);
  console.log(`wrote ${path} (${bytes.length} bytes)`);
  return path;
}

// --- Fixture 1: a 500 mm box as a plain Mesh object (always renderable) ---
{
  const doc = newDocMillimeters();
  const mesh = makeBoxMesh(500, 500, 500);
  const attributes = new rhino.ObjectAttributes();
  attributes.name = 'box-mesh';
  doc.objects().add(mesh, attributes);
  save(doc, fixturesDir, 'mesh-box.3dm');
  // The same file doubles as the bundled sample model.
  save(doc, modelsDir, 'sample-box.3dm');
}

// --- Fixture 2: empty file (no objects at all) ---
{
  const doc = newDocMillimeters();
  save(doc, fixturesDir, 'empty.3dm');
}

// --- Fixture 3: curve only (nothing renderable, but no warning expected) ---
{
  const doc = newDocMillimeters();
  const circle = new rhino.Circle(100);
  doc.objects().add(circle.toNurbsCurve(), null);
  save(doc, fixturesDir, 'curve-only.3dm');
}

// --- Fixture 4: extrusion without cached render mesh (warning expected) ---
{
  const doc = newDocMillimeters();
  const circle = new rhino.Circle(100);
  const extrusion = rhino.Extrusion.create(circle.toNurbsCurve(), 200, true);
  if (!extrusion) throw new Error('Extrusion.create failed');
  const attributes = new rhino.ObjectAttributes();
  attributes.name = 'extrusion-no-mesh';
  doc.objects().add(extrusion, attributes);
  save(doc, fixturesDir, 'extrusion-no-rendermesh.3dm');
}

// --- Self-verification: read fixtures back and print a summary ---
import { readFileSync } from 'node:fs';
for (const name of ['mesh-box.3dm', 'empty.3dm', 'curve-only.3dm', 'extrusion-no-rendermesh.3dm']) {
  const doc = rhino.File3dm.fromByteArray(new Uint8Array(readFileSync(join(fixturesDir, name))));
  const unit = doc.settings().modelUnitSystem;
  console.log(
    `verify ${name}: objects=${doc.objects().count}, unitSystem=${unit?.value ?? unit}`
  );
}
console.log('done');
