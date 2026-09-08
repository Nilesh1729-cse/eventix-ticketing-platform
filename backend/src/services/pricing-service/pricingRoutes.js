import express from 'express';
import { pricingService } from './pricingService.js';
import { CircuitBreaker } from '../../resilience/CircuitBreaker.js';
import { faultInjector } from '../../resilience/FaultInjector.js';
import { requireAuth, requireRole } from '../auth-service/authRoutes.js';
import { db } from '../../data/database.js';

export const pricingRouter = express.Router();

// Circuit breaker specifically guarding the Dynamic Pricing Service
export const pricingCircuitBreaker = new CircuitBreaker('DynamicPricingEngine', {
  failureThreshold: 3,
  resetTimeout: 8000,
  halfOpenSuccessThreshold: 2
});

pricingRouter.get('/quote', async (req, res) => {
  const { eventId, seatId } = req.query;
  if (!eventId || !seatId) {
    return res.status(400).json({ error: 'eventId and seatId query parameters are required.' });
  }

  try {
    const result = await pricingCircuitBreaker.execute(
      async () => {
        await faultInjector.simulate('pricingService');
        return pricingService.calculateSeatPrice(eventId, seatId);
      },
      // Graceful Fallback if dynamic pricing fails or circuit is open:
      async (err) => {
        console.warn(`[PricingRouter] Circuit Breaker Fallback triggered: ${err.message}`);
        const seats = db.seats.get(eventId) || [];
        const seat = seats.find(s => s.id === seatId);
        const fallbackBase = seat?.basePrice || 50;

        return {
          eventId,
          seatId,
          tierId: seat?.tierId || 'standard',
          basePrice: fallbackBase,
          finalPrice: fallbackBase,
          isDynamic: false,
          fallbackActive: true,
          circuitState: pricingCircuitBreaker.state,
          breakdown: {
            base: fallbackBase,
            demandSurge: 0,
            timeAdjustment: 0,
            velocitySurge: 0,
            totalAdjustment: 0
          },
          reasons: [
            `Resilience Fallback: Pricing engine unavailable (${err.message}). Safe base tier pricing applied.`
          ]
        };
      }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pricing rules for an event
pricingRouter.get('/rules/:eventId', (req, res) => {
  const rules = pricingService.getPricingRules(req.params.eventId);
  res.json(rules);
});

// Update pricing rules (Organizers and Admins)
pricingRouter.put('/rules/:eventId', requireAuth, requireRole('ORGANIZER', 'ADMIN'), (req, res) => {
  try {
    const updated = pricingService.updatePricingRules(req.params.eventId, req.body);
    res.json({ success: true, rules: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Circuit breaker health status
pricingRouter.get('/circuit-status', (req, res) => {
  res.json(pricingCircuitBreaker.getStatus());
});
