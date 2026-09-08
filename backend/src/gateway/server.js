import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { fileURLToPath } from 'url';
import path from 'path';

import { eventBus } from '../event-bus/EventBus.js';
import { authRouter } from '../services/auth-service/authRoutes.js';
import { catalogRouter } from '../services/catalog-service/catalogRoutes.js';
import { pricingRouter } from '../services/pricing-service/pricingRoutes.js';
import { bookingRouter } from '../services/booking-service/bookingRoutes.js';
import { analyticsRouter } from '../services/analytics-service/analyticsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../../frontend/dist');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Enable CORS with support for custom terminal headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Terminal-Id', 'X-Terminal-Label']
}));

app.use(express.json());

// Terminal Identification Middleware
app.use((req, res, next) => {
  if (!req.headers['x-terminal-id']) {
    req.headers['x-terminal-id'] = `term-${req.ip || 'local'}-${uuidv4().substring(0, 6)}`;
  }
  if (!req.headers['x-terminal-label']) {
    req.headers['x-terminal-label'] = req.headers['user-agent'] ? 'Browser Client' : 'Standard Terminal';
  }
  res.setHeader('X-Terminal-Id', req.headers['x-terminal-id']);
  next();
});

// Microservice Route Registration
app.use('/api/auth', authRouter);
app.use('/api/events', catalogRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/analytics', analyticsRouter);

// Gateway Health & Metadata
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Eventix API Gateway',
    timestamp: new Date().toISOString(),
    architecture: 'Microservices & Event-Driven',
    microservices: [
      'Auth & Multi-Terminal Session Service',
      'Event Catalog Service',
      'Dynamic Pricing Engine',
      'Booking & Saga Coordinator Service',
      'Resilience & Fault Injector Telemetry',
      'Analytics & Event Streamer'
    ]
  });
});

// Serve compiled React frontend if present
app.use(express.static(frontendDist));

// SPA fallback for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// Setup WebSocket Server for real-time push
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WebSocket] New client connected. Total clients: ${clients.size}`);

  // Send initial welcome & connection sync
  ws.send(JSON.stringify({
    type: 'WS_CONNECTED',
    message: 'Connected to Eventix Real-Time Event Bus Stream',
    timestamp: new Date().toISOString()
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total clients: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Socket error:', err.message);
    clients.delete(ws);
  });
});

// Hook Event Bus into WebSocket broadcast
eventBus.setBroadcaster((msg) => {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Eventix API Gateway listening on http://localhost:${PORT}`);
  console.log(`📡 WebSocket Event Bus active on ws://localhost:${PORT}`);
  console.log(`====================================================`);
});
