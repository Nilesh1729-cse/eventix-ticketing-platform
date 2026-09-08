import { authService } from '../src/services/auth-service/authService.js';
import { catalogService } from '../src/services/catalog-service/catalogService.js';
import { pricingService } from '../src/services/pricing-service/pricingService.js';
import { bookingService } from '../src/services/booking-service/bookingService.js';
import { sagaCoordinator, paymentCircuitBreaker } from '../src/services/booking-service/sagaCoordinator.js';
import { analyticsService } from '../src/services/analytics-service/analyticsService.js';
import { faultInjector } from '../src/resilience/FaultInjector.js';
import { lockManager } from '../src/resilience/DistributedLock.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  }
}

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('🧪 Starting Eventix Platform Automated Verification');
  console.log('----------------------------------------------------');

  // TEST 1: User Registration & Multi-Terminal Login
  console.log('\n[Test 1] Multi-Terminal Authentication & Session Tracking:');
  const userReg = await authService.register({
    email: 'terminal.tester@eventix.io',
    password: 'Password123!',
    name: 'Terminal MultiTester',
    role: 'AUDIENCE'
  });
  assert(userReg.id && userReg.email === 'terminal.tester@eventix.io', 'User successfully registered');

  // Terminal 1: Office Desktop
  const loginTerm1 = await authService.login({
    email: 'terminal.tester@eventix.io',
    password: 'Password123!',
    terminalInfo: {
      terminalId: 'term-desktop-01',
      terminalLabel: 'Office Workstation (Win11)',
      ip: '192.168.1.10',
      userAgent: 'Chrome on Windows'
    }
  });
  assert(loginTerm1.token && loginTerm1.session.terminalId === 'term-desktop-01', 'Login from Terminal 1 succeeded');

  // Terminal 2: Mobile Client
  const loginTerm2 = await authService.login({
    email: 'terminal.tester@eventix.io',
    password: 'Password123!',
    terminalInfo: {
      terminalId: 'term-mobile-02',
      terminalLabel: 'Mobile Client (iOS)',
      ip: '10.0.0.5',
      userAgent: 'Safari on iPhone'
    }
  });
  assert(loginTerm2.token && loginTerm2.session.terminalId === 'term-mobile-02', 'Login from Terminal 2 succeeded');

  // Verify multi-terminal session list
  const activeSessions = authService.getActiveSessions(userReg.id);
  assert(activeSessions.length === 2, `User has 2 active concurrent terminals (found: ${activeSessions.length})`);

  // Revoke Terminal 1 remotely from Terminal 2
  authService.revokeSession(userReg.id, loginTerm1.session.sessionId);
  const remainingSessions = authService.getActiveSessions(userReg.id);
  assert(remainingSessions.length === 1 && remainingSessions[0].terminalId === 'term-mobile-02', 'Remote terminal session revocation works');

  // TEST 2: Catalog Service
  console.log('\n[Test 2] Event Catalog & Venues:');
  const events = catalogService.getAllEvents();
  assert(events.length >= 3, `Catalog returns events across Concerts, Theaters, Sports (count: ${events.length})`);
  const concert = events.find(e => e.category === 'CONCERT');
  assert(concert && concert.tiers.length === 4, 'Concert has tiered venue layout (VIP, Platinum, Gold, Standard)');

  // TEST 3: Dynamic Pricing Policies
  console.log('\n[Test 3] Dynamic Pricing Engine:');
  // Quote seat A1 for concert (14 days away -> Early bird discount)
  const quoteEarlyBird = pricingService.calculateSeatPrice(concert.id, 'A1');
  assert(quoteEarlyBird.isDynamic, 'Dynamic pricing applied to concert seat');
  assert(quoteEarlyBird.breakdown.timeAdjustment < 0, 'Early bird discount applied for event 14 days in advance');

  // Sports event (Tomorrow -> last minute rush)
  const sportsEvent = events.find(e => e.category === 'SPORTING_EVENT');
  const quoteLastMinute = pricingService.calculateSeatPrice(sportsEvent.id, 'A1');
  assert(quoteLastMinute.breakdown.timeAdjustment > 0, 'Last-minute surge applied for event tomorrow');

  // TEST 4: Concurrency Shield & Distributed Seat Locking
  console.log('\n[Test 4] Concurrency & Double-Booking Prevention:');
  const testSeatKey = `seat:${concert.id}:B1`;
  const lock1 = lockManager.acquire(testSeatKey, 'user1:term-1', 5000);
  assert(lock1.success === true, 'Terminal 1 acquired atomic reservation lock for seat B1');

  const lock2 = lockManager.acquire(testSeatKey, 'user2:term-2', 5000);
  assert(lock2.success === false, 'Terminal 2 was blocked by Concurrency Shield (double-booking prevented)');

  // Release lock
  lockManager.release(testSeatKey, 'user1:term-1');
  const lock3 = lockManager.acquire(testSeatKey, 'user2:term-2', 5000);
  assert(lock3.success === true, 'Terminal 2 acquired lock after Terminal 1 released it');
  lockManager.release(testSeatKey, 'user2:term-2');

  // TEST 5: Booking Saga with Ticket Issuance
  console.log('\n[Test 5] Booking Saga Transaction Workflow:');
  const checkoutResult = await bookingService.checkout({
    eventId: concert.id,
    seatId: 'B2',
    user: {
      userId: userReg.id,
      name: userReg.name,
      email: userReg.email
    },
    terminalInfo: {
      terminalId: 'term-mobile-02',
      terminalLabel: 'Mobile Client (iOS)'
    },
    paymentMethod: 'CARD'
  });
  assert(checkoutResult.success === true, 'Booking Saga completed all steps successfully');
  assert(checkoutResult.booking.ticketId.startsWith('TKT-'), 'Digital ticket issued with unique ID');
  assert(checkoutResult.booking.status === 'CONFIRMED', 'Booking record confirmed');

  // Verify seat is now SOLD
  const updatedSeats = catalogService.getEventSeatsWithLiveLocks(concert.id);
  const seatB2 = updatedSeats.find(s => s.id === 'B2');
  assert(seatB2.status === 'SOLD', 'Seat B2 is now marked SOLD');

  // TEST 6: Resilience & Circuit Breaker with Fault Injection
  console.log('\n[Test 6] Fault Tolerance, Chaos Injection & Circuit Breakers:');
  paymentCircuitBreaker.reset();
  assert(paymentCircuitBreaker.state === 'CLOSED', 'Payment circuit breaker is initialized in CLOSED state');

  // Inject failure on payment service
  faultInjector.setFault('paymentService', { isDead: true });

  let sagaFailedGracefully = false;
  try {
    await bookingService.checkout({
      eventId: concert.id,
      seatId: 'B3',
      user: {
        userId: userReg.id,
        name: userReg.name,
        email: userReg.email
      },
      terminalInfo: { terminalId: 'term-mobile-02', terminalLabel: 'Mobile Client' },
      paymentMethod: 'CARD'
    });
  } catch (err) {
    sagaFailedGracefully = true;
  }
  assert(sagaFailedGracefully, 'Saga caught payment failure and rolled back transaction');

  // Verify compensating transaction freed the seat lock
  const lockB3 = lockManager.isLocked(`seat:${concert.id}:B3`);
  assert(!lockB3, 'Compensating rollback successfully released seat lock for B3');

  // Reset fault
  faultInjector.resetAll();
  paymentCircuitBreaker.reset();

  // TEST 7: Analytics & Dynamic Pricing Yield
  console.log('\n[Test 7] Real-Time Analytics & Dynamic Yield:');
  const platformOverview = analyticsService.getPlatformOverview();
  assert(platformOverview.totalRevenue > 0, `Total revenue calculated ($${platformOverview.totalRevenue})`);
  assert(platformOverview.totalTicketsSold > 0, `Total tickets sold recorded (${platformOverview.totalTicketsSold})`);

  console.log('\n====================================================');
  console.log(`🎉 ALL TESTS PASSED: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Unhandled error during verification:', err);
  process.exit(1);
});
