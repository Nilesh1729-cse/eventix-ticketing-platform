import { eventBus } from '../event-bus/EventBus.js';

export class DistributedLockManager {
  constructor() {
    this.locks = new Map(); // key -> { ownerId, expiresAt, metadata }
    
    // Periodically clean up expired locks
    setInterval(() => this.cleanupExpiredLocks(), 1000);
  }

  /**
   * Attempt to acquire a lock atomically.
   * @param {string} key - Resource identifier (e.g., 'seat:event1:A1')
   * @param {string} ownerId - Unique session/terminal/user identifier
   * @param {number} [ttlMs=300000] - Lock duration in milliseconds (default 5 min)
   * @param {object} [metadata={}] - Extra context (seat, user, terminal)
   * @returns {{ success: boolean, lock?: object, error?: string }}
   */
  acquire(key, ownerId, ttlMs = 300000, metadata = {}) {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing) {
      if (existing.expiresAt > now) {
        // Already held and not expired
        if (existing.ownerId === ownerId) {
          // Re-entrant / renewal: extend TTL
          existing.expiresAt = now + ttlMs;
          return { success: true, lock: existing, renewed: true };
        }
        const remainingSeconds = Math.ceil((existing.expiresAt - now) / 1000);
        return {
          success: false,
          error: `Resource is currently held by another user/terminal (remaining: ${remainingSeconds}s)`,
          heldUntil: new Date(existing.expiresAt).toISOString()
        };
      }
      // Expired lock: evict
      this.locks.delete(key);
    }

    const lock = {
      key,
      ownerId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: now + ttlMs,
      metadata
    };

    this.locks.set(key, lock);

    eventBus.publish('SeatLockAcquired', {
      key,
      ownerId,
      expiresAt: new Date(lock.expiresAt).toISOString(),
      metadata
    }, 'DistributedLock');

    return { success: true, lock };
  }

  /**
   * Release a lock. Only the owner can release unless force=true.
   */
  release(key, ownerId, force = false) {
    const existing = this.locks.get(key);
    if (!existing) {
      return { success: true, alreadyFree: true };
    }

    if (!force && existing.ownerId !== ownerId) {
      return {
        success: false,
        error: 'Cannot release lock held by another owner'
      };
    }

    this.locks.delete(key);

    eventBus.publish('SeatLockReleased', {
      key,
      ownerId,
      metadata: existing.metadata
    }, 'DistributedLock');

    return { success: true };
  }

  isLocked(key) {
    const existing = this.locks.get(key);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return false;
    }
    return true;
  }

  getLock(key) {
    const existing = this.locks.get(key);
    if (!existing) return null;
    if (existing.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return null;
    }
    return {
      ...existing,
      remainingSeconds: Math.ceil((existing.expiresAt - Date.now()) / 1000)
    };
  }

  cleanupExpiredLocks() {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
        eventBus.publish('SeatLockExpired', {
          key,
          ownerId: lock.ownerId,
          metadata: lock.metadata
        }, 'DistributedLock');
      }
    }
  }

  getAllActiveLocks() {
    const now = Date.now();
    const result = [];
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        result.push({
          ...lock,
          remainingSeconds: Math.ceil((lock.expiresAt - now) / 1000)
        });
      }
    }
    return result;
  }
}

export const lockManager = new DistributedLockManager();
