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
| **AR Framework** | AR Foundation + ARCore | 5.1.x |
| **Networking** | Socket.IO Unity | 1.0.x |
| **Relay Server** | Node.js + Socket.IO | 20 LTS / 4.7.x |
| **GH Plugin** | C# (.NET 7) | Rhino 8 |
| **Mesh Format** | JSON (MVP) → Binary (später) | v1 |

---

## 📱 Android Requirements

| Requirement | Wert | Begründung |
|-------------|------|------------|
| **Min SDK** | API 26 (Android 8.0) | ARCore Requirement |
| **Target SDK** | API 34 (Android 14) | Play Store Requirement 2024+ |
| **ARCore Support** | Required | Kein Fallback ohne AR |
| **Kamera Permission** | Required | AR braucht Kamera |
| **Internet Permission** | Required | WebSocket-Verbindung |
| **RAM** | Min 3GB empfohlen | Mesh-Rendering |

**Getestete Geräte (Ziel):**
- Samsung Galaxy S21+ oder neuer
- Google Pixel 6 oder neuer

---

## 🔒 Security Konzept

### MVP (Phase 1-7)
- **Room Codes**: 6-stellige alphanumerische Codes (z.B. `A3X9K2`)
- **Code Expiry**: Rooms verfallen nach 24h Inaktivität
- **Rate Limiting**: Max 10 connections/IP/minute
- **Keine Authentifizierung**: Wer den Code kennt, kann joinen

### Post-MVP (später)
- [ ] JWT-basierte Auth für persistente Sessions
- [ ] Ende-zu-Ende Verschlüsselung für Mesh-Daten
- [ ] IP-Whitelist Option für Enterprise

### Threat Model
| Threat | Mitigation |
|--------|------------|
| Room Code Brute-Force | Rate Limiting + 6-char = 2.1B Kombinationen |
| DoS auf Server | Rate Limiting + Max Connections per Room (10) |
| Malformed Mesh Data | JSON Schema Validation + Max Size Limit |
| Man-in-the-Middle | HTTPS/WSS in Production |

---

## 📊 Performance Constraints

### Mesh-Limits

| Limit | Wert | Begründung |
|-------|------|------------|
| **Max Vertices** | 65.535 | Unity 16-bit Index Buffer |
| **Max Triangles** | 100.000 | Mobile GPU Performance |
| **Max Mesh Size (JSON)** | 5 MB | WebSocket Message Limit |
| **Max Meshes/Scene** | 10 | Memory Constraints |
| **Update Rate** | 10 Hz | Netzwerk + Rendering |

### Performance Targets

| Metrik | Ziel | Messung |
|--------|------|---------|
| **Latenz (GH → App)** | < 500ms | Timestamp Delta |
| **Frame Rate** | ≥ 30 FPS | Unity Profiler |
| **App Start → AR Ready** | < 5s | Stopwatch |
| **Mesh Update → Render** | < 200ms | Unity Profiler |
| **Memory Usage** | < 500 MB | Android Profiler |

### Mesh-Größen Referenz
```
1.000 Vertices  ≈  50 KB JSON  → Instant
10.000 Vertices ≈ 500 KB JSON  → ~100ms
50.000 Vertices ≈ 2.5 MB JSON  → ~300ms
```

---

## 📡 Protokoll-Spezifikation (v1)

### Message Format

```typescript
// Base Message
interface Message {
  version: 1;
  type: 'mesh-update' | 'ping' | 'pong' | 'error' | 'room-info';
  timestamp: number;  // Unix ms
  roomCode: string;
}

// Mesh Update
interface MeshUpdate extends Message {
  type: 'mesh-update';
  meshId: string;      // UUID für Multi-Mesh Support
  action: 'create' | 'update' | 'delete';
  data?: MeshData;
}

interface MeshData {
  vertices: number[];   // [x,y,z, x,y,z, ...] - Rhino coords (Z-up)
  triangles: number[];  // [v0,v1,v2, ...]
  normals?: number[];   // Optional
  colors?: number[];    // Optional [r,g,b,a, ...] 0-1 range
  transform?: {         // Optional Transform
    position: [number, number, number];
    rotation: [number, number, number, number];  // Quaternion
    scale: [number, number, number];
  };
}

// Error
interface ErrorMessage extends Message {
  type: 'error';
  code: 'INVALID_MESH' | 'ROOM_FULL' | 'RATE_LIMITED' | 'MESH_TOO_LARGE';
  message: string;
}
```

### Coordinate Conversion
```
Rhino (Z-up)  →  Unity (Y-up)
X             →  X
Y             →  Z
Z             →  Y

Scale: Rhino mm → Unity m (÷ 1000)
```

---

## 🛡️ Error Handling Strategy

### Connection Errors

| Error | Client Behavior | Server Behavior |
|-------|-----------------|-----------------|
| **Connection Lost** | Auto-reconnect (3x, exp. backoff) | Remove from room after 30s |
| **Invalid Room Code** | Show error, prompt re-enter | Return `INVALID_ROOM` |
| **Room Full** | Show error, suggest new room | Return `ROOM_FULL` |
| **Server Unreachable** | Show offline mode prompt | N/A |

### Data Errors

| Error | Handling |
|-------|----------|
| **Invalid JSON** | Log error, skip message, request resend |
| **Mesh Too Large** | Reject with `MESH_TOO_LARGE`, suggest decimation |
| **Invalid Vertices** | Skip mesh, show warning in app |
| **Missing Fields** | Use defaults where possible, else skip |

### Fallback Behaviors

| Scenario | Fallback |
|----------|----------|
| **QR nicht erkannt** | Manuelles Tap-to-Place |
| **ARCore nicht verfügbar** | App-Exit mit Hinweis |
| **Mesh Update fehlgeschlagen** | Behalte letzten gültigen Mesh |
| **Server nicht erreichbar** | Zeige zuletzt empfangene Meshes (read-only) |

---

## 🧪 Testing Strategy

### Unit Tests

| Komponente | Test Framework | Coverage Ziel |
|------------|----------------|---------------|
| **Relay Server** | Jest | 80% |
| **GH Component** | xUnit | 70% |
| **Unity (Logic)** | Unity Test Framework | 60% |

### Test Cases (Priorität)

**P0 - Must Have:**
- [ ] Mesh Serialization/Deserialization Round-Trip
- [ ] Coordinate Conversion (Rhino ↔ Unity)
- [ ] WebSocket Connection/Reconnection
- [ ] Room Join/Leave

**P1 - Should Have:**
- [ ] Max Mesh Size Handling
- [ ] Rate Limiting
- [ ] Invalid Data Rejection
- [ ] Multi-Client Sync

**P2 - Nice to Have:**
- [ ] Performance Benchmarks
- [ ] Stress Tests (100 updates/sec)
- [ ] Long-Running Stability (1h)

### Integration Tests

```
[GH Component] → [Relay Server] → [Unity App]
     ↓                ↓                ↓
  Mock Mesh      Log Messages     Mock Renderer
```

### Manual Test Checklist (vor Release)

- [ ] App startet ohne Crash
- [ ] QR-Code wird in <3s erkannt
- [ ] Mesh erscheint am korrekten Ort
- [ ] Mesh-Update funktioniert live
- [ ] App läuft 10min ohne Memory-Leak
- [ ] Reconnect nach WiFi-Wechsel funktioniert

---

## 📋 Phasen & Tasks

### Phase 0: Setup
> Entwicklungsumgebung vorbereiten

- [x] **P0.1** Git Repo initialisieren: `McMuff86/RhinoARViewer`
- [x] **P0.2** `.gitignore` für Unity + Node.js + C# erstellen
- [x] **P0.3** Unity Hub installieren, Unity 2022.3 LTS (2022.3.62f3)
- [x] **P0.4** Android Build Support installieren (IL2CPP + SDK + NDK)
- [ ] **P0.5** Android SDK konfigurieren (Min API 26, Target API 34)
- [ ] **P0.6** AR Foundation Package installieren (5.1.x)
- [ ] **P0.7** ARCore XR Plugin installieren
- [ ] **P0.8** Neues Unity Projekt erstellen: `unity/RhinoARViewer`
- [x] **P0.9** Node.js installiert (v22.18.0)
- [x] **P0.10** Node.js Relay Server erstellt: `server/`
- [x] **P0.11** Basis-Ordnerstruktur angelegt

**Deliverable:** Leeres Unity-Projekt das auf Android deployed werden kann

---

### Phase 1: AR Basics
> Kamera + AR Plane Detection

- [ ] **P1.1** AR Session + AR Session Origin setup
- [ ] **P1.2** AR Camera konfigurieren
- [ ] **P1.3** AR Plane Manager aktivieren (Boden-Erkennung)
- [ ] **P1.4** Visuelles Feedback für erkannte Planes
- [ ] **P1.5** Test: App auf Android Device deployen
- [ ] **P1.6** Tap-to-Place: Cube auf erkannter Plane platzieren

**Deliverable:** App die Kamera zeigt, Boden erkennt, und einen Test-Cube platzieren kann

---

### Phase 2: QR Code Tracking
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

### Phase 3: Relay Server
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

### Phase 4: Unity Socket.IO Client
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

### Phase 5: Mesh Rendering
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

### Phase 6: Grasshopper Component
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

### Phase 7: Integration & Polish
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

### Phase 8: Documentation & Release

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

## 📊 Phasen-Übersicht

| Phase | Fokus | Abhängigkeiten |
|-------|-------|----------------|
| P0 | Setup & Tooling | - |
| P1 | AR Basics | P0 |
| P2 | QR Tracking | P1 |
| P3 | Relay Server | P0 |
| P4 | Unity Socket | P1, P3 |
| P5 | Mesh Rendering | P4 |
| P6 | GH Component | P3 |
| P7 | Integration | P5, P6 |
| P8 | Documentation | P7 |

**Kritischer Pfad:** P0 → P1 → P4 → P5 → P7 → P8

**Parallel möglich:** P3 kann parallel zu P1-P2, P6 kann parallel zu P4-P5

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

| # | Kriterium | Messbar | Status |
|---|-----------|---------|--------|
| 1 | Android App zeigt Kamera-Feed mit AR-Overlay | App startet, Kamera aktiv | [ ] |
| 2 | QR-Code wird erkannt und als Origin verwendet | QR erkannt in <3s bei gutem Licht | [ ] |
| 3 | Mesh aus Grasshopper wird angezeigt | Latenz <500ms (gemessen) | [ ] |
| 4 | Änderungen in GH updaten das AR-Modell live | 10 Updates/sec ohne Frame-Drop | [ ] |
| 5 | App läuft stabil | 10min ohne Crash, Memory <500MB | [ ] |
| 6 | Mesh-Position stimmt mit QR-Origin überein | Abweichung <5mm | [ ] |
| 7 | Reconnect funktioniert | Auto-reconnect nach WiFi-Wechsel | [ ] |

---

## ⚠️ Bekannte Limitationen (MVP)

| Limitation | Workaround | Post-MVP Fix |
|------------|------------|--------------|
| Nur Android | - | iOS Support (Phase 2) |
| Max 65k Vertices/Mesh | Mesh in GH dezimieren | Mesh Chunking |
| Keine Texturen | Vertex Colors verwenden | Texture Streaming |
| Nur lokales Netzwerk praktikabel | ngrok für remote | Cloud Server |
| Keine persistente Session | Room Code neu eingeben | JWT Auth |
| Kein Offline-Modus | Immer Server-Verbindung nötig | Local Cache |
| Single-User pro Device | - | Multi-User Sync |

---

## 🔮 Post-MVP Roadmap

### Phase 2: iOS Support
- [ ] ARKit Integration
- [ ] Universal Build (Android + iOS)
- [ ] TestFlight Distribution

### Phase 3: Enhanced Interaction
- [ ] Bidirektionale Kommunikation (Gesten → GH Parameter)
- [ ] Touch-Manipulation (Scale, Rotate, Move)
- [ ] Annotations/Markers platzieren

### Phase 4: Enterprise Features
- [ ] Cloud-Hosted Relay Server
- [ ] User Authentication
- [ ] Session Persistence
- [ ] Analytics Dashboard

### Phase 5: Extended Reality
- [ ] HoloLens 2 Support
- [ ] Meta Quest 3 Passthrough
- [ ] Multi-User Collaboration

---

## 🔧 Troubleshooting Guide

### App startet nicht / Crash beim Start
- ARCore nicht installiert → Play Store → "Google Play Services for AR"
- Device nicht ARCore-kompatibel → [Liste prüfen](https://developers.google.com/ar/devices)

### QR-Code wird nicht erkannt
- Zu wenig Licht → Mehr Beleuchtung
- QR zu klein → Min. 10x10cm drucken
- QR beschädigt/verzerrt → Neu drucken, flach halten

### Mesh erscheint nicht
- Server nicht erreichbar → Server-URL prüfen, Firewall checken
- Room Code falsch → Code in GH und App vergleichen
- Mesh zu groß → Vertices in GH prüfen (<65k)

### Mesh an falscher Position
- QR nicht im Bild → QR erneut scannen
- Koordinaten-System → Rhino-Ursprung = QR-Position

### Hohe Latenz / Ruckeln
- WiFi-Problem → Näher zum Router
- Mesh zu komplex → Dezimieren in GH
- Viele Updates → Throttle in GH erhöhen

### Verbindung bricht ab
- Server-Timeout → Server-Logs prüfen
- App im Hintergrund → Android killt WebSocket → App im Vordergrund halten

---

*Erstellt: 2026-01-26*
*Letzte Änderung: 2026-01-26*
*Status: DRAFT - Ready for Review*
