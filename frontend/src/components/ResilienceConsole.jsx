import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import {
  ShieldAlert,
  Activity,
  Zap,
  RotateCcw,
  Radio,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Clock,
  Layers,
  Flame,
  Terminal as TerminalIcon
} from 'lucide-react';

export const ResilienceConsole = () => {
  const { lastEvent } = useSocket();
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chaos controls state
  const [chaosPricingDead, setChaosPricingDead] = useState(false);
  const [chaosPaymentDead, setChaosPaymentDead] = useState(false);
  const [chaosLatency, setChaosLatency] = useState(0);

  const fetchTelemetry = async () => {
    try {
      const res = await api.get('/analytics/resilience');
      setTelemetry(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching resilience telemetry:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reactively update on WebSocket event
  useEffect(() => {
    if (!lastEvent) return;
    fetchTelemetry();
  }, [lastEvent]);

  const handleInjectFault = async (service, config) => {
    try {
      await api.post('/analytics/chaos/fault', { service, ...config });
      await fetchTelemetry();
    } catch (err) {
      alert('Error injecting chaos fault: ' + err.message);
    }
  };

  const handleResetAllChaos = async () => {
    try {
      await api.post('/analytics/chaos/reset');
      setChaosPricingDead(false);
      setChaosPaymentDead(false);
      setChaosLatency(0);
      await fetchTelemetry();
    } catch (err) {
      alert('Error resetting chaos: ' + err.message);
    }
  };

  const handleResetCircuitBreaker = async (service) => {
    try {
      await api.post('/analytics/circuit-breaker/reset', { service });
      await fetchTelemetry();
    } catch (err) {
      alert('Error resetting circuit breaker: ' + err.message);
    }
  };

  const handleReplayDLQ = async (eventId) => {
    try {
      await api.post(`/analytics/event-bus/replay/${eventId}`);
      await fetchTelemetry();
      alert('Event successfully replayed from Dead Letter Queue to the Event Bus!');
    } catch (err) {
      alert('Error replaying DLQ event: ' + err.message);
    }
  };

  if (loading || !telemetry) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 font-mono text-sm">
        Gathering distributed telemetry and circuit breaker states...
      </div>
    );
  }

  const { services, recentEvents, deadLetterQueue } = telemetry;
  const pricingCb = services.pricingService?.circuitBreaker;
  const paymentCb = services.bookingSagaService?.paymentCircuitBreaker;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                <span>System Resilience & Chaos Console</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Microservice fault tolerance, Circuit Breakers, Distributed Locks, and Event Bus auditing.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleResetAllChaos}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 border border-slate-700 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Reset All Chaos & Faults</span>
        </button>
      </div>

      {/* 1. Microservice Topology Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dynamic Pricing Circuit */}
        <div className={`p-5 rounded-2xl border shadow-xl space-y-2.5 transition ${
          pricingCb?.state === 'OPEN'
            ? 'bg-rose-950/30 border-rose-500/50 glow-amber'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold">PRICING CIRCUIT</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              pricingCb?.state === 'CLOSED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : pricingCb?.state === 'HALF_OPEN'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
            }`}>
              {pricingCb?.state || 'CLOSED'}
            </span>
          </div>

          <div className="text-lg font-extrabold text-white">
            Dynamic Pricing Engine
          </div>

          <div className="text-[11px] text-slate-400 font-mono space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span>Failures / Threshold:</span>
              <span className="text-slate-200">{pricingCb?.consecutiveFailures} / {pricingCb?.failureThreshold || 3}</span>
            </div>
            <div className="flex justify-between">
              <span>Fallbacks Triggered:</span>
              <span className="text-amber-400 font-bold">{pricingCb?.totalFallbacks || 0}</span>
            </div>
          </div>

          {pricingCb?.state !== 'CLOSED' && (
            <button
              onClick={() => handleResetCircuitBreaker('pricing')}
              className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs rounded-lg font-mono border border-slate-700"
            >
              Reset Circuit to CLOSED
            </button>
          )}
        </div>

        {/* Payment Circuit */}
        <div className={`p-5 rounded-2xl border shadow-xl space-y-2.5 transition ${
          paymentCb?.state === 'OPEN'
            ? 'bg-rose-950/30 border-rose-500/50 glow-amber'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold">PAYMENT CIRCUIT</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              paymentCb?.state === 'CLOSED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : paymentCb?.state === 'HALF_OPEN'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
            }`}>
              {paymentCb?.state || 'CLOSED'}
            </span>
          </div>

          <div className="text-lg font-extrabold text-white">
            Payment Gateway Svc
          </div>

          <div className="text-[11px] text-slate-400 font-mono space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span>Failures / Threshold:</span>
              <span className="text-slate-200">{paymentCb?.consecutiveFailures} / {paymentCb?.failureThreshold || 3}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Requests Handled:</span>
              <span className="text-slate-200">{paymentCb?.totalRequests || 0}</span>
            </div>
          </div>

          {paymentCb?.state !== 'CLOSED' && (
            <button
              onClick={() => handleResetCircuitBreaker('payment')}
              className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs rounded-lg font-mono border border-slate-700"
            >
              Reset Circuit to CLOSED
            </button>
          )}
        </div>

        {/* Distributed Lock Manager Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold">CONCURRENCY SHIELD</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              ACTIVE
            </span>
          </div>

          <div className="text-lg font-extrabold text-white">
            Distributed Locks (TTL)
          </div>

          <div className="text-[11px] text-slate-400 font-mono space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span>Active Seat Reservations:</span>
              <span className="text-cyan-400 font-bold">{services.bookingSagaService?.activeDistributedLocks || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Race Condition Guard:</span>
              <span className="text-emerald-400">Atomic Lock</span>
            </div>
          </div>
        </div>

        {/* Event Bus Status */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-bold">MESSAGE BROKER</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              HEALTHY
            </span>
          </div>

          <div className="text-lg font-extrabold text-white">
            Pub/Sub Event Bus
          </div>

          <div className="text-[11px] text-slate-400 font-mono space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span>Logged Audit Events:</span>
              <span className="text-purple-400 font-bold">{services.eventBus?.totalLoggedEvents || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Dead Letter Queue (DLQ):</span>
              <span className={`font-bold ${services.eventBus?.dlqCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {services.eventBus?.dlqCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Chaos Engineering Playground */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Chaos Engineering & Fault Injection Playground</h2>
              <p className="text-xs text-slate-400">
                Simulate catastrophic server crashes, intermittent downstream failures, or network lag to verify system resilience.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fault 1: Payment Gateway Outage */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Kill Payment Gateway</span>
              <input
                type="checkbox"
                checked={chaosPaymentDead}
                onChange={(e) => {
                  const val = e.target.checked;
                  setChaosPaymentDead(val);
                  handleInjectFault('paymentService', { isDead: val });
                }}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Forces payment service to return HTTP 503. Test how Saga executes compensating rollback to release reserved seats!
            </p>
            <div className="text-[10px] font-mono text-rose-400">
              State: {chaosPaymentDead ? '⚠️ 503 OUTAGE INJECTED' : 'Normal'}
            </div>
          </div>

          {/* Fault 2: Dynamic Pricing Engine Outage */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Kill Pricing Engine</span>
              <input
                type="checkbox"
                checked={chaosPricingDead}
                onChange={(e) => {
                  const val = e.target.checked;
                  setChaosPricingDead(val);
                  handleInjectFault('pricingService', { isDead: val });
                }}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Forces pricing engine down. Observe how Circuit Breaker trips and provides safe Fallback base pricing without crashing booking flow!
            </p>
            <div className="text-[10px] font-mono text-amber-400">
              State: {chaosPricingDead ? '⚠️ ENGINE DOWN (FALLBACK ACTIVE)' : 'Normal'}
            </div>
          </div>

          {/* Fault 3: Network Latency */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Inject Service Latency</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">{chaosLatency}ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="2500"
              step="250"
              value={chaosLatency}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setChaosLatency(val);
                handleInjectFault('paymentService', { latencyMs: val });
                handleInjectFault('pricingService', { latencyMs: val });
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Simulates slow database queries or network congestion across microservices.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Live Event Bus Audit Feed & DLQ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Event Stream (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Live Event Bus Message Stream</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Topic subscriptions: wildcard (*)
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-xs pr-1">
            {recentEvents && recentEvents.length > 0 ? (
              recentEvents.map((evt) => {
                let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                if (evt.topic.includes('Confirmed') || evt.topic.includes('Registered')) {
                  badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                } else if (evt.topic.includes('Failed') || evt.topic.includes('StateChanged')) {
                  badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                } else if (evt.topic.includes('Lock')) {
                  badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                }

                return (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${badgeColor}`}>
                          {evt.topic}
                        </span>
                        <span className="text-slate-400 text-[11px]">source: {evt.source}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate max-w-md">
                        {JSON.stringify(evt.payload)}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex-shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500">
                No events streamed yet. Perform actions to see events populate in real time!
              </div>
            )}
          </div>
        </div>

        {/* Dead Letter Queue (DLQ) (1 Col) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Dead Letter Queue (DLQ)</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {deadLetterQueue?.length || 0} failed items
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {deadLetterQueue && deadLetterQueue.length > 0 ? (
              deadLetterQueue.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs font-mono space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400 font-bold">{item.event?.topic}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.failedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    Error: {item.error}
                  </div>

                  <button
                    onClick={() => handleReplayDLQ(item.event?.id)}
                    className="w-full py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-[11px] font-bold border border-rose-500/40 flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Replay Event to Bus</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs font-mono space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-40" />
                <p>Dead Letter Queue is empty.</p>
                <p className="text-[11px] text-slate-600">All published events successfully acknowledged by subscribers.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
