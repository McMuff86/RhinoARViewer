# Roadmap

Ziel: Rhino-Geometrie (.3dm, glTF, später STEP und Live-Grasshopper) per Smartphone-Kamera in die reale Umgebung projizieren. Architektur-Entscheidungen: siehe `docs/adr/`.

## M0 — Fundament ✅

- [x] Neuausrichtung auf Web-Stack (ADR-001 bis ADR-006)
- [x] `app/` mit Vite + TypeScript + three.js, Vitest/IWER/Playwright
- [x] .3dm-Fixtures + eingecheckte Testdaten (`app/scripts/make-fixtures.mjs`)
- [x] CLAUDE.md/AGENTS.md/README neu

## M1 — „Hello AR" ✅ (Code; Gerätetest offen)

- [x] WebXR `immersive-ar` mit Hit-Test, Reticle, Tap-Platzierung (aufrecht, zur Kamera gedreht)
- [x] DOM-Overlay (Hinweis + „AR beenden"), Testwürfel als eingebautes Modell
- [x] Desktop-Fallback: 3D-Vorschau mit OrbitControls
- [ ] **Manueller Test auf ARCore-Android** (Anleitung im README) — bei Problemen: Issue mit Gerät/Chrome-Version notieren

## M2 — Echte Geometrie (begonnen)

- [x] GLB-Loader (three.js GLTFLoader)
- [x] .3dm-Loader client-seitig (rhino3dm-WASM): Meshes direkt, BREPs/Extrusions via gespeicherte Render-Meshes, klare Fehlermeldung sonst
- [x] Einheiten/Achsen-Korrektur (mm→m usw., Z-up→Y-up als echte Rotation)
- [x] Datei öffnen (.3dm/.glb/.gltf) + gebündeltes Beispielmodell
- [ ] Modell in AR skalieren/rotieren (Gesten oder Slider im Overlay)
- [ ] Größere Dateien: Parsing in Web Worker verschieben (UI-Freeze vermeiden)
- [ ] Materialien/Layer aus .3dm feiner übernehmen (Transparenz, Layer-Sichtbarkeit)

## M3 — PoC-Polish

- [ ] Lade-Indikator + Fehler-UI verfeinern
- [ ] QR-Code auf der Desktop-Seite mit der LAN-URL (Handy scannt statt tippt)
- [ ] Beleuchtung: WebXR Light Estimation (optionales Feature)
- [ ] Schattenfänger-Ebene (weicher Kontaktschatten) für bessere Verankerung

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
