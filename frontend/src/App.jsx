import React, { useState, useEffect } from 'react';
import api from './api/client';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { EventCard } from './components/EventCard';
import { SeatMapVisualizer } from './components/SeatMapVisualizer';
import { CheckoutSagaModal } from './components/CheckoutSagaModal';
import { DigitalTicketModal } from './components/DigitalTicketModal';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { ResilienceConsole } from './components/ResilienceConsole';
import { MyTicketsView } from './components/MyTicketsView';
import { AuthModal } from './components/AuthModal';
import { TerminalSwitcherModal } from './components/TerminalSwitcherModal';
import { ActiveSessionsModal } from './components/ActiveSessionsModal';

import {
  Search,
  Filter,
  Sparkles,
  Music,
  Drama,
  Trophy,
  Layers,
  Radio,
  Bell
} from 'lucide-react';

export function App() {
  const { user } = useAuth();
  const { lastEvent } = useSocket();

  // Navigation State
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'tickets' | 'organizer' | 'resilience'
  const [selectedEvent, setSelectedEvent] = useState(null); // When viewing seat map

  // Event Catalog State
  const [events, setEvents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Checkout & Ticket Modals
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedSeatData, setSelectedSeatData] = useState(null); // { seat, quote }
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events', {
        params: {
          category: categoryFilter === 'ALL' ? undefined : categoryFilter,
          search: searchQuery || undefined
        }
      });
      setEvents(res.data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [categoryFilter, searchQuery]);

  // Toast listener when WebSocket sends high-priority events
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.topic === 'BookingConfirmed') {
      setToast(`🎟️ Ticket booked! Event: ${lastEvent.payload?.seatId} reserved.`);
      setTimeout(() => setToast(null), 4000);
      fetchEvents();
    } else if (lastEvent.topic === 'CircuitBreakerStateChanged') {
      setToast(`⚡ Circuit Breaker [${lastEvent.payload?.service}]: State -> ${lastEvent.payload?.newState}`);
      setTimeout(() => setToast(null), 5000);
    }
  }, [lastEvent]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const handleProceedToCheckout = ({ seat, quote }) => {
    setSelectedSeatData({ seat, quote });
    setCheckoutModalOpen(true);
  };

  const handleBookingSuccess = (booking) => {
    setCheckoutModalOpen(false);
    setActiveTicket(booking);
    setTicketModalOpen(true);
    setSelectedEvent(null);
    fetchEvents();
  };

  const handleViewTicketFromWallet = (booking) => {
    setActiveTicket(booking);
    setTicketModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 border border-emerald-500/50 text-emerald-300 shadow-2xl flex items-center gap-3 text-xs font-mono animate-bounce">
          <Bell className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Global Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedEvent(null);
      }} />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* If an event is selected, display the Interactive Seat Map Visualizer */}
        {selectedEvent ? (
          <SeatMapVisualizer
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onProceedToCheckout={handleProceedToCheckout}
          />
        ) : (
          <>
            {/* TAB 1: Events Discovery */}
            {activeTab === 'events' && (
              <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
                {/* Hero Banner */}
                <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 shadow-2xl">
                  <div className="max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Microservices & Event-Driven Engine v2.4</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                      Experience Live Events with <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">Real-Time Precision.</span>
                    </h1>

                    <p className="text-sm text-slate-400 leading-relaxed font-normal">
                      Discover premier concerts, theatrical Broadway productions, and championship sporting showdowns. Featuring algorithmic dynamic pricing, multi-terminal session mobility, and fault-tolerant booking pipelines.
                    </p>
                  </div>
                </div>

                {/* Filters & Search Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setCategoryFilter('ALL')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        categoryFilter === 'ALL'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Events</span>
                    </button>

                    <button
                      onClick={() => setCategoryFilter('CONCERT')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        categoryFilter === 'CONCERT'
                          ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>Concerts</span>
                    </button>

                    <button
                      onClick={() => setCategoryFilter('THEATER')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        categoryFilter === 'THEATER'
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Drama className="w-3.5 h-3.5" />
                      <span>Theaters</span>
                    </button>

                    <button
                      onClick={() => setCategoryFilter('SPORTING_EVENT')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        categoryFilter === 'SPORTING_EVENT'
                          ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Sporting Events</span>
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search events, venues, cities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Event Cards Grid */}
                {loadingEvents ? (
                  <div className="py-20 text-center text-slate-400 font-mono text-sm">
                    Querying catalog microservice...
                  </div>
                ) : events.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-sm">
                    No events match your criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((evt) => (
                      <EventCard
                        key={evt.id}
                        event={evt}
                        onSelectEvent={handleSelectEvent}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: My Tickets Wallet */}
            {activeTab === 'tickets' && (
              <MyTicketsView onViewTicket={handleViewTicketFromWallet} />
            )}

            {/* TAB 3: Organizer Portal & Telemetry */}
            {activeTab === 'organizer' && (
              <OrganizerDashboard />
            )}

            {/* TAB 4: Resilience & Chaos Console */}
            {activeTab === 'resilience' && (
              <ResilienceConsole />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <AuthModal />
      <TerminalSwitcherModal />
      <ActiveSessionsModal />

      {/* Saga Checkout Modal */}
      {checkoutModalOpen && selectedSeatData && (
        <CheckoutSagaModal
          event={selectedEvent}
          seat={selectedSeatData.seat}
          quote={selectedSeatData.quote}
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Digital Ticket Modal */}
      {ticketModalOpen && activeTicket && (
        <DigitalTicketModal
          booking={activeTicket}
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
        />
      )}
    </div>
  );
}
