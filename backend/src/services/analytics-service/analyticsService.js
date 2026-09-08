import { db } from '../../data/database.js';
import { eventBus } from '../../event-bus/EventBus.js';
import { pricingCircuitBreaker } from '../pricing-service/pricingRoutes.js';
import { paymentCircuitBreaker } from './../booking-service/sagaCoordinator.js';
import { faultInjector } from '../../resilience/FaultInjector.js';
import { lockManager } from '../../resilience/DistributedLock.js';

export class AnalyticsService {
  constructor() {
    this.salesHistory = []; // Event bus listener accumulator
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.subscribe('BookingConfirmed', (event) => {
      this.salesHistory.push({
        ...event.payload,
        recordedAt: new Date().toISOString()
      });
    });
  }

  /**
   * Overall platform analytics summary (for executives/admins)
   */
  getPlatformOverview() {
    const allBookings = Array.from(db.bookings.values());
    const allEvents = Array.from(db.events.values());
    const allUsers = Array.from(db.users.values());
    const activeSessions = Array.from(db.sessions.values()).filter(s => s.isActive);

    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.pricing?.finalPrice || 0), 0);
    const totalBaseRevenue = allBookings.reduce((sum, b) => sum + (b.pricing?.basePrice || 0), 0);
    const dynamicPricingYield = totalRevenue - totalBaseRevenue; // Value added by dynamic pricing

    // Category distribution
    const categoryStats = {
      CONCERT: { tickets: 0, revenue: 0 },
      THEATER: { tickets: 0, revenue: 0 },
      SPORTING_EVENT: { tickets: 0, revenue: 0 }
    };

    allBookings.forEach(b => {
      const evt = db.events.get(b.eventId);
      const cat = evt?.category || 'CONCERT';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { tickets: 0, revenue: 0 };
      }
      categoryStats[cat].tickets++;
      categoryStats[cat].revenue += (b.pricing?.finalPrice || 0);
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBaseRevenue: Math.round(totalBaseRevenue * 100) / 100,
      dynamicPricingYield: Math.round(dynamicPricingYield * 100) / 100,
      yieldPercentage: totalBaseRevenue > 0 ? Math.round((dynamicPricingYield / totalBaseRevenue) * 100) : 0,
      totalTicketsSold: allBookings.length,
      totalEvents: allEvents.length,
      totalUsers: allUsers.length,
      activeSessionsCount: activeSessions.length,
      categoryStats,
      recentBookings: allBookings.slice(-10).reverse()
    };
  }

  /**
   * Detailed analytics for a specific event (for event organizers)
   */
  getEventAnalytics(eventId) {
    const event = db.events.get(eventId);
    if (!event) {
      throw new Error(`Event '${eventId}' not found.`);
    }

    const seats = db.seats.get(eventId) || [];
    const eventBookings = Array.from(db.bookings.values()).filter(b => b.eventId === eventId);

    const totalSeats = seats.length;
    const soldSeats = seats.filter(s => s.status === 'SOLD').length;
    const occupancyRate = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;

    const eventRevenue = eventBookings.reduce((sum, b) => sum + (b.pricing?.finalPrice || 0), 0);
    const baseRevenue = eventBookings.reduce((sum, b) => sum + (b.pricing?.basePrice || 0), 0);
    const dynamicYield = eventRevenue - baseRevenue;

    // Breakdown by tier
    const tierStats = {};
    for (const tier of event.tiers) {
      const tierSeats = seats.filter(s => s.tierId === tier.tierId);
      const tierSold = tierSeats.filter(s => s.status === 'SOLD').length;
      const tierRev = eventBookings
        .filter(b => b.tierId === tier.tierId)
        .reduce((sum, b) => sum + (b.pricing?.finalPrice || 0), 0);

      tierStats[tier.tierId] = {
        name: tier.name,
        totalSeats: tierSeats.length,
        soldSeats: tierSold,
        occupancyRate: tierSeats.length > 0 ? Math.round((tierSold / tierSeats.length) * 100) : 0,
        revenue: Math.round(tierRev * 100) / 100
      };
    }

    return {
      eventId,
      title: event.title,
      category: event.category,
      venueName: event.venueName,
      date: event.date,
      occupancy: {
        totalSeats,
        soldSeats,
        availableSeats: totalSeats - soldSeats,
        occupancyRate
      },
      financials: {
        totalRevenue: Math.round(eventRevenue * 100) / 100,
        baseRevenue: Math.round(baseRevenue * 100) / 100,
        dynamicYield: Math.round(dynamicYield * 100) / 100,
        dynamicYieldPercent: baseRevenue > 0 ? Math.round((dynamicYield / baseRevenue) * 100) : 0
      },
      tierStats,
      bookingsList: eventBookings
    };
  }

  /**
   * System health, circuit breakers, and chaos engineering status
   */
  getSystemResilienceTelemetry() {
    return {
      timestamp: new Date().toISOString(),
      services: {
        apiGateway: { status: 'HEALTHY', uptime: process.uptime() },
        authService: { status: 'HEALTHY', faultConfig: faultInjector.getFaults().authService },
        catalogService: { status: 'HEALTHY', faultConfig: faultInjector.getFaults().catalogService },
        pricingService: {
          status: pricingCircuitBreaker.state === 'OPEN' ? 'DEGRADED' : 'HEALTHY',
          circuitBreaker: pricingCircuitBreaker.getStatus(),
          faultConfig: faultInjector.getFaults().pricingService
        },
        bookingSagaService: {
          status: paymentCircuitBreaker.state === 'OPEN' ? 'DEGRADED' : 'HEALTHY',
          paymentCircuitBreaker: paymentCircuitBreaker.getStatus(),
          faultConfig: faultInjector.getFaults().paymentService,
          activeDistributedLocks: lockManager.getAllActiveLocks().length
        },
        eventBus: {
          status: 'HEALTHY',
          dlqCount: eventBus.getDLQ().length,
          totalLoggedEvents: eventBus.getHistory().length
        }
      },
      recentEvents: eventBus.getHistory(null, 30),
      deadLetterQueue: eventBus.getDLQ()
    };
  }
}

export const analyticsService = new AnalyticsService();
