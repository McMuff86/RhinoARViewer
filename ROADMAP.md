# Roadmap

Ziel: Rhino-Geometrie (.3dm, glTF, später STEP und Live-Grasshopper) per Smartphone-Kamera in die reale Umgebung projizieren. Architektur-Entscheidungen: siehe `docs/adr/`.

## M0 — Fundament ✅

- [x] Neuausrichtung auf Web-Stack (ADR-001 bis ADR-006)
- [x] `app/` mit Vite + TypeScript + three.js, Vitest/IWER/Playwright
- [x] .3dm-Fixtures + eingecheckte Testdaten (`app/scripts/make-fixtures.mjs`)
- [x] CLAUDE.md/AGENTS.md/README neu

## M1 — „Hello AR" ✅

- [x] WebXR `immersive-ar` mit Hit-Test, Reticle, Tap-Platzierung (aufrecht, zur Kamera gedreht)
- [x] DOM-Overlay (Hinweis + „AR beenden"), Testwürfel als eingebautes Modell
- [x] Desktop-Fallback: 3D-Vorschau mit OrbitControls
- [x] Manueller Test auf ARCore-Android — erfolgreich (2026-07-02)

## M2 — Echte Geometrie ✅ (Rest → M3/Später)

- [x] GLB-Loader (three.js GLTFLoader)
- [x] .3dm-Loader client-seitig (rhino3dm-WASM): Meshes direkt, BREPs/Extrusions via gespeicherte Render-Meshes, klare Fehlermeldung sonst
- [x] Einheiten/Achsen-Korrektur (mm→m usw., Z-up→Y-up als echte Rotation)
- [x] Datei öffnen (.3dm/.glb/.gltf) + gebündeltes Beispielmodell
- [x] Modell in AR skalieren/rotieren (Slider im Overlay; `beforexrselect` verhindert Fehl-Platzierungen)
- [x] .3dm-Parsing im Web Worker (kein UI-Freeze bei großen Dateien)
- [x] Layer-/Objekt-Sichtbarkeit aus .3dm respektiert (versteckte Objekte/Layer werden übersprungen)

## M3 — PoC-Polish (fast fertig)

- [x] QR-Code auf der Desktop-Seite mit der LAN-URL (Handy scannt statt tippt)
- [x] Lade-Zustand: Spinner + Controls gesperrt während Parsing
- [x] Deckkraft-Slider + Material-Farb-Override (Desktop: Color-Picker; AR-Overlay: Slider + Farb-Swatches; „Original" stellt Ausgangsmaterialien wieder her)
- [x] Schattenfänger-Ebene (weicher Kontaktschatten unter dem Modell, skaliert mit dem Footprint)
- [ ] Materialien aus .3dm feiner übernehmen (Material-Transparenz aus der Datei, Textur-Basisfarben)
- [ ] Beleuchtung: WebXR Light Estimation (optionales Feature)

## M4 — STEP-Import

- [ ] `occt-import-js` im Web Worker; STEP → Mesh client-seitig (ADR-002)

## M5 — Grasshopper Live (ADR-006)

- [ ] `server/`-Relay reaktivieren + Tests nachziehen
- [ ] `MeshSerializer.cs` auf rohe Rhino-Koordinaten umstellen (Konvertierung macht der Browser)
- [ ] Socket.IO-Client in der Web-App; Mesh-Updates live in die (AR-)Szene
- [ ] Room-Code-Flow: GH-Komponente zeigt Code/QR, Handy tritt bei

## Später / Ideen

- iOS: statischer Quick-Look-Export (USDZExporter), ggf. Variant Launch (ADR-003)
- Anchors/Persistenz (Modell bleibt zwischen Sessions verankert)
- Platzierung an Wänden, Maßstab-Presets (1:1, 1:10, 1:100)
- Hosting übers Internet (TLS, Auth) für Baustellen-Einsatz
