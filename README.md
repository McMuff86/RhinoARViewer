# Rhino AR Viewer

Web-App, die Rhino-Geometrie (.3dm, glTF/GLB) per Smartphone-Kamera in die reale Umgebung projiziert — installationsfrei, direkt im Browser (WebXR). Später: STEP-Import und Live-Streaming aus Grasshopper.

![Status](https://img.shields.io/badge/Status-Proof%20of%20Concept-yellow)
![Stack](https://img.shields.io/badge/Stack-three.js%20%2B%20WebXR-blue)
![Rhino](https://img.shields.io/badge/Rhino-.3dm%20via%20rhino3dm-green)

## Warum Web statt Unity/Unreal?

Kurzfassung: sofortige Iteration (URL öffnen statt App-Build), .3dm wird via rhino3dm-WASM direkt im Browser geparst, und Unreals Handheld-AR ist seit Jahren im Wartungsmodus. Ausführlich: `docs/adr/001-webapp-statt-game-engine.md` und `docs/research/`.

## Voraussetzungen

- **Entwicklung:** Node.js 20+ (Windows/macOS/Linux)
- **AR-Test:** Android-Gerät mit [ARCore-Unterstützung](https://developers.google.com/ar/devices) + aktuelles Chrome, im selben WLAN wie der PC
- Desktop-Browser zeigen automatisch eine 3D-Vorschau (OrbitControls) statt AR

## Quick Start

```bash
cd app
npm install
npm run dev
```

Der Dev-Server läuft mit HTTPS (selbstsigniert) auf allen Interfaces. Dann am Handy:

1. `https://<IP-des-PCs>:5180` in Chrome öffnen (IP z. B. via `ipconfig`)
2. Zertifikatswarnung einmalig bestätigen („Erweitert" → „Trotzdem fortfahren")
3. Modell wählen (Testwürfel / Beispiel-Box / eigene Datei) → **AR starten**
4. Handy langsam bewegen, bis der weiße Ring auf dem Boden erscheint → tippen

Alternative ohne Zertifikatswarnung (USB-Kabel + [Platform Tools](https://developer.android.com/tools/releases/platform-tools)):

```bash
adb reverse tcp:5180 tcp:5180
# am Handy: https://localhost:5180
```

## Eigene Modelle

| Format | Unterstützung |
|---|---|
| `.3dm` | Mesh-Objekte immer; BREPs/Extrusions nur, wenn die Datei **mit Render-Meshes gespeichert** wurde (in Rhino einmal schattiert anzeigen, dann speichern). Einheiten, Z-up, Render-Material-Farbe/-Transparenz und Layer-Sichtbarkeit werden übernommen. |
| `.glb` / `.gltf` | Direkt (Y-up, Meter gemäß Spezifikation) |
| `.step` / `.stp` | Direkt — OpenCascade (WASM) tesselliert im Browser, inkl. Farben. Annahme: Z-up, Millimeter (STEP-Konvention). |

Grasshopper-Geometrie: vor dem Speichern in ein Mesh wandeln (BREPs aus GH haben keine Render-Meshes). Live-Streaming aus GH ist als Phase M5 geplant (`docs/adr/006`).

## Entwicklung & Tests

```bash
cd app
npm test          # Unit-Tests (Vitest) + WebXR-Emulation (IWER)
npm run test:e2e  # Playwright-Smoke-Tests (einmalig: npx playwright install chromium)
npm run build     # Typecheck + Produktions-Build
npm run fixtures  # .3dm-Testdaten neu erzeugen (sind eingecheckt)
```

## Projekt-Struktur

```
├── app/                # Web-App (Vite + TypeScript + three.js) — aktive Entwicklung
│   ├── src/ar/         # WebXR-Session, Hit-Test, Platzierung
│   ├── src/loaders/    # .3dm (rhino3dm-WASM) und glTF
│   ├── src/geometry/   # Einheiten/Koordinaten-Konvertierung
│   └── tests/, e2e/    # Vitest + Playwright
├── server/             # Socket.IO-Relay (geparkt für Grasshopper-Live, Phase M5)
├── grasshopper/        # GH-Komponente „AR Sync" (geparkt für Phase M5)
├── docs/adr/           # Architekturentscheidungen
├── docs/research/      # Stack-Recherche (Juli 2026)
└── ROADMAP.md          # Milestones
```

## Lizenz

MIT — © McMuff86
