# ADR-006: Grasshopper-Live-Streaming — bestehender Relay bleibt, Browser wird Client

- **Status:** Akzeptiert (Umsetzung in späterer Phase)
- **Datum:** 2026-07-02

## Kontext

Aus dem ersten Projektanlauf existieren zwei funktionierende Bausteine:

- `server/` — Node.js/Socket.IO-Relay mit Room-Codes, Rate-Limiting und Mesh-Relay (Protokoll v1, JSON).
- `grasshopper/RhinoARSync/` — C#-GH-Komponente, die Meshes serialisiert (inkl. Brep→Mesh in Grasshopper) und an den Relay sendet.

Der ursprünglich geplante dritte Teilnehmer (Unity-App) entfällt durch ADR-001.

## Entscheidung

Die Relay-Architektur **bleibt bestehen**; in der GH-Live-Phase wird die Web-App der dritte Teilnehmer: `Grasshopper → Relay (Socket.IO) → Browser`. Eingehende Mesh-Updates ersetzen `BufferGeometry` in der laufenden three.js-Szene — das funktioniert auch innerhalb einer aktiven WebXR-Session (der Render-Loop läuft normal weiter).

Anpassungen, die dann anstehen (nicht jetzt):

- Serialisierung in `MeshSerializer.cs` von Unity-Konventionen (Y-up-Tausch, Winding-Flip) auf **rohe Rhino-Koordinaten** umstellen — die Konvertierung übernimmt einheitlich der Browser (`geometry/units.ts`, ADR-002). Das vermeidet zwei konkurrierende Koordinaten-Konventionen.
- Tests für den Relay (`server/`) nachziehen.
- Binärprotokoll statt JSON, wenn die Mesh-Größen es erfordern.

## Konsequenzen

- (+) Vorhandener, getesteter Ansatz wird wiederverwendet; GH-Phase ist ein Inkrement, kein Umbau.
- (+) Room-Code-Modell (QR-Code am Desktop, Handy scannt) passt unverändert.
- (−) Bis dahin liegt `server/`+`grasshopper/` als „geparkter" Code im Repo — bewusst akzeptiert.
