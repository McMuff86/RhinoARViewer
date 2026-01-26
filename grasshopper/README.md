# RhinoARSync - Grasshopper Component

Stream Rhino/Grasshopper geometry to AR devices in real-time via WebSocket.

## Installation

1. Build the project or download the latest release
2. Copy the following files to your Grasshopper Libraries folder:
   - `RhinoARSync.gha`
   - `SocketIOClient.dll`
   - `SocketIO.Core.dll`
   - `SocketIO.Serializer.Core.dll`
   - `SocketIO.Serializer.SystemTextJson.dll`
   - `Newtonsoft.Json.dll`

**Grasshopper Libraries folder:**
- Windows: `%APPDATA%\Grasshopper\Libraries\`
- Mac: `~/Library/Application Support/McNeel/Rhinoceros/8.0/Plug-ins/Grasshopper/Libraries/`

3. Unblock the files (Windows): Right-click each file → Properties → Check "Unblock"
4. Restart Rhino

## Usage

The component is located in: **Display → Preview → AR Sync**

### Inputs

| Input | Type | Description |
|-------|------|-------------|
| **M** (Mesh) | Mesh | The mesh to stream to AR |
| **S** (Server) | Text | Server URL (default: `http://localhost:3000`) |
| **R** (Room) | Text | Room code to join (empty = create new room) |
| **C** (Connect) | Boolean | Toggle connection to server |
| **X** (Send) | Boolean | Toggle mesh streaming |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| **St** (Status) | Text | Current connection status |
| **RC** (Room Code) | Text | The room code (share with AR device) |
| **Cl** (Clients) | Integer | Number of connected clients |
| **MI** (Mesh Info) | Text | Mesh statistics (vertices, triangles, size) |

## Quick Start

1. Start the relay server: `cd server && npm start`
2. Add the AR Sync component to your Grasshopper canvas
3. Connect a mesh to the **M** input
4. Set **C** (Connect) to `True`
5. Note the **Room Code** in the output
6. Enter the Room Code on your AR device
7. Set **X** (Send) to `True`
8. Changes to the mesh will stream in real-time!

## Coordinate System

The component automatically converts coordinates:
- **Rhino**: Z-up (X=right, Y=forward, Z=up)
- **Unity**: Y-up (X=right, Y=up, Z=forward)

Scale is converted from Rhino millimeters to Unity meters (÷1000).

## Limits

| Limit | Value |
|-------|-------|
| Max Vertices | 65,535 |
| Max Triangles | 100,000 |
| Max Mesh Size | 5 MB |
| Update Rate | 10 Hz |

## Building from Source

```bash
cd grasshopper/RhinoARSync
dotnet build --configuration Release
```

Output: `bin/Release/net7.0/RhinoARSync.gha`

## Troubleshooting

### "Component not loading"
- Ensure all DLL files are in the Libraries folder
- Unblock all files (Windows security)
- Check Rhino version (requires Rhino 8+)

### "Connection failed"
- Verify server is running
- Check firewall settings
- Ensure correct server URL

### "Mesh too large"
- Reduce mesh complexity in Grasshopper
- Use `MeshReduce` component
- Disable normals/colors if not needed
