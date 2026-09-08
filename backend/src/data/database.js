import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

class DatabaseStore {
  constructor() {
    this.users = new Map();         // userId -> userObject
    this.sessions = new Map();      // sessionId -> sessionObject
    this.events = new Map();        // eventId -> eventObject
    this.seats = new Map();         // eventId -> Array of seats
    this.bookings = new Map();      // bookingId -> bookingObject
    this.pricingRules = new Map();  // eventId -> pricingRuleObject

    this.seedInitialData();
  }

  seedInitialData() {
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('Password123!', salt);

    // 1. Seed Users
    const organizer = {
      id: 'user-organizer-1',
      name: 'Elena Rostova (Metropolis Events)',
      email: 'organizer@eventix.io',
      passwordHash: defaultPasswordHash,
      role: 'ORGANIZER',
      createdAt: new Date().toISOString()
    };
    this.users.set(organizer.id, organizer);

    const customer = {
      id: 'user-customer-1',
      name: 'Alex Vance',
      email: 'alex@eventix.io',
      passwordHash: defaultPasswordHash,
      role: 'AUDIENCE',
      createdAt: new Date().toISOString()
    };
    this.users.set(customer.id, customer);

    const admin = {
      id: 'user-admin-1',
      name: 'Platform Operations Admin',
      email: 'admin@eventix.io',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      createdAt: new Date().toISOString()
    };
    this.users.set(admin.id, admin);

    // 2. Seed Events (Concert, Theater, Sporting Event)
    const seedEvents = [
      {
        id: 'event-concert-1',
        title: 'Neon Horizon: World Symphony Tour 2026',
        category: 'CONCERT',
        organizerId: organizer.id,
        description: 'An electrifying live orchestra syncretized with ambient synthwave and immersive holographic visualizers.',
        venueName: 'The Luminary Arena',
        city: 'San Francisco, CA',
        date: new Date(Date.now() + 14 * 86400000).toISOString(), // 14 days from now
        bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        tiers: [
          { tierId: 'vip', name: 'VIP Front Row Pit', basePrice: 220, capacity: 16, color: '#f59e0b' },
          { tierId: 'platinum', name: 'Platinum Lower Bowl', basePrice: 140, capacity: 24, color: '#8b5cf6' },
          { tierId: 'gold', name: 'Gold Upper Deck', basePrice: 85, capacity: 32, color: '#3b82f6' },
          { tierId: 'standard', name: 'General Admission', basePrice: 50, capacity: 40, color: '#10b981' }
        ],
        status: 'PUBLISHED',
        createdAt: new Date().toISOString()
      },
      {
        id: 'event-theater-1',
        title: 'The Phantom of Chronos (Musical)',
        category: 'THEATER',
        organizerId: organizer.id,
        description: 'A breathtaking temporal drama set in 19th-century Paris with award-winning Broadway choreography.',
        venueName: 'Grand Majestic Opera House',
        city: 'New York, NY',
        date: new Date(Date.now() + 5 * 86400000).toISOString(), // 5 days from now
        bannerUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80',
        tiers: [
          { tierId: 'vip', name: 'Royal Private Box', basePrice: 250, capacity: 12, color: '#f59e0b' },
          { tierId: 'platinum', name: 'Orchestra Center', basePrice: 160, capacity: 24, color: '#8b5cf6' },
          { tierId: 'gold', name: 'Mezzanine Circle', basePrice: 95, capacity: 30, color: '#3b82f6' },
          { tierId: 'standard', name: 'Upper Balcony', basePrice: 60, capacity: 36, color: '#10b981' }
        ],
        status: 'PUBLISHED',
        createdAt: new Date().toISOString()
      },
      {
        id: 'event-sport-1',
        title: 'Apex Championship: Finals Game 7',
        category: 'SPORTING_EVENT',
        organizerId: organizer.id,
        description: 'The definitive showdown for the global basketball trophy between the Western Titans and Eastern Vipers.',
        venueName: 'Metropolis Coliseum',
        city: 'Chicago, IL',
        date: new Date(Date.now() + 1 * 86400000 + 4 * 3600000).toISOString(), // Tomorrow evening (last minute rush!)
        bannerUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
        tiers: [
          { tierId: 'vip', name: 'Courtside Floor Seats', basePrice: 450, capacity: 12, color: '#f59e0b' },
          { tierId: 'platinum', name: 'Lower Club Sideline', basePrice: 210, capacity: 24, color: '#8b5cf6' },
          { tierId: 'gold', name: 'Mid-Level Baseline', basePrice: 125, capacity: 32, color: '#3b82f6' },
          { tierId: 'standard', name: 'Sky High Tier', basePrice: 70, capacity: 44, color: '#10b981' }
        ],
        status: 'PUBLISHED',
        createdAt: new Date().toISOString()
      }
    ];

    for (const evt of seedEvents) {
      this.events.set(evt.id, evt);
      this.generateSeatsForEvent(evt);

      // Default dynamic pricing configuration
      this.pricingRules.set(evt.id, {
        eventId: evt.id,
        enabled: true,
        demandSurge: {
          enabled: true,
          threshold70Percent: 0.15, // +15% if 70% sold
          threshold90Percent: 0.35  // +35% if 90% sold
        },
        timeDecay: {
          enabled: true,
          earlyBirdDays: 10,
          earlyBirdDiscount: 0.15,  // -15% if booked > 10 days in advance
          lastMinuteHours: 48,
          lastMinuteSurge: 0.20    // +20% surge if within 48 hours
        },
        velocitySurge: {
          enabled: true,
          windowMinutes: 10,
          thresholdPurchases: 5,
          surgeMultiplier: 0.10     // +10% surge when high velocity detected
        }
      });
    }
  }

  generateSeatsForEvent(event) {
    const seatsList = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

    // Map rows to tiers
    // A: VIP, B-C: Platinum, D-E: Gold, F: Standard
    const tierMapping = {
      'A': { tierId: 'vip', basePrice: event.tiers.find(t => t.tierId === 'vip')?.basePrice || 200 },
      'B': { tierId: 'platinum', basePrice: event.tiers.find(t => t.tierId === 'platinum')?.basePrice || 150 },
      'C': { tierId: 'platinum', basePrice: event.tiers.find(t => t.tierId === 'platinum')?.basePrice || 150 },
      'D': { tierId: 'gold', basePrice: event.tiers.find(t => t.tierId === 'gold')?.basePrice || 100 },
      'E': { tierId: 'gold', basePrice: event.tiers.find(t => t.tierId === 'gold')?.basePrice || 100 },
      'F': { tierId: 'standard', basePrice: event.tiers.find(t => t.tierId === 'standard')?.basePrice || 60 }
    };

    const seatsPerRow = 12;

    for (const row of rows) {
      const { tierId, basePrice } = tierMapping[row];
      for (let col = 1; col <= seatsPerRow; col++) {
        const seatId = `${row}${col}`;
        // Pre-mark a few seats as sold for realism
        const isPreSold = (event.id === 'event-sport-1' && (col === 3 || col === 4 || col === 7 || col === 8 || (row === 'A' && col > 6)));
        
        seatsList.push({
          id: seatId,
          row,
          number: col,
          tierId,
          basePrice,
          status: isPreSold ? 'SOLD' : 'AVAILABLE',
          bookedBy: isPreSold ? 'user-customer-1' : null,
          bookedAt: isPreSold ? new Date().toISOString() : null
        });
      }
    }

    this.seats.set(event.id, seatsList);
  }
}

export const db = new DatabaseStore();
