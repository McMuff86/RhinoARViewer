# Rhino AR Viewer

AR-App für Android die Rhino/Grasshopper-Geometrie in Echtzeit in der realen Umgebung anzeigt.

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Unity](https://img.shields.io/badge/Unity-2022.3%20LTS-blue)
![Rhino](https://img.shields.io/badge/Rhino-8-green)

## Features

- **Live Mesh Streaming**: Geometrie aus Grasshopper wird in Echtzeit zur AR-App gestreamt
- **QR-Code Positioning**: Präzise Platzierung der Geometrie via QR-Code
- **WebSocket Connection**: Schnelle, bidirektionale Kommunikation via Socket.IO
- **Coordinate Conversion**: Automatische Umrechnung Rhino (Z-up) → Unity (Y-up)

## Architektur

```
┌─────────────────┐     WebSocket      ┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Grasshopper   │ ──────────────────►│  Relay Server   │◄────────────────── │   Android App   │
│   (GH Plugin)   │                    │   (Node.js)     │                    │    (Unity)      │
└─────────────────┘                    └─────────────────┘                    └─────────────────┘
```

## Quick Start

### 1. Server starten

```bash
cd server
npm install
npm start
```

Server läuft auf `http://localhost:3000`

### 2. Grasshopper Plugin installieren

1. Kopiere alle Dateien aus `grasshopper/RhinoARSync/bin/Release/net7.0/` nach:
   ```
   %APPDATA%\Grasshopper\Libraries\
   ```
2. Rhino neustarten
3. In Grasshopper: Display → Preview → **AR Sync**

### 3. Android App (Coming Soon)

Die Unity-App befindet sich noch in Entwicklung.

## Projekt-Struktur

```
RhinoARViewer/
├── server/                 # Node.js Relay Server
│   ├── server.js          # Socket.IO Server
│   └── package.json
├── grasshopper/           # Rhino/Grasshopper Plugin
│   └── RhinoARSync/       # C# Projekt
│       ├── ARSyncComponent.cs
│       ├── ConnectionManager.cs
│       ├── MeshSerializer.cs
│       └── MeshData.cs
├── unity/                 # Unity AR App (WIP)
│   └── RhinoARViewer/
├── docs/                  # Dokumentation
├── assets/
│   ├── qr-codes/         # QR-Codes zum Drucken
│   └── test-meshes/      # Test-Dateien
└── BUILD_PLAN.md         # Detaillierter Entwicklungsplan
```

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Android App | Unity 2022.3 LTS + AR Foundation |
| AR Framework | ARCore |
| Relay Server | Node.js + Socket.IO |
| GH Plugin | C# (.NET 7) |
| Mesh Format | JSON (Protocol v1) |

## Grasshopper Component

### Inputs

| Input | Typ | Beschreibung |
|-------|-----|--------------|
| **M** | Mesh | Mesh zum Streamen |
| **S** | Text | Server URL (default: localhost:3000) |
| **R** | Text | Room Code (leer = neuen Room erstellen) |
| **C** | Boolean | Verbinden |
| **X** | Boolean | Mesh senden |

### Outputs

| Output | Typ | Beschreibung |
|--------|-----|--------------|
| **St** | Text | Verbindungsstatus |
| **RC** | Text | Room Code (für AR-App) |
| **Cl** | Integer | Anzahl verbundener Clients |
| **MI** | Text | Mesh-Statistiken |

## Limits

| Limit | Wert |
|-------|------|
| Max Vertices | 65,535 |
| Max Triangles | 100,000 |
| Max Mesh Size | 5 MB |
| Update Rate | 10 Hz |

## Development Status

- [x] Phase 0: Setup & Tooling
- [x] Phase 3: Relay Server
- [x] Phase 6: Grasshopper Component
- [ ] Phase 1: AR Basics (Unity)
- [ ] Phase 2: QR Code Tracking
- [ ] Phase 4: Unity Socket.IO Client
- [ ] Phase 5: Mesh Rendering
- [ ] Phase 7: Integration & Polish
- [ ] Phase 8: Documentation & Release

## Requirements

- **Rhino 8** (für Grasshopper Plugin)
- **Node.js 20+** (für Server)
- **Unity 2022.3 LTS** (für AR App)
- **Android 8.0+** mit ARCore Support

## License

MIT

## Author

McMuff86
