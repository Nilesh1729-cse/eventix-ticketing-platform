import { eventBus } from '../event-bus/EventBus.js';

export class FaultInjector {
  constructor() {
    this.faults = {
      pricingService: {
        latencyMs: 0,
        failRate: 0, // 0 to 1 (0% to 100%)
        isDead: false
      },
      paymentService: {
        latencyMs: 0,
        failRate: 0,
        isDead: false
      },
      catalogService: {
        latencyMs: 0,
        failRate: 0,
        isDead: false
      },
      authService: {
        latencyMs: 0,
        failRate: 0,
        isDead: false
      }
    };
  }

  setFault(serviceName, config) {
    if (!this.faults[serviceName]) {
      this.faults[serviceName] = { latencyMs: 0, failRate: 0, isDead: false };
    }
    this.faults[serviceName] = {
      ...this.faults[serviceName],
      ...config
    };

    eventBus.publish('FaultConfigUpdated', {
      service: serviceName,
      config: this.faults[serviceName]
    }, 'Resilience');

    return this.faults[serviceName];
  }

  getFaults() {
    return this.faults;
  }

  resetAll() {
    for (const key of Object.keys(this.faults)) {
      this.faults[key] = { latencyMs: 0, failRate: 0, isDead: false };
    }
    eventBus.publish('FaultConfigReset', {}, 'Resilience');
  }

  /**
   * Middleware/Interception helper to execute fault simulation before a service call.
   */
  async simulate(serviceName) {
    const config = this.faults[serviceName];
    if (!config) return;

    if (config.isDead) {
      throw new Error(`[FaultInjector] Simulated catastrophic failure: ${serviceName} is unreachable (HTTP 503 Service Unavailable)`);
    }

    if (config.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, config.latencyMs));
    }

    if (config.failRate > 0) {
      if (Math.random() < config.failRate) {
        throw new Error(`[FaultInjector] Simulated intermittent downstream failure in ${serviceName} (HTTP 500 Internal Fault)`);
      }
    }
  }
}

export const faultInjector = new FaultInjector();
