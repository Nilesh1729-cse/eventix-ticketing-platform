import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  Plus,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight,
  Sliders,
  AlertCircle
} from 'lucide-react';

export const OrganizerDashboard = () => {
  const { user, setAuthModalOpen } = useAuth();
  const { lastEvent } = useSocket();

  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventAnalytics, setEventAnalytics] = useState(null);
  const [pricingRules, setPricingRules] = useState(null);
  const [savingRules, setSavingRules] = useState(false);
  const [ruleSaveSuccess, setRuleSaveSuccess] = useState(false);

  // New Event Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: 'CONCERT',
    venueName: '',
    city: 'San Francisco, CA',
    date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 16),
    description: '',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80'
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Fetch Platform Overview & Events
  const fetchData = async () => {
    try {
      const [overviewRes, eventsRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/events')
      ]);
      setOverview(overviewRes.data);
      setEvents(eventsRes.data);
      if (!selectedEventId && eventsRes.data.length > 0) {
        setSelectedEventId(eventsRes.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  // Fetch Event-specific analytics & pricing rules
  const fetchEventDetails = async (eventId) => {
    if (!eventId) return;
    try {
      const [analyticsRes, rulesRes] = await Promise.all([
        api.get(`/analytics/event/${eventId}`),
        api.get(`/pricing/rules/${eventId}`)
      ]);
      setEventAnalytics(analyticsRes.data);
      setPricingRules(rulesRes.data);
    } catch (err) {
      console.error('Error fetching event telemetry:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventDetails(selectedEventId);
    }
  }, [selectedEventId]);

  // Reactively refresh analytics if new booking or price update arrives
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.topic === 'BookingConfirmed' || lastEvent.topic === 'PricingRulesUpdated') {
      fetchData();
      if (selectedEventId) fetchEventDetails(selectedEventId);
    }
  }, [lastEvent]);

  const handleSavePricingRules = async (e) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setSavingRules(true);
    setRuleSaveSuccess(false);
    try {
      await api.put(`/pricing/rules/${selectedEventId}`, pricingRules);
      setRuleSaveSuccess(true);
      setTimeout(() => setRuleSaveSuccess(false), 3000);
      await fetchEventDetails(selectedEventId);
    } catch (err) {
      alert('Error updating pricing policies: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingRules(false);
    }
  };

  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setCreateLoading(true);
    try {
      const res = await api.post('/events', newEvent);
      setShowCreateModal(false);
      await fetchData();
      setSelectedEventId(res.data.id);
      alert('🎉 Event created successfully with tiered seating and dynamic pricing!');
    } catch (err) {
      alert('Failed to create event: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Organizer Portal & Telemetry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold">
              Event-Executor Suite
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time sales velocity, revenue yield optimization, and dynamic pricing policy manager.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              setAuthModalOpen(true);
              return;
            }
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Overview Analytics Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Revenue */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>GROSS REVENUE</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              ${overview.totalRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              From {overview.totalTicketsSold} tickets across {overview.totalEvents} events
            </div>
          </div>

          {/* Card 2: Dynamic Pricing Yield */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/30 shadow-xl space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
            <div className="flex items-center justify-between text-purple-300 text-xs font-mono font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                DYNAMIC PRICING YIELD
              </span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-300">
              +${overview.dynamicPricingYield.toLocaleString()}
            </div>
            <div className="text-[11px] text-purple-400 font-mono flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{overview.yieldPercentage}% extra revenue captured vs flat rates</span>
            </div>
          </div>

          {/* Card 3: Total Tickets Sold */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>TICKETS SOLD</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {overview.totalTicketsSold}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Global audience purchases
            </div>
          </div>

          {/* Card 4: Active Terminals */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>ACTIVE USER TERMINALS</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {overview.activeSessionsCount}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono">
              Concurrent physical machines logged in
            </div>
          </div>
        </div>
      )}

      {/* Event Selector Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200">
            Select Event for Telemetry & Dynamic Policy Configuration:
          </h2>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {events.map((evt) => (
            <button
              key={evt.id}
              onClick={() => setSelectedEventId(evt.id)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono whitespace-nowrap transition flex items-center gap-2 ${
                selectedEventId === evt.id
                  ? 'bg-purple-600/20 border-purple-500 text-white font-bold shadow-md shadow-purple-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>{evt.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Event Analytics (Left) & Dynamic Pricing Policy Configurator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Detailed Analytics for Selected Event */}
        {eventAnalytics && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider font-semibold">
                  Event Telemetry
                </span>
                <h3 className="text-lg font-black text-white">{eventAnalytics.title}</h3>
                <div className="text-xs text-slate-400 font-mono">{eventAnalytics.venueName}</div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 font-mono">Occupancy</div>
                <div className="text-xl font-extrabold text-emerald-400">
                  {eventAnalytics.occupancy?.occupancyRate}%
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400">TOTAL EVENT REVENUE</div>
                <div className="text-lg font-black text-white mt-0.5">
                  ${eventAnalytics.financials?.totalRevenue.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl">
                <div className="text-[10px] font-mono text-purple-300">DYNAMIC SURGE YIELD</div>
                <div className="text-lg font-black text-purple-300 mt-0.5">
                  +${eventAnalytics.financials?.dynamicYield.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Tier-by-Tier Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Tier Breakdown & Capacity:
              </h4>

              <div className="space-y-2">
                {Object.entries(eventAnalytics.tierStats || {}).map(([key, stat]) => (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-semibold text-white">{stat.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {stat.soldSeats} / {stat.totalSeats} seats sold ({stat.occupancyRate}%)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-emerald-400">${stat.revenue}</div>
                      <div className="w-20 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${stat.occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right: Dynamic Pricing Policy Engine Editor */}
        {pricingRules && (
          <form
            onSubmit={handleSavePricingRules}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dynamic Pricing Engine Config</h3>
                  <p className="text-xs text-slate-400">Tweak real-time pricing algorithms for this event</p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                <span className={pricingRules.enabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {pricingRules.enabled ? 'ACTIVE' : 'DISABLED'}
                </span>
                <input
                  type="checkbox"
                  checked={pricingRules.enabled}
                  onChange={(e) => setPricingRules({ ...pricingRules, enabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                />
              </label>
            </div>

            {/* Policy 1: Demand / Scarcity Surge */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  Demand / Scarcity Surge
                </span>
                <input
                  type="checkbox"
                  checked={pricingRules.demandSurge?.enabled}
                  onChange={(e) =>
                    setPricingRules({
                      ...pricingRules,
                      demandSurge: { ...pricingRules.demandSurge, enabled: e.target.checked }
                    })
                  }
                  className="w-3.5 h-3.5 accent-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Surge at 70% Capacity</label>
                  <input
                    type="number"
                    step="0.05"
                    value={pricingRules.demandSurge?.threshold70Percent}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        demandSurge: {
                          ...pricingRules.demandSurge,
                          threshold70Percent: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Surge at 90% Capacity</label>
                  <input
                    type="number"
                    step="0.05"
                    value={pricingRules.demandSurge?.threshold90Percent}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        demandSurge: {
                          ...pricingRules.demandSurge,
                          threshold90Percent: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Policy 2: Time Decay (Early Bird vs Last Minute) */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Time Decay & Early Bird
                </span>
                <input
                  type="checkbox"
                  checked={pricingRules.timeDecay?.enabled}
                  onChange={(e) =>
                    setPricingRules({
                      ...pricingRules,
                      timeDecay: { ...pricingRules.timeDecay, enabled: e.target.checked }
                    })
                  }
                  className="w-3.5 h-3.5 accent-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Early Bird Discount (Rate)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={pricingRules.timeDecay?.earlyBirdDiscount}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        timeDecay: {
                          ...pricingRules.timeDecay,
                          earlyBirdDiscount: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Last-Minute Surge (Rate)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={pricingRules.timeDecay?.lastMinuteSurge}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        timeDecay: {
                          ...pricingRules.timeDecay,
                          lastMinuteSurge: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Policy 3: Velocity Surge */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Sales Velocity Spike Surge
                </span>
                <input
                  type="checkbox"
                  checked={pricingRules.velocitySurge?.enabled}
                  onChange={(e) =>
                    setPricingRules({
                      ...pricingRules,
                      velocitySurge: { ...pricingRules.velocitySurge, enabled: e.target.checked }
                    })
                  }
                  className="w-3.5 h-3.5 accent-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Threshold Purchases (in 10m)</label>
                  <input
                    type="number"
                    value={pricingRules.velocitySurge?.thresholdPurchases}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        velocitySurge: {
                          ...pricingRules.velocitySurge,
                          thresholdPurchases: parseInt(e.target.value)
                        }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Surge Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    value={pricingRules.velocitySurge?.surgeMultiplier}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        velocitySurge: {
                          ...pricingRules.velocitySurge,
                          surgeMultiplier: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingRules}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition active:scale-95"
            >
              {savingRules ? (
                'Saving Policies...'
              ) : ruleSaveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Policies Updated Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Apply Dynamic Pricing Policies</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Create New Event Wizard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Event</h3>

            <form onSubmit={handleCreateEventSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electric Cyberpunk Symphony"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="CONCERT">Concert</option>
                    <option value="THEATER">Theater</option>
                    <option value="SPORTING_EVENT">Sporting Event</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Venue Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Grand Arena"
                    value={newEvent.venueName}
                    onChange={(e) => setNewEvent({ ...newEvent, venueName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="San Francisco, CA"
                    value={newEvent.city}
                    onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event highlights and artist details..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg"
                >
                  {createLoading ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
