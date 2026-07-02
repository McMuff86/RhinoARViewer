# ADR-001: Web-App (WebXR + three.js) statt Unity/Unreal

- **Status:** Akzeptiert
- **Datum:** 2026-07-02

## Kontext

Ziel ist ein schneller Proof of Concept: Rhino-Geometrie per Smartphone-Kamera in die reale Umgebung projizieren. Der erste Anlauf (Unity + AR Foundation) kam nie zu einer lauffähigen App; Unity-Kenntnisse fehlen. Als Alternative stand Unreal Engine im Raum. Rahmenbedingungen: Zielgerät Android (ARCore), Entwicklung nur auf Windows, Solo-Entwickler mit C#/.NET/Web-Hintergrund.

Research (Juli 2026, siehe `docs/research/2026-07-ar-stack-research.md`):

- **Unreal Engine 5 Handheld-AR ist faktisch im Wartungsmodus:** gebundelte SDKs seit ~3 Jahren eingefroren (ARCore 1.37/2023, ARKit 4.0/2020), Handheld-AR-Template in UE 5.4–5.6 wiederholt defekt (schwarzer Kamera-Passthrough), Epics XR-Investment fließt in OpenXR-Headsets, die Smartphones nicht abdecken. Keine AR-Simulation im Editor → jeder Test ist ein minutenlanger Device-Deploy; App-Größe 150–400 MB.
- **WebXR auf Android Chrome ist produktionsreif:** `immersive-ar` + Hit-Test (Chrome 81+), Anchors (85+), Plane Detection (91+). three.js pflegt offizielle AR-Beispiele.
- **rhino3dm.js** (McNeel, aktiv) parst .3dm direkt im Browser — kein Konvertierungsschritt nötig.
- Für die spätere Grasshopper-Live-Phase ist ein Browser-Client trivial anzubinden (WebSocket in laufende three.js-Szene, auch innerhalb einer AR-Session).

## Entscheidung

Die AR-App wird als **Web-App** gebaut: Vite + TypeScript + three.js, AR über die WebXR Device API (`immersive-ar` mit `hit-test`). Keine Game-Engine, keine Store-App.

## Konsequenzen

- (+) Iterationszyklus in Sekunden: URL am Handy neu laden statt App-Build/Deploy.
- (+) Keine Installation beim Anwender; selbst-hostbar (Datenschutz).
- (+) Ein Stack für Viewer, spätere GH-Live-Anbindung und Desktop-Vorschau.
- (−) iOS bleibt außen vor, da iOS Safari kein WebXR unterstützt (siehe ADR-003).
- (−) Rendering-Möglichkeiten begrenzter als in einer Engine (für Geometrie-Viewing irrelevant).
- Fallback, falls WebXR-Grenzen erreicht werden: native Android-App mit Kotlin + SceneView (Research: 3–7 Tage bis Prototyp) — nicht Unreal.
