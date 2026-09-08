import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../data/database.js';
import { eventBus } from '../../event-bus/EventBus.js';

const JWT_SECRET = process.env.JWT_SECRET || 'eventix-super-secure-token-secret-2026';

export class AuthService {
  async register({ email, password, name, role = 'AUDIENCE' }) {
    // Check if user already exists
    for (const user of db.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        throw new Error('An account with this email address already exists.');
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: `user-${uuidv4()}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role.toUpperCase(),
      createdAt: new Date().toISOString()
    };

    db.users.set(newUser.id, newUser);

    eventBus.publish('UserRegistered', {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    }, 'AuthService');

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };
  }

  async login({ email, password, terminalInfo = {} }) {
    let matchedUser = null;
    for (const user of db.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = bcrypt.compareSync(password, matchedUser.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Terminal and Multi-Session Handling
    const sessionId = `sess-${uuidv4()}`;
    const terminalId = terminalInfo.terminalId || `term-${uuidv4().substring(0, 8)}`;
    const terminalLabel = terminalInfo.terminalLabel || terminalInfo.deviceName || 'Standard Terminal';
    const clientIp = terminalInfo.ip || '127.0.0.1';
    const userAgent = terminalInfo.userAgent || 'Unknown Terminal Client';

    const sessionRecord = {
      sessionId,
      userId: matchedUser.id,
      terminalId,
      terminalLabel,
      clientIp,
      userAgent,
      isActive: true,
      loginTime: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    db.sessions.set(sessionId, sessionRecord);

    const token = jwt.sign(
      {
        userId: matchedUser.id,
        sessionId,
        terminalId,
        role: matchedUser.role,
        email: matchedUser.email,
        name: matchedUser.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    eventBus.publish('UserLoggedIn', {
      userId: matchedUser.id,
      sessionId,
      terminalId,
      terminalLabel,
      clientIp
    }, 'AuthService');

    return {
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role
      },
      session: sessionRecord
    };
  }

  getActiveSessions(userId) {
    const userSessions = [];
    for (const session of db.sessions.values()) {
      if (session.userId === userId && session.isActive) {
        userSessions.push(session);
      }
    }
    return userSessions.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
  }

  revokeSession(userId, sessionId) {
    const session = db.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found or not authorized.');
    }

    session.isActive = false;
    session.revokedAt = new Date().toISOString();

    eventBus.publish('SessionRevoked', {
      userId,
      sessionId,
      terminalId: session.terminalId,
      terminalLabel: session.terminalLabel
    }, 'AuthService');

    return { success: true, sessionId };
  }

  revokeAllOtherSessions(userId, currentSessionId) {
    let revokedCount = 0;
    for (const session of db.sessions.values()) {
      if (session.userId === userId && session.sessionId !== currentSessionId && session.isActive) {
        session.isActive = false;
        session.revokedAt = new Date().toISOString();
        revokedCount++;
      }
    }

    eventBus.publish('OtherSessionsRevoked', {
      userId,
      currentSessionId,
      revokedCount
    }, 'AuthService');

    return { success: true, revokedCount };
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // Check if session has been revoked
      const session = db.sessions.get(decoded.sessionId);
      if (!session || !session.isActive) {
        throw new Error('Session has been revoked or expired.');
      }
      // Update last active
      session.lastActive = new Date().toISOString();
      return decoded;
    } catch (err) {
      throw new Error(err.message || 'Invalid authentication token.');
    }
  }
}

export const authService = new AuthService();
