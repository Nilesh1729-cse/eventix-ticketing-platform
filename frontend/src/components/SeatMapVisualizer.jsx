import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Sparkles,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Info,
  ArrowLeft,
  ShoppingBag
} from 'lucide-react';

export const SeatMapVisualizer = ({ event, onBack, onProceedToCheckout }) => {
  const { user, terminal, setAuthModalOpen } = useAuth();
  const { lastEvent } = useSocket();

  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [priceQuote, setPriceQuote] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [holdingSeat, setHoldingSeat] = useState(false);
  const [error, setError] = useState(null);

  // Fetch seats on load or when an event bus lock/booking event occurs
  const fetchSeats = async () => {
    try {
      const res = await api.get(`/events/${event.id}/seats`);
      setSeats(res.data);
      setLoadingSeats(false);
    } catch (err) {
      console.error('Error fetching seats:', err);
      setError('Failed to load venue seat layout.');
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, [event.id]);

  // Reactively update seat map when WebSocket notifies of any lock/booking change
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.topic === 'SeatLockAcquired' ||
      lastEvent.topic === 'SeatLockReleased' ||
      lastEvent.topic === 'SeatLockExpired' ||
      lastEvent.topic === 'BookingConfirmed'
    ) {
      fetchSeats();
    }
  }, [lastEvent]);

  // When a seat is clicked
  const handleSeatClick = async (seat) => {
    if (seat.status === 'SOLD') return;
    if (seat.status === 'HELD' && !seat.lockDetails?.isHeldByCurrentUser) {
      setError(`Seat ${seat.id} is held by another machine/terminal (${seat.lockDetails?.terminalLabel || 'Session'}).`);
      return;
    }

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setError(null);
    setSelectedSeat(seat);
    setHoldingSeat(true);

    try {
      // 1. Acquire distributed reservation lock for this terminal
      await api.post('/bookings/hold', {
        eventId: event.id,
        seatId: seat.id,
        terminalLabel: terminal.terminalLabel
      });

      // 2. Fetch real-time dynamic pricing quote
      const quoteRes = await api.get('/pricing/quote', {
        params: { eventId: event.id, seatId: seat.id }
      });
      setPriceQuote(quoteRes.data);
      await fetchSeats();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSelectedSeat(null);
    } finally {
      setHoldingSeat(false);
    }
  };

  const getTierColor = (tierId) => {
    switch (tierId) {
      case 'vip':
        return { bg: 'bg-amber-500', hover: 'hover:bg-amber-400', border: 'border-amber-400', label: 'VIP Front Row' };
      case 'platinum':
        return { bg: 'bg-purple-500', hover: 'hover:bg-purple-400', border: 'border-purple-400', label: 'Platinum' };
      case 'gold':
        return { bg: 'bg-blue-500', hover: 'hover:bg-blue-400', border: 'border-blue-400', label: 'Gold' };
      default:
        return { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-400', border: 'border-emerald-400', label: 'Standard' };
    }
  };

  // Group seats by row
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>{event.title}</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {event.venueName} • {event.city} • {new Date(event.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Live Concurrency Info */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-Time Distributed Lock & Dynamic Pricing Active</span>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visual Seating Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Stage / Field Visualizer */}
          <div className="w-full mb-8">
            <div className="w-full max-w-md mx-auto py-3 bg-gradient-to-r from-cyan-600/30 via-emerald-600/40 to-cyan-600/30 border-b-2 border-emerald-400/80 rounded-t-3xl text-center shadow-lg shadow-emerald-500/10">
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-300 uppercase">
                {event.category === 'SPORTING_EVENT' ? '⚽ MAIN COURT / PLAYING PITCH' : '🎭 STAGE / ORCHESTRA PIT'}
              </span>
            </div>
            <div className="w-full max-w-xs mx-auto h-2 bg-slate-800/60 rounded-full mt-1" />
          </div>

          {/* Seat Grid */}
          {loadingSeats ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Loading venue geometry and active seat locks...
            </div>
          ) : (
            <div className="space-y-3 max-w-xl mx-auto">
              {rows.map((row) => {
                const rowSeats = seats.filter((s) => s.row === row);
                return (
                  <div key={row} className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span className="w-5 text-xs font-mono font-bold text-slate-500 text-center">
                      {row}
                    </span>

                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {rowSeats.map((seat) => {
                        const isSelected = selectedSeat?.id === seat.id;
                        const isSold = seat.status === 'SOLD';
                        const isHeld = seat.status === 'HELD';
                        const isHeldByMe = seat.lockDetails?.isHeldByCurrentUser;
                        const tier = getTierColor(seat.tierId);

                        let seatStyles = '';
                        if (isSelected || isHeldByMe) {
                          seatStyles = 'bg-cyan-500 text-white ring-2 ring-cyan-300 scale-110 z-10 shadow-lg shadow-cyan-500/50';
                        } else if (isSold) {
                          seatStyles = 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50';
                        } else if (isHeld) {
                          seatStyles = 'bg-amber-600/80 text-white cursor-not-allowed animate-pulse border border-amber-400';
                        } else {
                          seatStyles = `${tier.bg} ${tier.hover} text-white hover:scale-110 cursor-pointer shadow-sm`;
                        }

                        return (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            disabled={isSold || (isHeld && !isHeldByMe)}
                            title={`Seat ${seat.id} (${seat.tierId.toUpperCase()}) - Status: ${seat.status}${
                              isHeld ? ` (Held by ${seat.lockDetails?.terminalLabel || 'another user'})` : ''
                            }`}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] font-mono font-bold transition-all duration-200 flex items-center justify-center relative ${seatStyles}`}
                          >
                            {isSold ? (
                              <Lock className="w-3 h-3 text-slate-500" />
                            ) : isHeld && !isHeldByMe ? (
                              <Clock className="w-3 h-3 text-white" />
                            ) : (
                              seat.number
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <span className="w-5 text-xs font-mono font-bold text-slate-500 text-center">
                      {row}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-amber-500" />
              <span className="text-slate-300">VIP Row A</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-purple-500" />
              <span className="text-slate-300">Platinum B-C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-blue-500" />
              <span className="text-slate-300">Gold D-E</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
              <span className="text-slate-300">Standard F</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-amber-600 animate-pulse" />
              <span className="text-slate-300">Held / In Cart</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                <Lock className="w-2 h-2" />
              </div>
              <span className="text-slate-400">Sold</span>
            </div>
          </div>
        </div>

        {/* Dynamic Pricing & Reservation Panel (1 Col) */}
        <div className="space-y-4">
          {selectedSeat && priceQuote ? (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                    Seat Selected
                  </span>
                  <div className="text-2xl font-black text-white">
                    Seat {selectedSeat.id}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Tier: {selectedSeat.tierId.toUpperCase()} • Row {selectedSeat.row}
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Lock TTL: 5:00</span>
                </div>
              </div>

              {/* Dynamic Pricing Itemized Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 font-mono text-xs">
                <div className="text-slate-300 font-bold flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Real-Time Dynamic Pricing Breakdown</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Base Tier Price:</span>
                  <span className="text-white">${priceQuote.breakdown.base.toFixed(2)}</span>
                </div>

                {priceQuote.breakdown.demandSurge !== 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Demand / Scarcity Surge:</span>
                    <span>+${priceQuote.breakdown.demandSurge.toFixed(2)}</span>
                  </div>
                )}

                {priceQuote.breakdown.timeAdjustment < 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Early-Bird Discount:</span>
                    <span>-${Math.abs(priceQuote.breakdown.timeAdjustment).toFixed(2)}</span>
                  </div>
                )}

                {priceQuote.breakdown.timeAdjustment > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Last-Minute Rush Surge:</span>
                    <span>+${priceQuote.breakdown.timeAdjustment.toFixed(2)}</span>
                  </div>
                )}

                {priceQuote.breakdown.velocitySurge > 0 && (
                  <div className="flex justify-between text-cyan-400">
                    <span>Sales Velocity Surge:</span>
                    <span>+${priceQuote.breakdown.velocitySurge.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                  <span className="text-white">Total Dynamic Price:</span>
                  <span className="text-emerald-400 text-base font-extrabold">
                    ${priceQuote.finalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Policy Explanation Bullets */}
              <div className="space-y-1 text-[11px] text-slate-400">
                {priceQuote.reasons?.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <Info className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onProceedToCheckout({ seat: selectedSeat, quote: priceQuote })}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Lock Price & Proceed to Checkout</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Select an Available Seat</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click any seat on the venue map to inspect real-time dynamic pricing, freeze the rate, and hold your reservation.
              </p>
            </div>
          )}

          {/* Machine / Concurrency Note */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Machine Concurrency Shield</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When you select a seat, a distributed lock prevents other users or terminals from double-booking it for 5 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
