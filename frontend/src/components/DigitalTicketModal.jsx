import React from 'react';
import { Ticket, Calendar, MapPin, CheckCircle2, QrCode, Download, Printer, X, Sparkles } from 'lucide-react';

export const DigitalTicketModal = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-white text-center relative">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Booking Confirmed!</h2>
          <p className="text-xs text-emerald-100 font-mono">
            Ticket ID: {booking.ticketId}
          </p>
        </div>

        {/* Perforated Divider */}
        <div className="relative flex items-center justify-between px-3 py-1 bg-slate-900">
          <div className="w-6 h-6 rounded-full bg-slate-950 -ml-6 border-r border-slate-700" />
          <div className="flex-1 border-b-2 border-dashed border-slate-700 mx-2" />
          <div className="w-6 h-6 rounded-full bg-slate-950 -mr-6 border-l border-slate-700" />
        </div>

        {/* Ticket Details Body */}
        <div className="p-6 space-y-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold">
              Official Digital Pass
            </span>
            <h3 className="text-lg font-black text-white leading-snug">
              {booking.eventTitle}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-400">SEAT</div>
              <div className="text-lg font-black text-cyan-400">{booking.seatId}</div>
              <div className="text-[10px] text-slate-400">Row {booking.seatRow} • No. {booking.seatNumber}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">TIER</div>
              <div className="text-sm font-bold text-amber-400 uppercase">{booking.tierId}</div>
              <div className="text-[10px] text-slate-400">${booking.pricing?.finalPrice} Paid</div>
            </div>

            <div className="col-span-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(booking.eventDate).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{booking.venueName}, {booking.city}</span>
              </div>
            </div>
          </div>

          {/* QR Code / Barcode Simulation */}
          <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2">
            {/* SVG stylized QR code */}
            <div className="w-36 h-36 bg-slate-950 p-2 rounded-xl flex items-center justify-center">
              <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-white rounded">
                {Array.from({ length: 36 }).map((_, i) => {
                  const isBlack = (i % 2 === 0 && i % 3 !== 0) || i === 0 || i === 5 || i === 30 || i === 35 || i === 14;
                  return (
                    <div
                      key={i}
                      className={isBlack ? 'bg-black rounded-xs' : 'bg-white'}
                    />
                  );
                })}
              </div>
            </div>

            <div className="text-slate-900 font-mono text-[11px] font-bold tracking-widest text-center">
              {booking.ticketId}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono text-center">
            Issued to: {booking.user?.email} • Terminal: {booking.terminal?.terminalLabel}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handlePrint}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Pass
            </button>

            <button
              onClick={onClose}
              className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
