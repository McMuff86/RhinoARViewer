# ADR-003: Android-first; iOS nur als späterer Quick-Look-Fallback

- **Status:** Akzeptiert
- **Datum:** 2026-07-02

## Kontext

iOS Safari unterstützt **kein WebXR** auf iPhone/iPad (bestätigt bis iOS 26.5; WebXR existiert nur auf visionOS, und dort nur `immersive-vr`). Die Workaround-Landschaft (Stand Juli 2026):

- **AR Quick Look (USDZ):** funktioniert app-los, aber die AR-Ansicht ist ein natives Overlay — eigenes JS stoppt, keine eigene UI, keine Live-Updates. `<model-viewer>` kann USDZ on-the-fly aus glTF erzeugen.
- **Variant Launch** (App-Clip, eigener WebXR-Code läuft auf iOS): aktiv, $99/Monat/Projekt.
- **8th Wall:** wird abgeschaltet (Hosting endet Feb 2027) — keine Option.
- Zielgerät des Projekts ist ohnehin Android; ein Mac für native iOS-Builds existiert nicht.

## Entscheidung

Der PoC zielt ausschließlich auf **Android Chrome (WebXR)**. iOS wird später — falls benötigt — über einen **statischen Quick-Look-Export** bedient (three.js `USDZExporter`: geladenes Modell → USDZ → Quick-Look-Link). Variant Launch bleibt als bezahlte Option dokumentiert, falls echtes interaktives AR auf iOS nötig wird.

## Konsequenzen

- (+) Keine Kompromisse im PoC; ein Code-Pfad.
- (−) iPhone/iPad-Nutzer bekommen vorerst nichts; später nur statisches AR ohne Live-Updates.
- Die Entscheidung ist reversibel: der WebXR-Code bliebe bei Variant Launch unverändert.
