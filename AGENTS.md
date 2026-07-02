# Rhino AR Viewer — Agent Instructions

> CLAUDE.md und AGENTS.md sind identische Spiegel. Änderungen immer in beiden Dateien nachziehen.

Web-App, die Rhino-Geometrie (.3dm, glTF; später STEP und Live-Grasshopper) per WebXR auf ARCore-Androids in die reale Umgebung projiziert. **Kein Unity, kein Unreal** — siehe `docs/adr/001`.

## Struktur

- `app/` — die Web-App (Vite + TypeScript strict + three.js). Hier passiert die aktive Entwicklung.
- `server/`, `grasshopper/` — geparkter Code aus Phase 1 für das spätere GH-Live-Streaming (`docs/adr/006`). Nicht anfassen, außer die ROADMAP-Phase M5 ist dran.
- `docs/adr/` — Architekturentscheidungen; `docs/research/` — Recherche-Grundlagen; `ROADMAP.md` — Milestones.

## Befehle (in `app/`)

- `npm run dev` — Dev-Server mit HTTPS (selbstsigniert) auf allen Interfaces, Port 5180 (5173 ist auf dieser Maschine anderweitig belegt; `strictPort` ist gesetzt)
- `npm test` — Vitest (Unit + IWER-WebXR-Emulation)
- `npm run test:e2e` — Playwright-Smoke-Tests (starten den Dev-Server selbst)
- `npm run build` — `tsc --noEmit` + Vite-Build
- `npm run fixtures` — erzeugt .3dm-Testdaten neu (`tests/fixtures/`, `public/models/`); die Dateien sind eingecheckt, nur nach Skript-Änderungen nötig

## Konventionen

- **Tests sind Pflicht** für jede Logik-Änderung. Architekturregel: Logik (Parsing, Koordinaten, Platzierungs-Mathe) lebt in puren Modulen ohne DOM/WebGL-Abhängigkeit → direkt in Node testbar. Der WebXR/DOM-Rand bleibt dünn.
- Code und Code-Kommentare **Englisch**; UI-Texte, Doku und ADRs **Deutsch**.
- **ADR-Prozess:** Jede signifikante Architektur-/Stack-Entscheidung bekommt ein ADR in `docs/adr/` (Format: Status/Kontext/Entscheidung/Konsequenzen, fortlaufende Nummer). Bestehende ADRs nicht umschreiben, sondern durch neue ersetzen (Status „Ersetzt durch ADR-XXX").
- TypeScript strict; keine neuen Dependencies ohne guten Grund (PoC klein halten).

## Domänen-Constraints (Stolperfallen)

- **rhino3dm kann BREPs nicht meshen.** Client-seitig gibt es nur die im .3dm gecachten Render-Meshes (`BrepFace.getMesh(MeshType.Render)`). Dateien müssen in Rhino nach schattierter Anzeige gespeichert sein, sonst: klare Fehlermeldung (siehe `app/src/loaders/parse3dm.ts`).
- **Koordinaten:** Rhino ist Z-up mit Modelleinheiten, three.js Y-up in Metern. Konvertierung ausschließlich über `app/src/geometry/units.ts` (echte Rotation −90° um X, kein Achsentausch — Winding bleibt erhalten). Keine zweite Konvertierungsstelle einführen.
- **WebXR braucht Secure Context:** Handy-Test via `https://<PC-IP>:5180` (Zertifikatswarnung bestätigen) oder `adb reverse tcp:5180 tcp:5180` + `https://localhost:5180`. iOS Safari hat kein WebXR (ADR-003).
- **rhino3dm-Bundling:** Der emscripten-Loader hat Node-only-Zweige; `ws` ist in `vite.config.ts` auf einen Stub gealiased und die WASM-URL wird via `locateFile` gesetzt. Bei rhino3dm-Updates den Playwright-Test laufen lassen (deckt genau diesen Pfad ab).
- **.3dm- und STEP-Parsing laufen in Web Workern** (`worker3dm.ts`/`workerStep.ts`, generischer Kanal in `workerChannel.ts`); `parse3dm.ts`/`parseStep.ts` bleiben pure und werden direkt in Node getestet. STEP: occt-import-js tesselliert selbst; Annahme Z-up/mm.
- **Worker-Dependencies müssen in `vite.config.ts` unter `optimizeDeps.include` stehen** (rhino3dm, occt-import-js): Vite entdeckt sie sonst erst zur Laufzeit, re-optimiert mitten in der Session und lädt die Seite neu — laufende Modell-Loads brechen dann kommentarlos ab.
- **DOM-Overlay + XR-select:** Touches auf Overlay-UI würden ohne Gegenmaßnahme das XR-`select` (= Modell neu platzieren) auslösen; `startArSession` unterdrückt das via `beforexrselect`. Beim Hinzufügen neuer Overlay-Elemente `pointer-events: auto` nicht vergessen.

## Verifikation vor Commits

`cd app && npm test && npm run build` muss grün sein; bei Änderungen an Loadern/AR-Flow zusätzlich `npm run test:e2e`. Die eigentliche AR-UX ist nur auf einem ARCore-Gerät prüfbar — auf offene Gerätetests im Commit-/PR-Text hinweisen.
