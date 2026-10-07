# 🎟️ Eventix: Resilient Microservices Ticketing Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-orange?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

An enterprise-grade, **Microservices & Event-Driven** online ticketing platform. Event organizers sell tickets for **concerts, theaters, and sporting events**, while audience members discover events, select seats, and purchase tickets backed by real-time dynamic pricing, multi-terminal session mobility, distributed saga transactions, and chaos-tested fault tolerance.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Pre-configured Test Accounts](#-pre-configured-test-accounts)
- [Automated Verification Tests](#-automated-verification-tests)
- [Interactive Feature Tour](#-interactive-feature-tour)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Architectural Overview

Eventix is structured around clean domain separation, high concurrency protection, and decoupled asynchronous messaging:

1. **API Gateway Service (`/api/*`)**: Central entry point handling client requests, terminal identity extraction (`X-Terminal-Id`, `X-Terminal-Label`), rate limiting, and CORS routing.
2. **Auth & Multi-Terminal Session Service (`/api/auth/*`)**: Supports concurrent logins across multiple physical/simulated devices (Office Desktop, Laptop, Mobile iOS, Kiosk) with remote session inspection and instant revocation.
3. **Event Catalog Service (`/api/events/*`)**: Manages events across Concerts, Theaters, and Sports with interactive 2D venue seating layouts (VIP, Platinum, Gold, Standard).
4. **Dynamic Pricing Engine (`/api/pricing/*`)**: Calculates prices dynamically using:
   - **Occupancy Scarcity**: Tiered surge (+15% at 70% capacity, +35% at 90% capacity).
   - **Time Decay**: Early-bird discount vs. last-48h rush surcharge.
   - **Sales Velocity**: High-frequency booking rate surge.
5. **Booking & Saga Coordinator (`/api/bookings/*`)**: Orchestrates distributed 4-step Saga transactions with atomic distributed locks to prevent double-booking:
   - `Step 1: AcquireSeatLock`
   - `Step 2: FreezeDynamicPrice`
   - `Step 3: AuthorizePayment` (guarded by Circuit Breakers)
   - `Step 4: IssueTicket`
6. **Analytics & Telemetry Service (`/api/analytics/*`)**: Consumes events from the Pub/Sub Event Bus to calculate revenue, dynamic pricing yield, and category metrics.
7. **Resilience & Chaos Engineering Console**: Live telemetry with circuit breakers (`CLOSED`, `OPEN`, `HALF_OPEN`), fault injection (HTTP 503 outage, latency injection), and real-time Event Bus streaming with Dead Letter Queue (DLQ) inspection.

---

## 📐 System Architecture

```
                       ┌─────────────────────────────────────────┐
                       │     React 18 Single Page App (UI)       │
                       │ (Tailwind CSS, Lucide Icons, Recharts)  │
                       └───────────────────┬─────────────────────┘
                                           │ HTTP & WebSockets
                                           ▼
                       ┌─────────────────────────────────────────┐
                       │           Eventix API Gateway           │
                       │   (Express, CORS, Terminal Tracking)    │
                       └─────┬──────────────┬──────────────┬─────┘
                             │              │              │
           ┌─────────────────┼──────────────┼──────────────┼─────────────────┐
           │                 │              │              │                 │
           ▼                 ▼              ▼              ▼                 ▼
   ┌──────────────┐  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ Auth & Multi-│  │ Event Catalog│ │ Dynamic      │ │ Booking Saga │ │ Analytics &  │
   │ Terminal Svc │  │ Service      │ │ Pricing Svc  │ │ Coordinator  │ │ Telemetry Svc│
   └───────┬──────┘  └───────┬──────┘ └───────┬──────┘ └───────┬──────┘ └───────┬──────┘
           │                 │                │                │                │
           └─────────────────┴───────┬────────┴────────────────┴────────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │   In-Memory Pub/Sub Event Bus │
                     │   (with DLQ & WebSocket Push) │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │ Circuit Breakers & Lock Mgr   │
                     │ (Concurrency & Fault Guard)   │
                     └───────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Recharts, Lucide React, Axios |
| **Backend** | Node.js (v18+), Express.js 4, ws (WebSocket Server) |
| **Security & Auth** | JSON Web Tokens (JWT), bcryptjs, Session Manager |
| **Distributed Systems** | Saga Orchestrator, Distributed Locking, In-Memory Event Bus |
| **Resilience & Chaos** | Circuit Breaker Pattern (`CLOSED`, `OPEN`, `HALF_OPEN`), Fault Injector, Dead Letter Queue |
| **Testing** | Custom verification test runner with live concurrent simulation |

---

## 📂 Repository Structure

```
.
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── data/
│   │   │   └── database.js              # In-memory mock data store with seeded events
│   │   ├── event-bus/
│   │   │   └── EventBus.js              # In-memory pub/sub broker with DLQ
│   │   ├── gateway/
│   │   │   └── server.js                # Express API gateway & WebSocket server
│   │   ├── resilience/
│   │   │   ├── CircuitBreaker.js        # Three-state circuit breaker implementation
│   │   │   ├── DistributedLock.js       # Atomic seat-locking mechanism
│   │   │   └── FaultInjector.js         # Chaos engineering simulator
│   │   └── services/
│   │       ├── analytics-service/       # Telemetry & revenue metrics
│   │       ├── auth-service/            # Authentication & multi-terminal tracking
│   │       ├── booking-service/         # Booking logic & Saga coordinator
│   │       ├── catalog-service/         # Event listings & seat layout generator
│   │       └── pricing-service/         # Real-time dynamic pricing calculation
│   └── tests/
│       ├── test_runner.js               # Comprehensive unit & integration tests
│       └── live_e2e_verification.js     # Live end-to-end suite
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                      # Main UI application shell
│       ├── api/
│       │   └── client.js                # Axios HTTP client with terminal headers
│       ├── components/                  # Modals, dashboards, and visualizers
│       │   ├── ActiveSessionsModal.jsx  # Multi-terminal device inspector
│       │   ├── AuthModal.jsx            # Login & registration modal
│       │   ├── CheckoutSagaModal.jsx    # Live 4-step Saga visualization
│       │   ├── DigitalTicketModal.jsx   # Pass with QR barcode
│       │   ├── EventCard.jsx            # Event listing card
│       │   ├── MyTicketsView.jsx        # Audience member ticket locker
│       │   ├── Navbar.jsx               # Header navigation & terminal selector
│       │   ├── OrganizerDashboard.jsx   # Organizer KPIs & pricing controls
│       │   ├── ResilienceConsole.jsx    # Circuit breaker & chaos controls
│       │   ├── SeatMapVisualizer.jsx    # Interactive 2D seating layout
│       │   └── TerminalSwitcherModal.jsx# Terminal/device simulation switcher
│       └── context/
│           ├── AuthContext.jsx          # User & terminal state provider
│           └── SocketContext.jsx        # WebSocket client provider
├── .gitignore                           # Git ignore rules
└── README.md                            # Documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**: Installed and configured

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/eventix-ticketing-platform.git
   cd eventix-ticketing-platform
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. **Install frontend dependencies & build the production UI:**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

### Running the Application

#### Option A: Unified Full-Stack Mode (Recommended)
Once the frontend is built (`npm run build`), the Express Gateway serves both the API and the compiled React UI:

```bash
cd backend
npm start
```
- Open browser at: **`http://localhost:5000`**

#### Option B: Standalone Frontend Dev Mode (with Hot Reloading)
If you want to modify React components with instant Hot Module Replacement (HMR):

1. **Start backend gateway:**
   ```bash
   cd backend
   npm start
   ```

2. **In a second terminal, start Vite dev server:**
   ```bash
   cd frontend
   npm run dev
   ```
- Open browser at: **`http://localhost:3000`**

---

## 👥 Pre-configured Test Accounts

You can log in immediately using these pre-seeded accounts:

| Role | Email | Password | Description |
|---|---|---|---|
| **Audience** | `alex@eventix.io` | `Password123!` | Standard user account for booking seats |
| **Organizer** | `organizer@eventix.io` | `Password123!` | Manages events, analyzes yield, tweaks pricing |
| **Platform Admin** | `admin@eventix.io` | `Password123!` | Full administrative access |

---

## 🧪 Automated Verification Tests

Run the automated test suite covering microservices, concurrency locking, dynamic pricing math, and saga rollback resilience:

```bash
cd backend
npm test
```

Expected output:
```
====================================================
🎉 ALL TESTS PASSED: 22 passed, 0 failed.
====================================================
```

---

## 🧭 Interactive Feature Tour

### 1. Multi-Terminal Session Mobility
- Click the **Terminal: [Device]** button in the top navigation bar.
- Switch between **Office Workstation**, **Home Laptop**, **Mobile Client (iOS)**, or **Box-Office Kiosk**.
- Log in on one terminal, then switch to another and see all concurrent sessions listed under **Active Terminals / Devices**.
- Click **Revoke** on any remote terminal to terminate its session instantly.

### 2. Interactive Seating & Real-Time Dynamic Pricing
- Browse events (Concert, Theater, Sports) and click **View Seats**.
- Select any available seat to initiate an atomic **5-minute reservation hold**.
- View the real-time dynamic pricing breakdown showing Base Price, Scarcity Surge, Early-Bird Discount, and Velocity Surcharge.
- Open another tab or terminal and verify that the seat is blocked as **HELD** with a countdown timer.

### 3. Distributed Saga Checkout
- Click **Lock Price & Proceed to Checkout**.
- Watch the live visual Saga execution:
  1. *Distributed Concurrency Lock Verified*
  2. *Dynamic Price Frozen*
  3. *Payment Authorized*
  4. *Digital Ticket Issued*
- View the generated ticket pass with verifiable QR code.

### 4. Chaos Engineering & Circuit Breaker Simulation
- Navigate to the **Resilience & Chaos Console**.
- Check **Kill Payment Gateway** (forces HTTP 503 outage).
- Attempt to complete a booking: observe how the Saga coordinator detects the failure, rolls back the transaction, and releases the seat lock.
- Observe the Circuit Breaker transition to **OPEN** to protect backend resources.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Gateway health check & microservice catalog |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user & issue terminal session |
| `GET` | `/api/auth/sessions` | Inspect active terminal sessions |
| `POST` | `/api/auth/revoke-session` | Remotely revoke a terminal session |
| `GET` | `/api/events` | List all events with pricing ranges |
| `GET` | `/api/events/:id/seats` | Fetch 2D venue seat map and status |
| `POST` | `/api/pricing/quote` | Calculate real-time dynamic price for a seat |
| `POST` | `/api/bookings/hold` | Acquire atomic seat lock hold |
| `POST` | `/api/bookings/checkout` | Execute 4-step booking saga |
| `GET` | `/api/analytics/metrics` | Retrieve platform revenue and yield metrics |
| `POST` | `/api/analytics/chaos` | Configure circuit breakers & fault injection |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
