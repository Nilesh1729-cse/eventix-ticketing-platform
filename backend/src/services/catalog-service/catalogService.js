import { v4 as uuidv4 } from 'uuid';
import { db } from '../../data/database.js';
import { eventBus } from '../../event-bus/EventBus.js';
import { lockManager } from '../../resilience/DistributedLock.js';

export class CatalogService {
  getAllEvents(filters = {}) {
    let events = Array.from(db.events.values());

    if (filters.category) {
      events = events.filter(e => e.category.toLowerCase() === filters.category.toLowerCase());
    }

    if (filters.city) {
      events = events.filter(e => e.city.toLowerCase().includes(filters.city.toLowerCase()));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      events = events.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.venueName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }

    // Sort by date ascending
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Enrich each event with total seats, sold seats, and occupancy percentage
    return events.map(event => {
      const seats = db.seats.get(event.id) || [];
      const totalSeats = seats.length;
      const soldSeats = seats.filter(s => s.status === 'SOLD').length;
      const occupancyRate = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;
      
      const minPrice = Math.min(...(event.tiers.map(t => t.basePrice) || [50]));

      return {
        ...event,
        stats: {
          totalSeats,
          soldSeats,
          availableSeats: totalSeats - soldSeats,
          occupancyRate
        },
        startingFromPrice: minPrice
      };
    });
  }

  getEventById(eventId) {
    const event = db.events.get(eventId);
    if (!event) {
      throw new Error(`Event with id '${eventId}' not found.`);
    }

    const seats = db.seats.get(eventId) || [];
    const totalSeats = seats.length;
    const soldSeats = seats.filter(s => s.status === 'SOLD').length;
    const occupancyRate = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;

    return {
      ...event,
      stats: {
        totalSeats,
        soldSeats,
        availableSeats: totalSeats - soldSeats,
        occupancyRate
      }
    };
  }

  createEvent(eventData, organizerId) {
    const { title, category, description, venueName, city, date, bannerUrl, tiers } = eventData;
    if (!title || !category || !venueName || !date) {
      throw new Error('Title, category, venueName, and date are required.');
    }

    const eventId = `event-${category.toLowerCase().replace(/_/g, '-')}-${uuidv4().substring(0, 6)}`;
    
    const defaultTiers = tiers && tiers.length > 0 ? tiers : [
      { tierId: 'vip', name: 'VIP Front Row', basePrice: 200, capacity: 12, color: '#f59e0b' },
      { tierId: 'platinum', name: 'Platinum Section', basePrice: 130, capacity: 24, color: '#8b5cf6' },
      { tierId: 'gold', name: 'Gold Section', basePrice: 80, capacity: 24, color: '#3b82f6' },
      { tierId: 'standard', name: 'Standard Section', basePrice: 45, capacity: 12, color: '#10b981' }
    ];

    const newEvent = {
      id: eventId,
      title,
      category: category.toUpperCase(),
      organizerId,
      description: description || '',
      venueName,
      city: city || 'Online / Global',
      date: new Date(date).toISOString(),
      bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      tiers: defaultTiers,
      status: 'PUBLISHED',
      createdAt: new Date().toISOString()
    };

    db.events.set(eventId, newEvent);
    db.generateSeatsForEvent(newEvent);

    // Initialize dynamic pricing rules
    db.pricingRules.set(eventId, {
      eventId,
      enabled: true,
      demandSurge: {
        enabled: true,
        threshold70Percent: 0.15,
        threshold90Percent: 0.35
      },
      timeDecay: {
        enabled: true,
        earlyBirdDays: 7,
        earlyBirdDiscount: 0.15,
        lastMinuteHours: 48,
        lastMinuteSurge: 0.20
      },
      velocitySurge: {
        enabled: true,
        windowMinutes: 10,
        thresholdPurchases: 5,
        surgeMultiplier: 0.10
      }
    });

    eventBus.publish('EventCreated', {
      eventId,
      title: newEvent.title,
      category: newEvent.category,
      organizerId
    }, 'CatalogService');

    return this.getEventById(eventId);
  }

  getEventSeatsWithLiveLocks(eventId, currentUserId = null, currentTerminalId = null) {
    const event = db.events.get(eventId);
    if (!event) {
      throw new Error(`Event with id '${eventId}' not found.`);
    }

    const seats = db.seats.get(eventId) || [];

    return seats.map(seat => {
      const lockKey = `seat:${eventId}:${seat.id}`;
      const lock = lockManager.getLock(lockKey);

      let effectiveStatus = seat.status; // 'AVAILABLE' | 'SOLD'
      let lockDetails = null;

      if (seat.status === 'AVAILABLE' && lock) {
        effectiveStatus = 'HELD'; // Currently in checkout by someone
        const isCurrentHolder = (currentUserId && lock.ownerId.includes(currentUserId)) ||
                               (currentTerminalId && lock.ownerId.includes(currentTerminalId));

        lockDetails = {
          isHeldByCurrentUser: Boolean(isCurrentHolder),
          remainingSeconds: lock.remainingSeconds,
          expiresAt: new Date(lock.expiresAt).toISOString(),
          terminalLabel: lock.metadata?.terminalLabel || 'Another Terminal'
        };
      }

      return {
        ...seat,
        status: effectiveStatus,
        lockDetails
      };
    });
  }
}

export const catalogService = new CatalogService();
