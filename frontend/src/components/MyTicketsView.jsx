import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, MapPin, QrCode, ArrowRight, ExternalLink } from 'lucide-react';

export const MyTicketsView = ({ onViewTicket }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get('/bookings/my-bookings');
        setBookings(res.data);
      } catch (err) {
        console.error('Error fetching tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookings();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 font-mono text-sm">
        Retrieving your digital ticket wallet...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
          <Ticket className="w-7 h-7 text-emerald-400" />
          <span>My Ticket Wallet</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Digital tickets issued to <span className="text-emerald-400">{user?.email}</span>
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Tickets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't purchased any tickets yet. Explore concerts, theaters, and sporting events to book your seat!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((b) => (
            <div
              key={b.bookingId}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-emerald-400 font-bold tracking-wider">{b.ticketId}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    CONFIRMED
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                  {b.eventTitle}
                </h3>

                <div className="space-y-1 text-xs text-slate-400 font-mono mt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(b.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{b.venueName}, {b.city}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500">ASSIGNED SEAT</span>
                    <div className="text-base font-black text-cyan-400">Seat {b.seatId}</div>
                    <div className="text-[10px] text-slate-400">Row {b.seatRow} • No. {b.seatNumber}</div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500">PAID</span>
                    <div className="text-base font-black text-white">${b.pricing?.finalPrice}</div>
                    <div className="text-[10px] text-emerald-400 uppercase">{b.tierId} Tier</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  From: {b.terminal?.terminalLabel}
                </span>

                <button
                  onClick={() => onViewTicket(b)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Show Pass</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
