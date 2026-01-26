# Rhino AR Relay Server

WebSocket relay server that connects Grasshopper to mobile AR clients.

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start

# Start with auto-reload (development)
npm run dev
```

Server runs on `http://localhost:3000` by default.

## API

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info (name, version, protocol) |
| `/health` | GET | Health check (status, room count, uptime) |

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | - | Create a new room, returns room code |
| `join-room` | `{ roomCode: string }` | Join existing room |
| `mesh-update` | `MeshUpdate` | Send mesh data to room |
| `ping` | - | Keep-alive ping |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room-info` | `{ roomCode, clientCount }` | Room status update |
| `mesh-update` | `MeshUpdate` | Relayed mesh data |
| `pong` | `{ timestamp }` | Ping response |
| `error` | `{ code, message }` | Error notification |

### Message Types

```typescript
interface MeshUpdate {
  version: 1;
  type: 'mesh-update';
  timestamp: number;
  roomCode: string;
  meshId: string;
  action: 'create' | 'update' | 'delete';
  data?: {
    vertices: number[];
    triangles: number[];
    normals?: number[];
    colors?: number[];
  };
}
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |

## Limits

- Max connections per room: 10
- Max mesh size: 5 MB
- Room expiry: 24 hours of inactivity
- Rate limit: 10 connections per IP per minute

## Testing

Test with wscat:

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:3000/socket.io/?EIO=4&transport=websocket
```

Or use the Socket.IO client:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.emit('create-room', (response) => {
  console.log('Room created:', response.roomCode);
});
```
