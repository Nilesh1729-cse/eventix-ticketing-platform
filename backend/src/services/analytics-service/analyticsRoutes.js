import express from 'express';
import { analyticsService } from './analyticsService.js';
import { faultInjector } from '../../resilience/FaultInjector.js';
import { pricingCircuitBreaker } from '../pricing-service/pricingRoutes.js';
import { paymentCircuitBreaker } from '../booking-service/sagaCoordinator.js';
import { eventBus } from '../../event-bus/EventBus.js';
import { requireAuth, requireRole } from '../auth-service/authRoutes.js';

export const analyticsRouter = express.Router();

// Platform Overview
analyticsRouter.get('/overview', (req, res) => {
  const data = analyticsService.getPlatformOverview();
  res.json(data);
});

// Event-specific analytics (Organizer/Admin)
analyticsRouter.get('/event/:eventId', (req, res) => {
  try {
    const data = analyticsService.getEventAnalytics(req.params.eventId);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Live System Resilience & Microservice Health
analyticsRouter.get('/resilience', (req, res) => {
  const telemetry = analyticsService.getSystemResilienceTelemetry();
  res.json(telemetry);
});

// Chaos Engineering: Set Fault Configuration
analyticsRouter.post('/chaos/fault', (req, res) => {
  const { service, latencyMs, failRate, isDead } = req.body;
  if (!service) {
    return res.status(400).json({ error: 'service parameter is required.' });
  }
  const updated = faultInjector.setFault(service, { latencyMs, failRate, isDead });
  res.json({ success: true, service, config: updated });
});

// Chaos Engineering: Reset All Faults
analyticsRouter.post('/chaos/reset', (req, res) => {
  faultInjector.resetAll();
  res.json({ success: true, message: 'All chaos fault injections cleared.' });
});

// Reset Circuit Breaker manually
analyticsRouter.post('/circuit-breaker/reset', (req, res) => {
  const { service } = req.body;
  if (service === 'pricing') {
    pricingCircuitBreaker.reset();
  } else if (service === 'payment') {
    paymentCircuitBreaker.reset();
  } else {
    pricingCircuitBreaker.reset();
    paymentCircuitBreaker.reset();
  }
  res.json({ success: true, message: `Circuit breaker for ${service || 'all'} reset to CLOSED.` });
});

// Replay a Dead Letter Queue event
analyticsRouter.post('/event-bus/replay/:id', async (req, res) => {
  try {
    const event = await eventBus.replayEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found in DLQ.' });
    }
    res.json({ success: true, replayedEvent: event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
