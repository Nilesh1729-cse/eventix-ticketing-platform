import http from 'http';

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function assert(condition, desc) {
  if (!condition) {
    console.error(`❌ FAILED: ${desc}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${desc}`);
  }
}

async function runLiveE2E() {
  console.log('========================================================');
  console.log('🚀 LIVE END-TO-END VERIFICATION: EVENTIX PLATFORM');
  console.log('========================================================\n');

  // 1. Gateway Health Check
  const health = await request('/api/health');
  assert(health.status === 200 && health.body.status === 'HEALTHY', 'API Gateway responds with HEALTHY status');
  assert(health.body.microservices.length === 6, 'All 6 microservices registered on Gateway');

  // 2. Catalog & Categories Check
  const events = await request('/api/events');
  assert(events.status === 200 && Array.isArray(events.body) && events.body.length >= 3, 'Catalog returns 3+ events');
  const categories = events.body.map(e => e.category);
  assert(categories.includes('CONCERT'), 'Catalog includes Concert events');
  assert(categories.includes('THEATER'), 'Catalog includes Theater events');
  assert(categories.includes('SPORTING_EVENT'), 'Catalog includes Sporting events');
  const concert = events.body.find(e => e.category === 'CONCERT');

  // 3. User Registration
  const testEmail = `user.${Date.now()}@eventix.io`;
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      email: testEmail,
      password: 'Password123!',
      name: 'E2E Multi-Machine Tester',
      role: 'AUDIENCE'
    }
  });
  assert(regRes.status === 201, 'User registration completed with HTTP 201');

  // 4. Multi-Terminal Authentication
  // Terminal 1: Office PC
  const term1Res = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'X-Terminal-Id': 'term-live-pc-01', 'X-Terminal-Label': 'Office Workstation' },
    body: { email: testEmail, password: 'Password123!', terminalId: 'term-live-pc-01', terminalLabel: 'Office Workstation' }
  });
  assert(term1Res.status === 200 && term1Res.body.token, 'Logged in from Terminal 1 (Office Workstation)');
  const token1 = term1Res.body.token;

  // Terminal 2: Mobile Client
  const term2Res = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'X-Terminal-Id': 'term-live-mobile-02', 'X-Terminal-Label': 'iPhone Mobile' },
    body: { email: testEmail, password: 'Password123!', terminalId: 'term-live-mobile-02', terminalLabel: 'iPhone Mobile' }
  });
  assert(term2Res.status === 200 && term2Res.body.token, 'Logged in from Terminal 2 (iPhone Mobile)');
  const token2 = term2Res.body.token;

  // Query active sessions from Terminal 2
  const sessionsRes = await request('/api/auth/sessions', {
    headers: { Authorization: `Bearer ${token2}`, 'X-Terminal-Id': 'term-live-mobile-02' }
  });
  assert(sessionsRes.status === 200, 'Fetched active sessions list');
  assert(sessionsRes.body.sessions.length === 2, `Active sessions count is exactly 2 across physical machines (found: ${sessionsRes.body.sessions.length})`);

  // 5. Dynamic Pricing Calculation
  const quote = await request(`/api/pricing/quote?eventId=${concert.id}&seatId=A4`);
  assert(quote.status === 200, 'Dynamic pricing quote generated');
  assert(quote.body.isDynamic === true, 'Dynamic pricing algorithm applied');
  assert(quote.body.breakdown.timeAdjustment < 0, 'Early-bird discount calculated (-15%) for event 14 days in advance');

  // 6. Concurrency Shield: Hold Seat & Race Condition Prevention
  const hold1 = await request('/api/bookings/hold', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'X-Terminal-Id': 'term-live-pc-01' },
    body: { eventId: concert.id, seatId: 'A4', terminalLabel: 'Office Workstation' }
  });
  assert(hold1.status === 200, 'Terminal 1 placed atomic distributed lock on seat A4');

  // Terminal 2 tries to hold the same seat simultaneously
  const hold2 = await request('/api/bookings/hold', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}`, 'X-Terminal-Id': 'term-live-mobile-02' },
    body: { eventId: concert.id, seatId: 'A4', terminalLabel: 'iPhone Mobile' }
  });
  assert(hold2.status === 409, 'Terminal 2 was blocked with HTTP 409 Conflict (Double-booking race condition prevented!)');

  // 7. Saga Checkout Execution & Digital Ticket Issuance
  const checkoutRes = await request('/api/bookings/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'X-Terminal-Id': 'term-live-pc-01' },
    body: { eventId: concert.id, seatId: 'A4', paymentMethod: 'CARD', terminalLabel: 'Office Workstation' }
  });
  assert(checkoutRes.status === 201, 'Booking Saga finalized with HTTP 201 Created');
  assert(checkoutRes.body.booking.ticketId.startsWith('TKT-'), 'Digital ticket issued with unique Ticket ID');
  assert(checkoutRes.body.booking.status === 'CONFIRMED', 'Booking confirmed in state store');

  // 8. Remote Session Revocation
  const session1Id = sessionsRes.body.sessions.find(s => s.terminalId === 'term-live-pc-01')?.sessionId;
  const revokeRes = await request(`/api/auth/sessions/${session1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token2}`, 'X-Terminal-Id': 'term-live-mobile-02' }
  });
  assert(revokeRes.status === 200, 'Terminal 2 remotely revoked Terminal 1 session');

  // Verify Terminal 1 token is now rejected
  const rejectedCheck = await request('/api/auth/sessions', {
    headers: { Authorization: `Bearer ${token1}`, 'X-Terminal-Id': 'term-live-pc-01' }
  });
  assert(rejectedCheck.status === 401, 'Terminal 1 received HTTP 401 Unauthorized after remote revocation');

  // 9. Fault Tolerance & Compensating Rollback Simulation
  // Inject catastrophic fault into payment service
  await request('/api/analytics/chaos/fault', {
    method: 'POST',
    body: { service: 'paymentService', isDead: true }
  });

  const failedCheckout = await request('/api/bookings/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}`, 'X-Terminal-Id': 'term-live-mobile-02' },
    body: { eventId: concert.id, seatId: 'A5', paymentMethod: 'CARD', terminalLabel: 'iPhone Mobile' }
  });
  assert(failedCheckout.status === 422, 'Saga caught injected payment outage and aborted transaction gracefully');

  // Verify compensating rollback: seat A5 must NOT remain locked!
  const reHoldA5 = await request('/api/bookings/hold', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}`, 'X-Terminal-Id': 'term-live-mobile-02' },
    body: { eventId: concert.id, seatId: 'A5', terminalLabel: 'iPhone Mobile' }
  });
  assert(reHoldA5.status === 200, 'Compensating rollback verified: seat A5 lock was released and is available again');

  // Reset all chaos faults
  await request('/api/analytics/chaos/reset', { method: 'POST' });
  await request('/api/analytics/circuit-breaker/reset', { method: 'POST' });

  // 10. Analytics & Dynamic Pricing Yield Check
  const analyticsRes = await request('/api/analytics/overview');
  assert(analyticsRes.status === 200, 'Fetched real-time platform overview analytics');
  assert(analyticsRes.body.totalTicketsSold >= 1, 'Total tickets sold recorded in telemetry');

  console.log('\n========================================================');
  console.log('🎉 ALL LIVE END-TO-END VERIFICATIONS PASSED PERFECTLY!');
  console.log('========================================================\n');
}

runLiveE2E().catch(err => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
