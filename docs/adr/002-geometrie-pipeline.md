# ADR-002: Geometrie-Pipeline — .3dm client-seitig, glTF nativ, STEP später

- **Status:** Akzeptiert
- **Datum:** 2026-07-02

## Kontext

Die App soll „irgendeine Geometrie" anzeigen: .3dm, STEP, glTF etc. Kernfrage ist, wo tesselliert wird (CAD-Geometrie → Dreiecksnetze).

Fakten:

- **rhino3dm.js kann BREPs nicht selbst vernetzen** (`Mesh.createFromBrep` existiert nur in Rhino.Compute). Client-seitig verfügbar sind: Mesh-Objekte direkt, und für BREPs/Extrusions die **im File gespeicherten Render-Meshes** (`BrepFace.getMesh(MeshType.Render)`), die Rhino beim Speichern nach schattierter Anzeige mitschreibt.
- glTF/GLB ist das Web-native Format (Y-up, Meter) und wird von three.js direkt geladen.
- STEP ist client-seitig via `occt-import-js` (OpenCascade-WASM) realistisch, aber zusätzlicher Aufwand.
- Rhino.Compute wäre ein Server mit Rhino-Lizenzbindung — zu schwer für einen PoC.

## Entscheidung

1. **.3dm wird vollständig client-seitig geparst** (rhino3dm-WASM, eigener Parser `app/src/loaders/parse3dm.ts`): Mesh-Objekte direkt, BREPs/Extrusions über gespeicherte Render-Meshes. Fehlen diese, bekommt der Nutzer eine klare Handlungsanweisung („in Rhino schattiert anzeigen und erneut speichern").
2. **glTF/GLB** wird als zweites Eingabeformat direkt unterstützt (three.js `GLTFLoader`).
3. **STEP** kommt in einer späteren Phase über `occt-import-js` im Web Worker (siehe ROADMAP). Bis dahin: STEP in Rhino öffnen und als .3dm/GLB speichern.
4. **Kein Rhino.Compute als Pflichtabhängigkeit.** Für die GH-Live-Phase liefert Grasshopper ohnehin fertige Meshes (die bestehende GH-Komponente tut das bereits).
5. Koordinaten/Einheiten: Konvertierung Rhino (Z-up, Modelleinheiten) → three.js (Y-up, Meter) als **echte Rotation** (−90° um X), nicht als Achsentausch, damit Handedness und Dreiecks-Winding erhalten bleiben (`app/src/geometry/units.ts`).

## Konsequenzen

- (+) Kein Server, keine Lizenzbindung, .3dm-Dateien bleiben lokal.
- (−) Aus Grasshopper direkt gespeicherte BREPs ohne Render-Meshes zeigen nichts an → klare Fehlermeldung + Doku; GH-Nutzer meshen in GH (ein Mesh-Node).
- (−) STEP erfordert vorerst den Umweg über Rhino.
