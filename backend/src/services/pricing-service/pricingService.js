import { db } from '../../data/database.js';
import { eventBus } from '../../event-bus/EventBus.js';

export class DynamicPricingService {
  constructor() {
    this.recentBookings = []; // { eventId, timestamp } for velocity calculation
  }

  recordBooking(eventId) {
    this.recentBookings.push({
      eventId,
      timestamp: Date.now()
    });

    // Prune entries older than 30 minutes
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    this.recentBookings = this.recentBookings.filter(b => b.timestamp > thirtyMinAgo);
  }

  getRecentSalesVelocity(eventId, windowMinutes = 10) {
    const windowStart = Date.now() - windowMinutes * 60 * 1000;
    return this.recentBookings.filter(
      b => b.eventId === eventId && b.timestamp >= windowStart
    ).length;
  }

  getPricingRules(eventId) {
    return db.pricingRules.get(eventId) || {
      eventId,
      enabled: false
    };
  }

  updatePricingRules(eventId, updatedRules) {
    const existing = this.getPricingRules(eventId);
    const merged = {
      ...existing,
      ...updatedRules,
      eventId
    };

    db.pricingRules.set(eventId, merged);

    eventBus.publish('PricingRulesUpdated', {
      eventId,
      rules: merged
    }, 'DynamicPricingService');

    return merged;
  }

  /**
   * Calculate real-time dynamic price for a seat at an event.
   * Provides full itemized breakdown for customer transparency.
   */
  calculateSeatPrice(eventId, seatId) {
    const event = db.events.get(eventId);
    if (!event) {
      throw new Error(`Event with id '${eventId}' not found.`);
    }

    const seats = db.seats.get(eventId) || [];
    const seat = seats.find(s => s.id === seatId);
    if (!seat) {
      throw new Error(`Seat with id '${seatId}' not found.`);
    }

    const rules = this.getPricingRules(eventId);
    const basePrice = seat.basePrice;

    // If dynamic pricing is disabled for this event, return base price
    if (!rules.enabled) {
      return {
        eventId,
        seatId,
        tierId: seat.tierId,
        basePrice,
        finalPrice: basePrice,
        isDynamic: false,
        breakdown: {
          base: basePrice,
          demandSurge: 0,
          timeAdjustment: 0,
          velocitySurge: 0,
          totalAdjustment: 0
        },
        reasons: ['Dynamic pricing is currently inactive; standard tier price applied.']
      };
    }

    let demandAdjustment = 0;
    let timeAdjustment = 0;
    let velocityAdjustment = 0;
    const reasons = [];

    // 1. Demand / Scarcity Surge
    const totalSeats = seats.length;
    const soldSeats = seats.filter(s => s.status === 'SOLD').length;
    const occupancyRatio = totalSeats > 0 ? soldSeats / totalSeats : 0;

    if (rules.demandSurge?.enabled) {
      if (occupancyRatio >= 0.90) {
        demandAdjustment = basePrice * (rules.demandSurge.threshold90Percent || 0.35);
        reasons.push(`High Demand Surge (+${Math.round((rules.demandSurge.threshold90Percent || 0.35) * 100)}%): 90%+ venue capacity reached`);
      } else if (occupancyRatio >= 0.70) {
        demandAdjustment = basePrice * (rules.demandSurge.threshold70Percent || 0.15);
        reasons.push(`Moderate Demand Surge (+${Math.round((rules.demandSurge.threshold70Percent || 0.15) * 100)}%): 70%+ venue capacity reached`);
      }
    }

    // 2. Time-Decay (Early Bird vs. Last Minute Surge)
    if (rules.timeDecay?.enabled) {
      const now = Date.now();
      const eventTime = new Date(event.date).getTime();
      const diffMs = eventTime - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffDays >= (rules.timeDecay.earlyBirdDays || 7)) {
        // Early Bird Discount
        const discountRate = rules.timeDecay.earlyBirdDiscount || 0.15;
        timeAdjustment = -(basePrice * discountRate);
        reasons.push(`Early-Bird Reward (-${Math.round(discountRate * 100)}%): Booked ${Math.floor(diffDays)} days in advance`);
      } else if (diffHours <= (rules.timeDecay.lastMinuteHours || 48) && diffHours > 0) {
        // Last-Minute Rush Surge
        const surgeRate = rules.timeDecay.lastMinuteSurge || 0.20;
        timeAdjustment = basePrice * surgeRate;
        reasons.push(`Last-Minute Rush (+${Math.round(surgeRate * 100)}%): Event starts in ${Math.floor(diffHours)} hours`);
      }
    }

    // 3. Sales Velocity Surge
    if (rules.velocitySurge?.enabled) {
      const velocity = this.getRecentSalesVelocity(eventId, rules.velocitySurge.windowMinutes || 10);
      const threshold = rules.velocitySurge.thresholdPurchases || 5;

      if (velocity >= threshold) {
        const velMultiplier = rules.velocitySurge.surgeMultiplier || 0.10;
        velocityAdjustment = basePrice * velMultiplier;
        reasons.push(`Velocity Spike (+${Math.round(velMultiplier * 100)}%): ${velocity} tickets sold in last ${rules.velocitySurge.windowMinutes || 10} minutes`);
      }
    }

    const totalAdjustment = Math.round((demandAdjustment + timeAdjustment + velocityAdjustment) * 100) / 100;
    const finalPrice = Math.max(10, Math.round((basePrice + totalAdjustment) * 100) / 100);

    return {
      eventId,
      seatId,
      tierId: seat.tierId,
      basePrice,
      finalPrice,
      isDynamic: totalAdjustment !== 0,
      breakdown: {
        base: basePrice,
        demandSurge: Math.round(demandAdjustment * 100) / 100,
        timeAdjustment: Math.round(timeAdjustment * 100) / 100,
        velocitySurge: Math.round(velocityAdjustment * 100) / 100,
        totalAdjustment
      },
      metrics: {
        occupancyRate: Math.round(occupancyRatio * 100),
        recentVelocity: this.getRecentSalesVelocity(eventId, 10)
      },
      reasons: reasons.length > 0 ? reasons : ['Base tier price (standard market condition)']
    };
  }
}

export const pricingService = new DynamicPricingService();
