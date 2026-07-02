# Research: AR-Stack für Rhino-Geometrie auf dem Smartphone (Juli 2026)

Zusammenfassung von drei parallelen Recherchen (Markt, WebXR-Machbarkeit, Unreal/Native) als Grundlage für ADR-001 bis ADR-006.

## 1. Markt-Landschaft

**Rhino/Grasshopper-nativ:**

- **Fologram** (fologram.com) — einziges Produkt mit echtem Live-GH→AR-Streaming (HoloLens 2, Quest, iOS, Android). Closed source; Headset-Nutzung Abo-pflichtig. Letzte auffindbare Releases Okt 2024, keine News 2025/26 → stagnierend. UX-Referenz: QR-Code-Sessions, Layer-Streaming.
- **Twinbuild** (twinbuild.com, gleiche Firma) — nur HoloLens 2, das seit Okt 2024 eingestellt ist (Support-Ende 31.12.2027) → Sackgasse.
- **iRhino 3D** (McNeel, gratis, aktiv gepflegt) — offizieller .3dm-Viewer mit AR-Modus, **iOS-only**. Für Android existiert kein .3dm-AR-Viewer.
- **ShapeDiver** — GH-Definitionen als Cloud-Konfiguratoren mit AR-Button (glTF→USDZ serverseitig); parametrisch, aber kein Live-Link zu lokalem GH.
- **COMPAS XR** (github.com/compas-dev/compas_xr, ETH Zürich, aktiv) — Open-Source-Referenz für GH→Mobile-AR, aber forschungslastig (Unity-basiert, Fabrikations-Fokus).
- **mcneel/rhino3dm-ar-sample** — winziges offizielles PoC (2019): .3dm → Web-AR. Bestätigt die Machbarkeit des Web-Pfads.

**BIM/AEC-Viewer** (alle App-Silos mit Datei-Upload, kein Rhino/GH-Live): Arkio, Trimble SiteVision, GAMMA AR, Dalux TwinBIM, Augin, vGIS.

**Generisch:** Adobe Aero **abgeschaltet** (Nov 2025). Sketchfab im Epic/Fab-Umbau. `<model-viewer>` (Google, Apache-2.0) aktiv (v4.3.1, Juni 2026). Apple Quick Look (USDZ) aktiv und strategisch (`<model>`-Element in Safari 26/visionOS).

**Gap:** Ein selbst-hostbarer, installationsfreier Web-AR-Viewer für Rhino-Geometrie — später mit GH-Live-Link — hat 2026 keinen direkten Wettbewerber.

## 2. WebXR-Machbarkeit

- **Android Chrome: produktionsreif.** `immersive-ar` + Hit-Test (Chrome 81), Anchors (85), Plane Detection (91); ARCore-zertifiziertes Gerät + „Google Play Services for AR" vorausgesetzt. (developers.google.com/ar/develop/webxr, caniuse.com/webxr)
- **iOS Safari: kein WebXR** bis einschließlich iOS 26.5 (caniuse; Apple-Foren bestätigen `immersive-ar` weder auf iOS noch visionOS). Workarounds: AR Quick Look/USDZ (statisch, JS stoppt), **Variant Launch** App Clip ($99/Mt./Projekt, eigener WebXR-Code läuft), **8th Wall wird abgeschaltet** (Editor-Zugang Feb 2026, Hosting Feb 2027; Engine ohne SLAM open-sourced), Mozilla WebXR Viewer tot.
- **three.js**: gepflegte offizielle AR-Beispiele (`webxr_ar_hittest`), WebXRManager mit hit-test/anchors/DOM-Overlay/Light Estimation. Alternativen: Babylon.js (reichhaltigeres XR-Feature-Management), A-Frame (1.8.0, Juni 2026), Needle Engine, `<model-viewer>` (geringster Aufwand, aber keine eigene In-AR-Logik).
- **rhino3dm.js 8.17** (npm, aktiv): parst .3dm vollständig client-seitig (`File3dm.fromByteArray`). **Kritisch:** `Mesh.createFromBrep` existiert nur in Rhino.Compute; client-seitig liefern BREPs nur die **im File gecachten Render-Meshes** (`BrepFace.getMesh(MeshType.Render)` → null, wenn nicht mit schattierter Anzeige gespeichert). Mesh-Objekte funktionieren immer; `toThreejsJSON()` liefert BufferGeometry-kompatible Daten. (github.com/mcneel/rhino3dm, Issues #467; three.js #23912)
- **STEP im Browser:** machbar via `occt-import-js` (kovacsv, OpenCascade-WASM; bewährt in Online3DViewer, Wartung langsam) oder OpenCascade.js (schwerer); neuer: occt-wasm (~4 MB). Serverseitige Konvertierung nur für Riesen-Assemblies nötig.
- **Live-Streaming-Vorbilder:** MeshStreamingGrasshopper (jhorikawa, GH→Socket.IO→three.js), Speckle (produktionsreifer GH-Connector + three.js-Viewer), meshcat. Mesh-Austausch in laufender WebXR-Session ist technisch problemlos (gleicher Render-Loop).
- **Test-Infrastruktur:** Vitest 4 (Browser Mode stabil), **IWER** (Meta, MIT — emulierte WebXR-Runtime inkl. Action-Recorder) für gerätelose XR-Tests, Playwright für E2E.

## 3. Unreal Engine 5 / Native

- **UE5 Handheld-AR: Wartungsmodus.** Offiziell nicht deprecated, aber: gebundelte SDKs eingefroren auf ARCore 1.37 (2023) und ARKit 4.0 (2020); Handheld-AR-Template in UE 5.4/5.5/5.6 wiederholt defekt (schwarzer Passthrough, Vulkan-Patches, UE-265363); Epics XR-Fokus liegt auf OpenXR, das Smartphones nicht abdeckt; Google hat sein ARCore-Unreal-SDK aufgegeben.
- **Praktisch:** keine AR-Simulation im Editor (jeder Test = Device-Deploy, Minuten), Erst-Build 15–30+ min, App 150–400 MB, Engine-Lernkurve dominiert die ersten Wochen. **Datasmith Runtime läuft nicht auf Mobile**; einziger viabler Runtime-Import ist das glTFRuntime-Plugin (rdeioris, aktiv). Kein .3dm-Runtime-Import verfügbar.
- **iOS ohne Mac: nicht möglich** (signierte Builds erfordern Mac; C++-Plugins erzwingen Remote-Mac-Builds).
- **Native Android (Kotlin + SceneView, github.com/SceneView/sceneview-android):** aktiv, „glTF laden + platzieren" in ~100 Zeilen, 3–7 Tage bis Prototyp, ~30 MB App → bester Nicht-Web-Fallback.
- **Cross-Platform:** ViroReact/ReactVision (kommerziell getragen, aktiv) als einzige produktionsreife RN-Option; Flutter-AR-Plugins nur als Community-Forks.
- **Zeit bis Prototyp (Solo, Windows):** UE5 2–4 Wochen (nur Android, mit Template-Risiken) vs. Kotlin/SceneView 3–7 Tage vs. **WebXR: Stunden bis wenige Tage**.

## Konsequenz

Siehe ADR-001 (Web-App), ADR-002 (Geometrie-Pipeline), ADR-003 (Android-first), ADR-004 (Toolchain), ADR-005 (Dev-Loop), ADR-006 (GH-Live-Architektur).
