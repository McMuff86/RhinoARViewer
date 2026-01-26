# Rhino AR Viewer - Build Plan

**Ziel:** AR-App für Android die Rhino/Grasshopper-Geometrie in Echtzeit in der realen Umgebung anzeigt.

**Start:** Kamera-View mit AR-Overlay eines 3D-Produkts aus Rhino.

---

## 🎯 MVP Definition

### Was wir bauen (Phase 1)
- Android App mit Kamera-View
- AR-Overlay von Meshes
- Echtzeit-Verbindung zu Grasshopper
- QR-Code für Positionierung

### Was wir NICHT bauen (später)
- iOS Support
- HoloLens/Quest Support
- Bidirektionale Interaktion (Gesten → GH)
- Cloud Hosting
- Multi-User

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    GRASSHOPPER                               │
│  ┌──────────────────┐    ┌─────────────────────────────────┐│
│  │ Rhino Geometry   │───►│ GH Component: "AR Sync"         ││
│  │ (Mesh/Brep)      │    │  - Mesh Extraction              ││
│  └──────────────────┘    │  - JSON Serialization           ││
│                          │  - WebSocket Client             ││
│                          └──────────────┬──────────────────┘│
└─────────────────────────────────────────┼───────────────────┘
                                          │ WebSocket
                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    RELAY SERVER (Node.js)                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Socket.IO Server                                        ││
│  │  - Room Management (GH ↔ Device pairing)                ││
│  │  - Message Relay                                        ││
│  │  - Optional: Local Network Discovery                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────┬───────────────────┘
                                          │ WebSocket
                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ANDROID APP (Unity)                       │
│  ┌─────────────────┐  ┌─────────────┐  ┌──────────────────┐│
│  │ AR Foundation   │  │ Socket.IO   │  │ Mesh Renderer    ││
│  │ (ARCore)        │  │ Client      │  │ (Dynamic)        ││
│  └────────┬────────┘  └──────┬──────┘  └────────┬─────────┘│
│           │                  │                   │          │
│           ▼                  ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    AR Session                           ││
│  │  - Camera Feed                                          ││
│  │  - Plane Detection                                      ││
│  │  - QR Code Tracking                                     ││
│  │  - Mesh Placement                                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

| Komponente | Technologie | Version |
|------------|-------------|---------|
| **Android App** | Unity | 2022.3 LTS |
| **AR Framework** | AR Foundation + ARCore | 5.x |
| **Networking** | Socket.IO Unity | latest |
| **Relay Server** | Node.js + Socket.IO | 18+ / 4.x |
| **GH Plugin** | C# (.NET 7) | - |
| **Mesh Format** | JSON (MVP) → Binary (später) | - |

---

## 📋 Phasen & Tasks

### Phase 0: Setup (1-2h)
> Entwicklungsumgebung vorbereiten

- [ ] **P0.1** Unity Hub installieren, Unity 2022.3 LTS
- [ ] **P0.2** Android Build Support installieren
- [ ] **P0.3** Android SDK/NDK konfigurieren
- [ ] **P0.4** AR Foundation Package installieren
- [ ] **P0.5** Neues Unity Projekt erstellen: `RhinoARViewer`
- [ ] **P0.6** Git Repo initialisieren: `McMuff86/RhinoARViewer`
- [ ] **P0.7** Node.js Projekt für Relay Server erstellen

**Deliverable:** Leeres Unity-Projekt das auf Android deployed werden kann

---

### Phase 1: AR Basics (2-3h)
> Kamera + AR Plane Detection

- [ ] **P1.1** AR Session + AR Session Origin setup
- [ ] **P1.2** AR Camera konfigurieren
- [ ] **P1.3** AR Plane Manager aktivieren (Boden-Erkennung)
- [ ] **P1.4** Visuelles Feedback für erkannte Planes
- [ ] **P1.5** Test: App auf Android Device deployen
- [ ] **P1.6** Tap-to-Place: Cube auf erkannter Plane platzieren

**Deliverable:** App die Kamera zeigt, Boden erkennt, und einen Test-Cube platzieren kann

---

### Phase 2: QR Code Tracking (2-3h)
> Präzise Positionierung via QR-Code

- [ ] **P2.1** QR Code Detection Package evaluieren
  - Option A: AR Foundation Image Tracking
  - Option B: ZXing.Net Unity
- [ ] **P2.2** QR Code als AR Reference Image registrieren
- [ ] **P2.3** QR Code Tracking implementieren
- [ ] **P2.4** Origin-Punkt auf QR-Position setzen
- [ ] **P2.5** Test-Geometrie relativ zum QR platzieren
- [ ] **P2.6** QR-Code Generator (für Print)

**Deliverable:** App die QR-Code erkennt und Geometrie relativ dazu platziert

---

### Phase 3: Relay Server (2-3h)
> WebSocket Server für GH ↔ App Kommunikation

- [ ] **P3.1** Node.js Projekt setup mit Socket.IO
- [ ] **P3.2** Basic Room-System (Pairing via Code)
- [ ] **P3.3** Message Relay: `mesh-update` Event
- [ ] **P3.4** Health Check Endpoint
- [ ] **P3.5** Logging (incoming/outgoing messages)
- [ ] **P3.6** Test mit WebSocket Client (Postman/wscat)
- [ ] **P3.7** Deployment Option: localhost / ngrok / VPS

```javascript
// Server Events
'join-room'     // Device/GH joins a room
'mesh-update'   // GH sends mesh data
'ping'          // Keep-alive
```

**Deliverable:** Laufender Server der Messages zwischen Clients relayed

---

### Phase 4: Unity Socket.IO Client (2-3h)
> App verbindet sich mit Server

- [ ] **P4.1** Socket.IO Unity Package installieren
  - Option: [itisnajim/SocketIOUnity](https://github.com/itisnajim/SocketIOUnity)
- [ ] **P4.2** Connection Manager Script
- [ ] **P4.3** Room Join UI (Code eingeben)
- [ ] **P4.4** `mesh-update` Event Handler
- [ ] **P4.5** Connection Status UI (Connected/Disconnected)
- [ ] **P4.6** Auto-Reconnect Logic
- [ ] **P4.7** Test: Dummy Mesh Data vom Server empfangen

**Deliverable:** App die sich mit Server verbindet und Events empfängt

---

### Phase 5: Mesh Rendering (3-4h)
> Empfangene Mesh-Daten als 3D-Objekt anzeigen

- [ ] **P5.1** Mesh Data Model definieren

```csharp
[Serializable]
public class MeshData {
    public float[] vertices;  // [x,y,z, x,y,z, ...]
    public int[] triangles;   // [v0,v1,v2, ...]
    public float[] normals;   // optional
    public float[] colors;    // optional [r,g,b,a, ...]
}
```

- [ ] **P5.2** JSON Deserialization (Newtonsoft.Json)
- [ ] **P5.3** Dynamic Mesh Generation Script
- [ ] **P5.4** Material Setup (Lit/Unlit, Transparency)
- [ ] **P5.5** Mesh Update (nicht jedes Mal neu erstellen)
- [ ] **P5.6** Coordinate System Conversion (Rhino Z-up → Unity Y-up)
- [ ] **P5.7** Scale Factor (mm → m)
- [ ] **P5.8** Test: Hardcoded Mesh JSON → Rendered Mesh

**Deliverable:** App die JSON Mesh-Daten als 3D-Objekt rendert

---

### Phase 6: Grasshopper Component (4-5h)
> GH Component die Meshes zum Server streamt

- [ ] **P6.1** VS Solution erstellen: `RhinoARSync`
- [ ] **P6.2** GH_Component Grundgerüst
- [ ] **P6.3** NuGet: SocketIOClient, Newtonsoft.Json
- [ ] **P6.4** Mesh Input verarbeiten
- [ ] **P6.5** Mesh → JSON Serialization

```csharp
// Rhino Mesh → JSON
var meshData = new {
    vertices = mesh.Vertices.SelectMany(v => new[] { v.X, v.Y, v.Z }),
    triangles = mesh.Faces.SelectMany(f => new[] { f.A, f.B, f.C }),
    // für Quads: f.A, f.B, f.C, f.A, f.C, f.D
};
```

- [ ] **P6.6** WebSocket Connection zu Server
- [ ] **P6.7** Room Join / Code Display
- [ ] **P6.8** Mesh Update Throttling (max 10 updates/sec)
- [ ] **P6.9** Brep → Mesh Conversion (optional input)
- [ ] **P6.10** Test: GH Mesh → Server → Unity App

**Deliverable:** GH Component die Meshes live zum Server streamt

---

### Phase 7: Integration & Polish (2-3h)
> Alles zusammen, UX verbessern

- [ ] **P7.1** End-to-End Test: GH → Server → App → AR View
- [ ] **P7.2** Error Handling (Connection lost, Invalid data)
- [ ] **P7.3** Loading Indicator während Mesh-Update
- [ ] **P7.4** Settings Screen (Server URL, Room Code)
- [ ] **P7.5** Mesh Manipulation: Scale/Rotate mit Touch
- [ ] **P7.6** Screenshot Funktion
- [ ] **P7.7** App Icon & Splash Screen

**Deliverable:** Funktionierender MVP, polished UX

---

### Phase 8: Documentation & Release (1-2h)

- [ ] **P8.1** README.md mit Setup-Anleitung
- [ ] **P8.2** GH Component Dokumentation
- [ ] **P8.3** APK Build erstellen
- [ ] **P8.4** Video Demo aufnehmen
- [ ] **P8.5** Bekannte Limitationen dokumentieren

**Deliverable:** Release-ready mit Dokumentation

---

## 🗂️ Repo Struktur

```
RhinoARViewer/
├── README.md
├── docs/
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   └── images/
├── unity/
│   └── RhinoARViewer/        # Unity Projekt
├── server/
│   ├── package.json
│   ├── server.js
│   └── README.md
├── grasshopper/
│   ├── RhinoARSync.sln
│   ├── RhinoARSync/
│   └── README.md
└── assets/
    ├── qr-codes/
    └── test-meshes/
```

---

## ⏱️ Geschätzter Aufwand

| Phase | Aufwand | Kumuliert |
|-------|---------|-----------|
| P0: Setup | 1-2h | 2h |
| P1: AR Basics | 2-3h | 5h |
| P2: QR Tracking | 2-3h | 8h |
| P3: Relay Server | 2-3h | 11h |
| P4: Unity Socket | 2-3h | 14h |
| P5: Mesh Rendering | 3-4h | 18h |
| P6: GH Component | 4-5h | 23h |
| P7: Integration | 2-3h | 26h |
| P8: Documentation | 1-2h | 28h |

**Total: ~25-30 Stunden**

Bei 1-2h pro Abend: **3-4 Wochen**

---

## 🚀 Quick Start für Agents

### Agent Task: Phase 1
```
Erstelle ein Unity 2022.3 LTS Projekt mit AR Foundation für Android.
Setup AR Session, AR Camera, AR Plane Manager.
Implementiere Tap-to-Place für einen Test-Cube.
Teste auf Android Device.
Dokumentiere Setup-Schritte in docs/SETUP.md.
```

### Agent Task: Phase 3
```
Erstelle einen Node.js Socket.IO Server.
Implementiere Room-basiertes Message Relay.
Events: join-room, mesh-update, ping.
Teste mit wscat oder Postman.
Dokumentiere API in server/README.md.
```

### Agent Task: Phase 6
```
Erstelle eine Grasshopper Component in C# (.NET 7).
Input: Mesh (oder Brep → wird zu Mesh konvertiert)
Die Component serialisiert den Mesh zu JSON und sendet ihn via Socket.IO.
Implementiere Connection UI (Server URL, Room Code).
Throttle updates auf max 10/sec.
```

---

## 📎 Referenzen

- [AR Foundation Docs](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@5.0/manual/index.html)
- [ARCore Supported Devices](https://developers.google.com/ar/devices)
- [Socket.IO Unity](https://github.com/itisnajim/SocketIOUnity)
- [MeshStreamingGrasshopper](https://github.com/jhorikawa/MeshStreamingGrasshopper)
- [Grasshopper SDK](https://developer.rhino3d.com/guides/grasshopper/)

---

## ✅ Success Criteria

MVP ist erfolgreich wenn:
1. [ ] Android App zeigt Kamera-Feed mit AR-Overlay
2. [ ] QR-Code wird erkannt und als Origin verwendet
3. [ ] Mesh aus Grasshopper wird in <2 Sekunden angezeigt
4. [ ] Änderungen in GH updaten das AR-Modell live
5. [ ] App läuft stabil für mindestens 10 Minuten

---

*Erstellt: 2026-01-26*
*Status: DRAFT*
