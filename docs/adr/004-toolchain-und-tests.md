# ADR-004: Toolchain — Vite + TypeScript strict + Vitest/IWER/Playwright

- **Status:** Akzeptiert
- **Datum:** 2026-07-02

## Kontext

Der PoC braucht eine Toolchain mit schnellem Feedback, und Tests sind Projektanforderung: jede implementierte Funktion soll testbar sein und getestet werden.

## Entscheidung

- **Vite + TypeScript (strict)**, vanilla — kein UI-Framework, solange die UI aus einer Handvoll Elementen besteht.
- **Vitest** für Unit-Tests. Architekturregel dafür: Logik (Koordinaten/Einheiten, Platzierungs-Mathe, .3dm-Parsing) lebt in **puren Modulen ohne DOM/WebGL-Abhängigkeit** und wird direkt in Node getestet; .3dm-Fixtures werden mit `app/scripts/make-fixtures.mjs` erzeugt und eingecheckt.
- **IWER** (Meta, MIT) emuliert die WebXR-Runtime für Tests der Support-/Session-Logik ohne Gerät.
- **Playwright** für Smoke-/E2E-Tests gegen den Dev-Server — deckt insbesondere den rhino3dm-WASM-Ladepfad im echten Browser ab.

## Konsequenzen

- (+) `npm test` läuft headless und CI-fähig, ohne AR-Gerät.
- (+) Die Trennung „pure Logik vs. dünner WebXR/DOM-Rand" hält den ungetesteten Rand klein.
- (−) Die eigentliche AR-UX (Hit-Test-Qualität, Beleuchtung) bleibt nur manuell auf dem Gerät prüfbar — dokumentierter Rest-Test im README.
