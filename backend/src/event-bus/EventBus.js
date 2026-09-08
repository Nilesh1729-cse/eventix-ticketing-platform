import { v4 as uuidv4 } from 'uuid';

export class EventBus {
  constructor() {
    this.subscribers = new Map(); // topic -> Set of handler functions
    this.eventLog = [];           // Historical audit log of all events
    this.deadLetterQueue = [];    // Events that failed processing
    this.wsBroadcaster = null;    // WebSocket broadcaster hook
  }

  setBroadcaster(broadcaster) {
    this.wsBroadcaster = broadcaster;
  }

  /**
   * Subscribe a handler to a topic. Topic '*' receives all events.
   */
  subscribe(topic, handler) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic).add(handler);

    // Return an unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Publish an event to the bus.
   * @param {string} topic - e.g. 'SeatLocked', 'BookingConfirmed', 'PriceAdjusted'
   * @param {object} payload - Event payload
   * @param {string} [source='system'] - Publishing service name
   */
  async publish(topic, payload, source = 'system') {
    const event = {
      id: uuidv4(),
      topic,
      payload,
      source,
      timestamp: new Date().toISOString()
    };

    // Record in historical audit log (capped at 500 events)
    this.eventLog.unshift(event);
    if (this.eventLog.length > 500) {
      this.eventLog.pop();
    }

    // Broadcast to connected WebSocket clients (for live UI visualizations)
    if (this.wsBroadcaster) {
      try {
        this.wsBroadcaster({
          type: 'EVENT_BUS_NOTIFICATION',
          event
        });
      } catch (err) {
        console.error('[EventBus] WS Broadcast error:', err.message);
      }
    }

    // Deliver to topic-specific subscribers and wildcard subscribers
    const targets = [
      ...(this.subscribers.get(topic) || []),
      ...(this.subscribers.get('*') || [])
    ];

    for (const handler of targets) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error handling event ${topic}:`, err.message);
        this.deadLetterQueue.unshift({
          event,
          error: err.message,
          failedAt: new Date().toISOString()
        });
        if (this.deadLetterQueue.length > 100) {
          this.deadLetterQueue.pop();
        }
      }
    }

    return event;
  }

  /**
   * Get event history with optional topic filtering.
   */
  getHistory(topic = null, limit = 50) {
    if (topic) {
      return this.eventLog.filter(e => e.topic === topic).slice(0, limit);
    }
    return this.eventLog.slice(0, limit);
  }

  /**
   * Get dead letter queue items.
   */
  getDLQ() {
    return this.deadLetterQueue;
  }

  /**
   * Replay an event from the DLQ.
   */
  async replayEvent(eventId) {
    const idx = this.deadLetterQueue.findIndex(item => item.event.id === eventId);
    if (idx === -1) return null;
    const { event } = this.deadLetterQueue.splice(idx, 1)[0];
    await this.publish(event.topic, event.payload, `replay:${event.source}`);
    return event;
  }
}

// Global Singleton Event Bus instance
export const eventBus = new EventBus();
