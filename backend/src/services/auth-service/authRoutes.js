import express from 'express';
import { authService } from './authService.js';

export const authRouter = express.Router();

// Middleware to extract user and session from Bearer token
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid format.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const userPayload = authService.verifyToken(token);
    req.user = userPayload;
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient role privileges.' });
    }
    next();
  };
};

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }
    const user = await authService.register({ email, password, name, role });
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password, terminalId, terminalLabel } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const terminalInfo = {
      terminalId: terminalId || req.headers['x-terminal-id'],
      terminalLabel: terminalLabel || req.headers['x-terminal-label'] || 'Web Terminal',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    const result = await authService.login({ email, password, terminalInfo });
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Multi-Terminal Session Endpoints
authRouter.get('/sessions', requireAuth, (req, res) => {
  const sessions = authService.getActiveSessions(req.user.userId);
  res.json({
    currentSessionId: req.user.sessionId,
    currentTerminalId: req.user.terminalId,
    sessions
  });
});

authRouter.delete('/sessions/:sessionId', requireAuth, (req, res) => {
  try {
    const result = authService.revokeSession(req.user.userId, req.params.sessionId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/sessions/revoke-others', requireAuth, (req, res) => {
  try {
    const result = authService.revokeAllOtherSessions(req.user.userId, req.user.sessionId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
