# 📚 Eventix: System Architecture, Microservices & Technical Documentation

> **Eventix** is an enterprise-grade, **Microservices-based and Event-Driven** online ticketing platform engineered to solve real-world distributed systems challenges: flash-sale concurrency race conditions, cascading server faults, multi-terminal device mobility, and dynamic pricing inefficiencies.

---

## 📑 Table of Contents

1. [Executive Architecture Summary](#1-executive-architecture-summary)
2. [Microservices Decomposition & Interface Design](#2-microservices-decomposition--interface-design)
   - [2.1 API Gateway & Session Ingress](#21-api-gateway--session-ingress)
   - [2.2 Auth & Multi-Terminal Session Service](#22-auth--multi-terminal-session-service)
   - [2.3 Event Catalog & Venue Layout Service](#23-event-catalog--venue-layout-service)
   - [2.4 Dynamic Pricing Engine](#24-dynamic-pricing-engine)
   - [2.5 Booking & Distributed Saga Coordinator](#25-booking--distributed-saga-coordinator)
   - [2.6 Analytics & Telemetry Service](#26-analytics--telemetry-service)
3. [Event-Driven Architecture & Pub/Sub Messaging](#3-event-driven-architecture--pubsub-messaging)
   - [3.1 Event Bus Topology](#31-event-bus-topology)
   - [3.2 Event Topics & Message Contracts](#32-event-topics--message-contracts)
   - [3.3 Dead Letter Queue (DLQ) & Message Replay](#33-dead-letter-queue-dlq--message-replay)
   - [3.4 Real-Time WebSocket Synchronization](#34-real-time-websocket-synchronization)
4. [Distributed Systems Patterns & Concurrency Control](#4-distributed-systems-patterns--concurrency-control)
   - [4.1 Distributed Saga Pattern](#41-distributed-saga-pattern)
   - [4.2 Atomic Distributed Locking (Double-Booking Defense)](#42-atomic-distributed-locking-double-booking-defense)
   - [4.3 Circuit Breaker Pattern (3-State Machine)](#43-circuit-breaker-pattern-3-state-machine)
5. [Algorithmic Dynamic Pricing Mathematical Model](#5-algorithmic-dynamic-pricing-mathematical-model)
   - [5.1 Occupancy & Scarcity Surge](#51-occupancy--scarcity-surge)
   - [5.2 Time Decay & Proximity Function](#52-time-decay--proximity-function)
   - [5.3 Sales Velocity Surge](#53-sales-velocity-surge)
   - [5.4 Dynamic Yield Metric](#54-dynamic-yield-metric)
6. [Multi-Terminal Authentication & Device Isolation](#6-multi-terminal-authentication--device-isolation)
7. [Fault Tolerance & Chaos Engineering Console](#7-fault-tolerance--chaos-engineering-console)
8. [Live Demonstration & Presentation Script](#8-live-demonstration--presentation-script)
9. [Viva Voce & Technical Q&A Reference Guide](#9-viva-voce--technical-qa-reference-guide)
10. [Automated Verification & Test Harness](#10-automated-verification--test-harness)

---

## 1. Executive Architecture Summary

Traditional ticketing applications rely on monolithic database transactions (`SELECT FOR UPDATE`), which collapse under high-concurrency flash sales (e.g., Taylor Swift tour sales or sporting finals) and produce single points of failure (SPOFs) when third-party gateways stutter.

Eventix replaces this with a modern distributed architecture:
- **Asynchronous, Non-Blocking Design**: Node.js microservices coordinated through an asynchronous **Event Bus**.
- **Distributed Saga Transactions**: Eliminates blocking Two-Phase Commit (2PC) bottlenecks while guaranteeing data consistency via automated **Compensating Rollbacks**.
- **Atomic Concurrency Shield**: Distributed lock manager enforcing **test-and-set** semantics with a **5-minute Time-To-Live (TTL)**.
- **Fail-Fast Fault Tolerance**: Automated **Circuit Breakers** (`CLOSED`, `OPEN`, `HALF_OPEN`) preventing cascading outages with graceful fallback degradation.
- **Hardware Isolation**: Terminal-scoped sessions supporting concurrent physical machine logins and granular remote session revocation.

```
                              ┌────────────────────────────────────────┐
                              │      React 18 Single Page App (UI)     │
                              │ (Tailwind CSS, Lucide Icons, Recharts) │
                              └───────────────────┬────────────────────┘
                                                  │ REST / WebSockets
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │       Eventix API Gateway (:5000)      │
                              │  (Terminal Ingress, Routing, CORS)     │
                              └──────┬─────────┬─────────┬──────────┬──┘
                                     │         │         │          │
         ┌───────────────────────────┘         │         │          └──────────────────────────┐
         ▼                                     ▼         ▼                                     ▼
┌──────────────────┐               ┌───────────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  Auth & Session  │               │   Event Catalog Service   │   │ Dynamic Pricing Svc  │   │  Booking & Order Svc │
│     Service      │               │ (Concerts, Theaters,      │   │ (Demand, Time-decay, │   │ (Distributed Locks,  │
│(Multi-Terminal,  │               │  Sports, Venues, Tiers)   │   │  Velocity Surge,     │   │  Saga Coordinator,   │
│ Device Registry) │               └─────────────┬─────────────┘   │  Circuit Breaker)    │   │  Payment Breaker)    │
└────────┬─────────┘                             │                 └──────────┬───────────┘   └──────────┬───────────┘
         │                                       │                            │                          │
         └───────────────────────────────────────┼────────────────────────────┼──────────────────────────┘
                                                 ▼                            ▼
                              ┌──────────────────────────────────────────────────┐
                              │           Asynchronous Event Bus & DLQ           │
                              │  (Topics: SeatLocked, BookingConfirmed,          │
                              │   PricingUpdated, CircuitStateChanged, DLQ)      │
                              └───────────────────┬──────────────────────────────┘
                                                  │
                                                  ▼
                              ┌──────────────────────────────────────────────────┐
                              │       Analytics & Resilience Telemetry           │
                              │  (Revenue Yield Uplift, Chaos Fault Injector,    │
                              │   Live WebSocket Broadcaster to Connected UIs)   │
                              └──────────────────────────────────────────────────┘
```

---

## 2. Microservices Decomposition & Interface Design

### 2.1 API Gateway & Session Ingress
- **File**: `backend/src/gateway/server.js`
- **Port**: `5000`
- **Responsibilities**:
  - Serves as the single unified ingress point for HTTP REST endpoints and WebSocket connections.
  - Inspects incoming client headers to extract device identifiers: `X-Terminal-Id` and `X-Terminal-Label`. If omitted, automatically provisions client fingerprints based on IP and User-Agent.
  - Serves the compiled React production application (`frontend/dist`) statically with a client-side Single-Page Application (SPA) catch-all route.
  - Enables Cross-Origin Resource Sharing (CORS) with allowed headers for custom terminal metadata.

### 2.2 Auth & Multi-Terminal Session Service
- **Files**: `backend/src/services/auth-service/authService.js`, `authRoutes.js`
- **Responsibilities**:
  - Role-based registration and authentication (`AUDIENCE`, `ORGANIZER`, `ADMIN`).
  - Cryptographic password hashing using `bcryptjs` with salt rounds.
  - Terminal-bound JSON Web Token (JWT) issuance containing `{ userId, sessionId, terminalId, role }`.
  - Multi-session registry tracking all active physical terminals per account with IP addresses and last-active timestamps.
  - Granular session revocation (remote logout of individual devices or all other devices).

#### Key API Contracts:
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account with specified role |
| `POST` | `/api/auth/login` | Authenticate and register physical terminal session |
| `GET` | `/api/auth/me` | Inspect current token profile |
| `GET` | `/api/auth/sessions` | List all active authenticated terminals |
| `DELETE` | `/api/auth/sessions/:id` | Revoke a specific remote device session |
| `POST` | `/api/auth/sessions/revoke-others`| Revoke all active devices except current |

### 2.3 Event Catalog & Venue Layout Service
- **Files**: `backend/src/services/catalog-service/catalogService.js`, `catalogRoutes.js`
- **Responsibilities**:
  - Catalog management across three major categories: **Concerts**, **Theaters**, and **Sporting Events**.
  - Dynamic 2D venue seating layouts (Rows A–F, Columns 1–12) mapped to tiered pricing levels:
    - `VIP`: Row A (Front Row / Pit / Courtside)
    - `Platinum`: Rows B–C (Lower Bowl / Orchestra)
    - `Gold`: Rows D–E (Mezzanine / Club Level)
    - `Standard`: Row F (General Admission / Balcony)
  - Real-time aggregation of seat availability merged with distributed lock status (`AVAILABLE`, `HELD`, `SOLD`).

#### Key API Contracts:
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events` | List events with category filters and search |
| `GET` | `/api/events/:id` | Get event metadata and occupancy summary |
| `POST` | `/api/events` | Organizer wizard to publish a new event |
| `GET` | `/api/events/:id/seats` | Fetch 2D venue seat map with real-time lock states |

### 2.4 Dynamic Pricing Engine
- **Files**: `backend/src/services/pricing-service/pricingService.js`, `pricingRoutes.js`
- **Responsibilities**:
  - Computes real-time dynamic prices for each seat based on active policies.
  - Provides a transparent itemized price quote: Base Price, Occupancy Surge, Time-Decay Adjustment, and Velocity Surge.
  - Protected by a dedicated **Circuit Breaker** (`DynamicPricingEngine`) to ensure that if the pricing engine is unresponsive or degraded, safe fallback base prices are returned immediately without stalling the user checkout.

#### Key API Contracts:
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pricing/quote` | Fetch dynamic price breakdown (`eventId`, `seatId`) |
| `GET` | `/api/pricing/rules/:eventId` | Inspect dynamic pricing thresholds for an event |
| `PUT` | `/api/pricing/rules/:eventId` | Update pricing policy multipliers (Organizer only) |
| `GET` | `/api/pricing/circuit-status` | Get Circuit Breaker health for the pricing engine |

### 2.5 Booking & Distributed Saga Coordinator
- **Files**: `backend/src/services/booking-service/sagaCoordinator.js`, `bookingService.js`, `bookingRoutes.js`
- **Responsibilities**:
  - Manages seat reservation holds with atomic distributed locks.
  - Coordinates the 4-step distributed transaction saga.
  - Invokes simulated payment processing protected by a **Payment Gateway Circuit Breaker**.
  - Executes **Compensating Transactions** on failure to release held inventory immediately.
  - Generates verifiable digital ticket passes with QR codes.

#### Key API Contracts:
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/bookings/hold` | Acquire temporary 5-minute atomic seat lock |
| `POST` | `/api/bookings/release` | Release seat hold before expiration |
| `POST` | `/api/bookings/checkout` | Execute distributed Saga checkout pipeline |
| `GET` | `/api/bookings/my-bookings` | Fetch user's purchased tickets |
| `GET` | `/api/bookings/:id` | Get single booking receipt and QR code payload |

### 2.6 Analytics & Telemetry Service
- **Files**: `backend/src/services/analytics-service/analyticsService.js`, `analyticsRoutes.js`
- **Responsibilities**:
  - Subscribes to the Event Bus to aggregate real-time revenue and sales velocity.
  - Computes **Dynamic Pricing Yield Uplift** (monetary gain from dynamic surge pricing vs flat rates).
  - Supplies real-time resilience telemetry: Circuit Breaker states, active distributed locks, chaos fault status, and Dead Letter Queue records.

---

## 3. Event-Driven Architecture & Pub/Sub Messaging

### 3.1 Event Bus Topology
Eventix implements an in-memory asynchronous Publish/Subscribe (Pub/Sub) message bus (`backend/src/event-bus/EventBus.js`). Microservices interact strictly through published events rather than direct synchronous coupling, ensuring loose coupling and isolated scalability.

### 3.2 Event Topics & Message Contracts
```typescript
interface EventMessage<T> {
  id: string;              // UUIDv4 event identifier
  topic: string;           // Event Topic Name
  payload: T;              // Structured payload
  source: string;          // Publishing service name
  timestamp: string;       // ISO 8601 UTC timestamp
}
```

#### Major Platform Event Topics:
| Topic | Source Service | Trigger Condition |
|---|---|---|
| `UserRegistered` | `AuthService` | New audience or organizer account created |
| `UserLoggedIn` | `AuthService` | Session issued to a specific physical terminal |
| `SessionRevoked` | `AuthService` | Terminal session terminated locally or remotely |
| `SeatLockAcquired` | `DistributedLock` | User selects an available seat (5-min hold) |
| `SeatLockReleased` | `DistributedLock` | User deselects seat or checkout completes |
| `SeatLockExpired` | `DistributedLock` | 5-minute checkout reservation hold expires |
| `PricingRulesUpdated` | `DynamicPricingService` | Organizer tweaks surge or discount multipliers |
| `BookingConfirmed` | `SagaCoordinator` | 4-step checkout completes; ticket issued |
| `BookingFailed` | `SagaCoordinator` | Downstream failure; compensating rollback triggered |
| `CircuitBreakerStateChanged` | `Resilience` | Breaker transitions (`CLOSED` ↔ `OPEN` ↔ `HALF_OPEN`) |

### 3.3 Dead Letter Queue (DLQ) & Message Replay
When an event handler fails due to an unhandled downstream error or timeout, the Event Bus routes the message to the **Dead Letter Queue (DLQ)** with failure metadata:
```json
{
  "event": { ... },
  "error": "Database connection timeout during analytics ingestion",
  "failedAt": "2026-10-07T12:00:00.000Z"
}
```
Operators can inspect the DLQ via the Resilience Console and trigger an **Event Replay** (`POST /api/analytics/event-bus/replay/:id`) to re-process failed messages once downstream services recover.

### 3.4 Real-Time WebSocket Synchronization
The Event Bus is linked directly to an Express WebSocket Server (`ws`). When any terminal acquires a seat hold, completes a booking, or trips a circuit breaker, the event is broadcast instantaneously to all connected frontend clients (`EVENT_BUS_NOTIFICATION`), ensuring that seat maps and dashboards update without page refreshes.

---

## 4. Distributed Systems Patterns & Concurrency Control

### 4.1 Distributed Saga Pattern
In microservices, maintaining ACID transactions across separate service databases without blocking the system requires the **Saga Pattern**. Eventix implements an orchestrated Saga with 4 sequential steps and automated compensation:

```
[Customer clicks Checkout]
         │
         ▼
[Step 1: Verify & Hold Concurrency Lock]
         │  ↳ Success
         ▼
[Step 2: Freeze Dynamic Price Quote]
         │  ↳ Success
         ▼
[Step 3: Authorize Payment via Gateway]
         │
         ├───► Payment Fails / 503 Outage
         │          │
         │          ▼
         │     [COMPENSATING ROLLBACK]
         │     • Release Distributed Seat Lock
         │     • Log Incident & Emit BookingFailed
         │     • Return Clean Error to Client (Seat freed!)
         │
         ▼ Payment Succeeds
[Step 4: Finalize Booking, Issue Digital Ticket & Emit BookingConfirmed]
```

### 4.2 Atomic Distributed Locking (Double-Booking Defense)
When thousands of users attempt to purchase the same high-demand seat at the exact same millisecond:
1. The **Distributed Lock Manager** (`backend/src/resilience/DistributedLock.js`) checks key `seat:${eventId}:${seatId}`.
2. If available, it atomically sets `ownerId = ${userId}:${terminalId}` with a `5-minute TTL`.
3. If held by another client, it rejects the concurrent request with an **HTTP 409 Conflict** and the remaining hold duration in seconds.
4. If the user abandons checkout or closes the browser, a background sweeper evicts expired locks after 300 seconds, releasing the inventory automatically.

### 4.3 Circuit Breaker Pattern (3-State Machine)
External payment gateways and pricing algorithms can fail or experience severe latency. To prevent cascading failures, Eventix wraps downstream calls in a **Circuit Breaker** (`backend/src/resilience/CircuitBreaker.js`):

```
                     Success
        ┌────────────────────────────────┐
        │                                │
        ▼                                │
   ┌─────────┐   3 Failures in a row   ┌──────┐
   │ CLOSED  ├────────────────────────►│ OPEN │
   └────▲────┘                         └──┬───┘
        │                                 │
        │ 2 Successes                     │ 8s Reset Timeout
        │                                 ▼
   ┌────┴────────┐                  ┌───────────┐
   │  HALF_OPEN  │◄─────────────────┤ Cooldown  │
   └─────────────┘                  └───────────┘
```

1. **CLOSED (Normal)**: Requests execute normally. If consecutive failures exceed the threshold (3), the circuit trips to **OPEN**.
2. **OPEN (Failing Fast)**: All calls fail immediately without touching downstream resources. A **Graceful Fallback** is invoked (e.g., pricing returns safe base price; payment initiates compensating rollback).
3. **HALF_OPEN (Trial)**: After an 8-second cooldown, probe requests test if the service has recovered. Two consecutive successes transition the breaker back to **CLOSED**.

---

## 5. Algorithmic Dynamic Pricing Mathematical Model

Ticket prices update dynamically based on real-time market signals:

$$\text{Final Price} = \max\left(10, \; \text{Base Price} + \Delta_{\text{Demand}} + \Delta_{\text{Time}} + \Delta_{\text{Velocity}}\right)$$

### 5.1 Occupancy & Scarcity Surge
Let $N_{\text{sold}}$ be the number of confirmed bookings, and $N_{\text{total}}$ be the venue capacity. The occupancy ratio is:

$$O = \frac{N_{\text{sold}}}{N_{\text{total}}}$$

- If $O \ge 0.90$ (High Demand): $\Delta_{\text{Demand}} = \text{Base Price} \times 0.35$ (+35% surge)
- If $O \ge 0.70$ (Moderate Demand): $\Delta_{\text{Demand}} = \text{Base Price} \times 0.15$ (+15% surge)
- Otherwise: $\Delta_{\text{Demand}} = 0$

### 5.2 Time Decay & Proximity Function
Let $T_{\text{event}}$ be event timestamp and $T_{\text{now}}$ be current timestamp:

$$D = \frac{T_{\text{event}} - T_{\text{now}}}{86,400,000 \text{ ms (1 day)}}$$

- **Early-Bird Discount**: If $D \ge 7$ days: $\Delta_{\text{Time}} = -(\text{Base Price} \times 0.15)$ (-15% discount)
- **Last-Minute Rush Surge**: If $D \le 2$ days (within 48 hours): $\Delta_{\text{Time}} = +(\text{Base Price} \times 0.20)$ (+20% surge)

### 5.3 Sales Velocity Surge
Monitors the count of purchases $V$ in a rolling 10-minute sliding window:
- If $V \ge 5$ tickets purchased: $\Delta_{\text{Velocity}} = +(\text{Base Price} \times 0.10)$ (+10% momentum surge)

### 5.4 Dynamic Yield Metric
Organizers track the monetary uplift generated purely by dynamic pricing algorithms:

$$\text{Dynamic Yield} = \sum_{i=1}^{M} \left(\text{Final Price}_i - \text{Base Price}_i\right)$$

$$\text{Yield Percentage} = \frac{\text{Dynamic Yield}}{\sum \text{Base Price}_i} \times 100\%$$

---

## 6. Multi-Terminal Authentication & Device Isolation

To demonstrate physical device mobility:
- Each HTTP request carries headers `X-Terminal-Id` and `X-Terminal-Label`.
- The client stores terminal-scoped credentials (`eventix_token_{terminalId}`), allowing users to simulate distinct devices inside the same browser or across separate browser tabs.
- The **Active Terminals / Devices** modal allows users to inspect all active sessions (IP, device label, login timestamp) and issue remote terminations.
- If a session is terminated remotely, the next API call from that device receives an **HTTP 401 Unauthorized**, triggering local token eviction and an instant revocation alert.

---

## 7. Fault Tolerance & Chaos Engineering Console

The **Resilience & Chaos Console** provides an interactive playground for chaos testing:
- **Kill Payment Gateway**: Forces the payment microservice to return `HTTP 503 Service Unavailable`.
- **Kill Pricing Engine**: Forces the dynamic pricing engine down to observe Circuit Breaker trip and Graceful Fallback to base pricing.
- **Inject Network Latency**: Injects synthetic latency (0–2500ms) to evaluate timeout behaviors.
- **Live Event Stream**: Real-time terminal log displaying WebSocket event notifications as they occur across the platform.

---

## 8. Live Demonstration & Presentation Script

Use this structured 7-act script when presenting Eventix:

### Act 1: Multi-Terminal Session Mobility & Security
1. Point to the top navbar badge: `Terminal: Office Workstation`.
2. Open the Terminal Switcher. Show options: *Office Workstation*, *Home Laptop*, *Mobile Client*, *Box-Office Kiosk*.
3. Sign in as `alex@eventix.io` (`Password123!`).
4. Switch terminal to `Home Laptop` and log into the same account.
5. Click **Active Terminals / Devices** to show that both concurrent machines are tracked with IP and terminal ID.
6. Click **Revoke** on the Office Workstation session to prove remote device termination.

### Act 2: 2D Venue Seat Map & Concurrency Race Condition Defense
1. In **Event Discovery**, click on *Neon Horizon: World Symphony Tour 2026* ➔ **View Seats**.
2. Explain the 2D layout (VIP, Platinum, Gold, Standard).
3. Click seat **VIP Row A, Seat A1**: observe the yellow `HELD` state and 5-minute countdown timer.
4. **The Concurrency Test**: Open an Incognito window or second browser tab at `http://localhost:5000`. Navigate to the same event seat map.
5. Point out that Seat A1 is marked **LOCKED / HELD** in real time on the second browser. Attempting to click it displays: *"Seat is currently reserved by another user/terminal."*

### Act 3: Algorithmic Dynamic Pricing Breakdown
1. Back on the first browser, inspect the **Dynamic Pricing Quote** panel.
2. Walk through the itemized breakdown: Base Tier Price, Occupancy Surge, Time Decay (Early-Bird discount or last-minute rush), and Sales Velocity.
3. Show how the final price reflects transparent algorithmic optimization.

### Act 4: Distributed Saga Pattern in Action
1. Click **Lock Price & Proceed to Checkout**.
2. Select payment method and click **Authorize & Confirm Booking**.
3. Point out the live 4-stage pipeline completing with green checks:
   - ✓ Step 1: Distributed Concurrency Lock Verified
   - ✓ Step 2: Dynamic Price Frozen
   - ✓ Step 3: Payment Authorized (Guarded by Circuit Breaker)
   - ✓ Step 4: Digital Ticket Issued & Seat Marked SOLD
4. Show the resulting Digital Ticket Pass with QR barcode and seat verification.

### Act 5: Chaos Engineering & Circuit Breaker Fault Injection (⭐️ Showstopper)
1. Navigate to the **Resilience & Chaos Console**.
2. Show Circuit Breakers in `CLOSED` state (healthy).
3. Under Chaos Playground, check **Kill Payment Gateway (Force HTTP 503)**.
4. Attempt to purchase another seat: Step 1 and 2 succeed, but Step 3 fails.
5. **Demonstrate Compensating Rollback**: The Saga coordinator rolls back, releases the seat lock, and restores the seat to available.
6. Return to the Chaos Console: show that the Circuit Breaker tripped to `OPEN` after consecutive failures, and show the failed event captured in the **Dead Letter Queue (DLQ)**.
7. Uncheck the fault and demonstrate how the breaker recovers to `HALF_OPEN` and `CLOSED`.

### Act 6: Organizer Dashboard & Dynamic Yield Analytics
1. Sign in as Organizer: `organizer@eventix.io` / `Password123!`.
2. Navigate to **Organizer Portal**.
3. Highlight KPI cards: Gross Revenue, Tickets Sold, Occupancy Rate, and **Dynamic Pricing Yield** ($ extra revenue generated vs base pricing).
4. Demonstrate tweaking the surge multipliers live under the Policy Adjuster without restarting the server.

### Act 7: Automated Verification Test Suite
1. Run the test suite:
   ```bash
   cd backend
   npm test
   ```
2. Verify: **`🎉 ALL TESTS PASSED: 22 passed, 0 failed.`**

---

## 9. Viva Voce & Technical Q&A Reference Guide

| # | Question | High-Scoring Answer |
|---|---|---|
| **Q1** | **Why did you use the Saga Pattern instead of traditional Two-Phase Commit (2PC)?** | *"Two-Phase Commit is synchronous and blocking. If any node lags or network partitions occur, all database resources remain locked, drastically reducing throughput during flash sales. The Saga pattern uses a sequence of local transactions with asynchronous messaging and compensating transactions (rollbacks), making it resilient, non-blocking, and highly scalable."* |
| **Q2** | **How do you guarantee that two users clicking the same seat at the same millisecond don't both buy it?** | *"We enforce concurrency control at the API Gateway using an Atomic Distributed Lock Manager. When user A requests a seat hold, the lock is acquired atomically in memory with a 5-minute TTL. Any concurrent request from user B checks the key `seat:eventId:seatId` and receives an immediate HTTP 409 Conflict with the remaining TTL."* |
| **Q3** | **Explain how your Circuit Breaker works.** | *"It follows the canonical 3-state machine: CLOSED passes calls normally. If failures exceed our threshold (3 consecutive failures), it trips to OPEN, failing fast or returning graceful fallbacks without overwhelming downstream services. After a cooldown reset period (8 seconds), it transitions to HALF_OPEN to test downstream recovery."* |
| **Q4** | **How does the frontend get real-time seat lock updates from other users?** | *"Our backend has an in-memory Pub/Sub EventBus hooked directly into an Express WebSocketServer (`ws`). When a seat lock is acquired or a circuit breaker changes state, an event is broadcast via WebSockets to all connected browser clients instantaneously."* |
| **Q5** | **How would you transition this in-memory architecture to a multi-node production deployment?** | *"We designed the microservices with clean abstraction layers. The in-memory data store can be swapped for PostgreSQL with read replicas; the distributed lock manager can be backed by Redis using Redlock; and the in-memory Event Bus can be replaced with Apache Kafka or RabbitMQ."* |

---

## 10. Automated Verification & Test Harness

Eventix includes two automated test suites:

### 1. Backend Unit & Integration Tests (`backend/tests/test_runner.js`)
Tests multi-terminal registration, session revocation, catalog generation, dynamic pricing math, concurrent locking, saga checkout, circuit breaker transitions, and analytics.

```bash
cd backend
npm test
```

### 2. Live Server End-to-End Test (`backend/tests/live_e2e_verification.js`)
Performs 23 real HTTP requests and WebSocket interactions against a running server (`http://localhost:5000`):

```bash
cd backend
node tests/live_e2e_verification.js
```

Both test suites execute with **100% pass rate (0 failures)**.
