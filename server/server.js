/**
 * Rhino AR Relay Server
 *
 * WebSocket relay server that connects Grasshopper to mobile AR clients.
 * Uses Socket.IO for real-time communication with room-based message routing.
 *
 * Protocol Version: 1
 */

import { createServer } from 'http';
import { Server } from 'socket.io';

// Configuration
const PORT = process.env.PORT || 3000;
const MAX_CONNECTIONS_PER_ROOM = 10;
const ROOM_CODE_LENGTH = 6;
const ROOM_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_MESH_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_CONNECTIONS = 10;

// State
const rooms = new Map(); // roomCode -> { clients: Set, createdAt: Date, lastActivity: Date }
const connectionCounts = new Map(); // IP -> { count: number, windowStart: Date }

// Create HTTP server and Socket.IO instance
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      uptime: process.uptime()
    }));
    return;
  }

  // Info endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Rhino AR Relay Server',
      version: '1.0.0',
      protocol: 1
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const io = new Server(httpServer, {
  cors: {
    origin: '*', // MVP: allow all origins
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: MAX_MESH_SIZE_BYTES
});

// Helper: Generate random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper: Check rate limit
function checkRateLimit(ip) {
  const now = Date.now();
  const record = connectionCounts.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    connectionCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_CONNECTIONS) {
    return false;
  }

  record.count++;
  return true;
}

// Helper: Clean up expired rooms
function cleanupExpiredRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_EXPIRY_MS) {
      console.log(`[CLEANUP] Room ${code} expired`);
      rooms.delete(code);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredRooms, 60 * 60 * 1000);

// Socket.IO event handlers
io.on('connection', (socket) => {
  const clientIp = socket.handshake.address;
  console.log(`[CONNECT] Client connected: ${socket.id} from ${clientIp}`);

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    console.log(`[RATE_LIMIT] Client ${socket.id} rate limited`);
    socket.emit('error', {
      version: 1,
      type: 'error',
      timestamp: Date.now(),
      code: 'RATE_LIMITED',
      message: 'Too many connections. Please try again later.'
    });
    socket.disconnect(true);
    return;
  }

  let currentRoom = null;

  // Create a new room
  socket.on('create-room', (callback) => {
    let code = generateRoomCode();
    // Ensure unique code
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    rooms.set(code, {
      clients: new Set([socket.id]),
      createdAt: Date.now(),
      lastActivity: Date.now()
    });

    socket.join(code);
    currentRoom = code;

    console.log(`[ROOM] Created room ${code} by ${socket.id}`);

    if (typeof callback === 'function') {
      callback({ success: true, roomCode: code });
    }

    socket.emit('room-info', {
      version: 1,
      type: 'room-info',
      timestamp: Date.now(),
      roomCode: code,
      clientCount: 1
    });
  });

  // Join an existing room
  socket.on('join-room', (data, callback) => {
    const roomCode = data?.roomCode?.toUpperCase();

    if (!roomCode || !rooms.has(roomCode)) {
      const error = {
        version: 1,
        type: 'error',
        timestamp: Date.now(),
        code: 'INVALID_ROOM',
        message: 'Room not found'
      };
      socket.emit('error', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'INVALID_ROOM' });
      }
      return;
    }

    const room = rooms.get(roomCode);

    if (room.clients.size >= MAX_CONNECTIONS_PER_ROOM) {
      const error = {
        version: 1,
        type: 'error',
        timestamp: Date.now(),
        code: 'ROOM_FULL',
        message: 'Room is full'
      };
      socket.emit('error', error);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'ROOM_FULL' });
      }
      return;
    }

    // Leave previous room if any
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).clients.delete(socket.id);
      socket.leave(currentRoom);
    }

    room.clients.add(socket.id);
    room.lastActivity = Date.now();
    socket.join(roomCode);
    currentRoom = roomCode;

    console.log(`[ROOM] Client ${socket.id} joined room ${roomCode}`);

    if (typeof callback === 'function') {
      callback({ success: true, roomCode, clientCount: room.clients.size });
    }

    // Notify all clients in room
    io.to(roomCode).emit('room-info', {
      version: 1,
      type: 'room-info',
      timestamp: Date.now(),
      roomCode,
      clientCount: room.clients.size
    });
  });

  // Relay mesh updates
  socket.on('mesh-update', (data) => {
    if (!currentRoom) {
      socket.emit('error', {
        version: 1,
        type: 'error',
        timestamp: Date.now(),
        code: 'NOT_IN_ROOM',
        message: 'Join a room first'
      });
      return;
    }

    const room = rooms.get(currentRoom);
    if (room) {
      room.lastActivity = Date.now();
    }

    // Validate mesh data size (rough check)
    const dataSize = JSON.stringify(data).length;
    if (dataSize > MAX_MESH_SIZE_BYTES) {
      socket.emit('error', {
        version: 1,
        type: 'error',
        timestamp: Date.now(),
        code: 'MESH_TOO_LARGE',
        message: `Mesh data too large (${(dataSize / 1024 / 1024).toFixed(2)} MB). Max: 5 MB`
      });
      return;
    }

    // Add protocol version and timestamp if missing
    const message = {
      version: 1,
      type: 'mesh-update',
      timestamp: Date.now(),
      roomCode: currentRoom,
      ...data
    };

    // Broadcast to all other clients in the room
    socket.to(currentRoom).emit('mesh-update', message);

    console.log(`[MESH] Relayed mesh-update in room ${currentRoom} (${(dataSize / 1024).toFixed(1)} KB)`);
  });

  // Ping/Pong for keep-alive
  socket.on('ping', (data, callback) => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).lastActivity = Date.now();
    }

    const pong = {
      version: 1,
      type: 'pong',
      timestamp: Date.now(),
      roomCode: currentRoom
    };

    if (typeof callback === 'function') {
      callback(pong);
    } else {
      socket.emit('pong', pong);
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[DISCONNECT] Client ${socket.id} disconnected: ${reason}`);

    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.clients.delete(socket.id);

      // Notify remaining clients
      if (room.clients.size > 0) {
        io.to(currentRoom).emit('room-info', {
          version: 1,
          type: 'room-info',
          timestamp: Date.now(),
          roomCode: currentRoom,
          clientCount: room.clients.size
        });
      } else {
        // Keep empty room for a while (might reconnect)
        console.log(`[ROOM] Room ${currentRoom} is now empty`);
      }
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          Rhino AR Relay Server v1.0.0             ║
╠═══════════════════════════════════════════════════╣
║  Status:    Running                               ║
║  Port:      ${String(PORT).padEnd(37)}║
║  Protocol:  v1                                    ║
╠═══════════════════════════════════════════════════╣
║  Endpoints:                                       ║
║    GET /        → Server info                     ║
║    GET /health  → Health check                    ║
║    WS  /        → Socket.IO                       ║
╚═══════════════════════════════════════════════════╝
  `);
});
