import React from 'react';
import { Calendar, MapPin, Users, Sparkles, TrendingUp, Music, Drama, Trophy, ArrowRight } from 'lucide-react';

export const EventCard = ({ event, onSelectEvent }) => {
  const getCategoryBadge = (category) => {
    switch (category) {
      case 'CONCERT':
        return {
          label: 'Concert',
          icon: Music,
          className: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
        };
      case 'THEATER':
        return {
          label: 'Theater',
          icon: Drama,
          className: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        };
      case 'SPORTING_EVENT':
        return {
          label: 'Sporting Event',
          icon: Trophy,
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
      default:
        return {
          label: category,
          icon: Music,
          className: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
        };
    }
  };

  const badge = getCategoryBadge(event.category);
  const Icon = badge.icon;
  const occupancy = event.stats?.occupancyRate || 0;

  // Determine dynamic badge
  let dynamicStatus = null;
  if (occupancy >= 70) {
    dynamicStatus = { text: '🔥 High Demand Surge', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  } else {
    const days = (new Date(event.date).getTime() - Date.now()) / (1000 * 3600 * 24);
    if (days >= 7) {
      dynamicStatus = { text: '⚡ Early-Bird Rate Active', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition duration-300 flex flex-col group hover:shadow-xl hover:shadow-slate-900/50">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-950">
        <img
          src={event.bannerUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold backdrop-blur-md shadow-md ${badge.className}">
          <Icon className="w-3.5 h-3.5" />
          <span>{badge.label}</span>
        </div>

        {/* Dynamic Pricing Tag */}
        {dynamicStatus && (
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold backdrop-blur-md ${dynamicStatus.color}`}>
            {dynamicStatus.text}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition mb-2 line-clamp-1">
            {event.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 mb-4">
            {event.description}
          </p>

          <div className="space-y-1.5 text-xs text-slate-300 font-mono mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{event.venueName} • {event.city}</span>
            </div>
          </div>

          {/* Occupancy Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Capacity Occupancy
              </span>
              <span className="text-white font-semibold">{occupancy}% Sold</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancy >= 90 ? 'bg-rose-500' : occupancy >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${occupancy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
              Tickets From
            </span>
            <div className="text-xl font-extrabold text-white">
              ${event.startingFromPrice}
              <span className="text-xs text-slate-400 font-normal ml-1 font-mono">base</span>
            </div>
          </div>

          <button
            onClick={() => onSelectEvent(event)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition active:scale-95 group/btn"
          >
            <span>View Seats</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
