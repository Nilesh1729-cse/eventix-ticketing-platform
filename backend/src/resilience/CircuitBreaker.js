import { eventBus } from '../event-bus/EventBus.js';

export const CircuitState = {
  CLOSED: 'CLOSED',       // Normal operation, passing calls
  OPEN: 'OPEN',           // Downstream is failing; immediately execute fallback
  HALF_OPEN: 'HALF_OPEN'  // Testing if downstream has recovered
};

export class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 3;       // Consecutive failures to trip open
    this.resetTimeout = options.resetTimeout || 10000;           // 10s cooldown before trying HALF_OPEN
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2; // Successes needed to close

    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastStateChange = new Date().toISOString();
    this.lastFailureTime = null;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalFallbacks = 0;
  }

  /**
   * Execute an operation protected by this circuit breaker.
   * @param {Function} action - Async function to run
   * @param {Function} [fallback] - Async fallback function if circuit is open or action throws
   */
  async execute(action, fallback = null) {
    this.totalRequests++;

    // Check if OPEN circuit can transition to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.transitionTo(CircuitState.HALF_OPEN, 'Reset timeout elapsed; testing downstream service');
      } else {
        // Circuit still OPEN, immediately invoke fallback or throw
        this.totalFallbacks++;
        if (fallback) {
          return await fallback(new Error(`[CircuitBreaker:${this.serviceName}] Circuit is OPEN`));
        }
        throw new Error(`[CircuitBreaker:${this.serviceName}] Circuit is OPEN. Service temporarily unavailable.`);
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      if (fallback) {
        this.totalFallbacks++;
        return await fallback(err);
      }
      throw err;
    }
  }

  onSuccess() {
    this.consecutiveFailures = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        this.transitionTo(CircuitState.CLOSED, 'Downstream service recovered successfully');
      }
    }
  }

  onFailure(err) {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN, `Failed during HALF_OPEN probe: ${err.message}`);
    } else if (this.state === CircuitState.CLOSED && this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo(CircuitState.OPEN, `Failure threshold exceeded (${this.consecutiveFailures}/${this.failureThreshold}): ${err.message}`);
    }
  }

  transitionTo(newState, reason) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date().toISOString();
    if (newState === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses = 0;
    }

    console.log(`[CircuitBreaker:${this.serviceName}] State change: ${oldState} -> ${newState}. Reason: ${reason}`);

    eventBus.publish('CircuitBreakerStateChanged', {
      service: this.serviceName,
      oldState,
      newState,
      reason,
      timestamp: this.lastStateChange
    }, 'Resilience');
  }

  getStatus() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastStateChange: this.lastStateChange,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalFallbacks: this.totalFallbacks
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastStateChange = new Date().toISOString();
  }
}
