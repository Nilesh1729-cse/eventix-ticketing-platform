import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Ticket,
  Laptop,
  Users,
  BarChart3,
  ShieldAlert,
  LogIn,
  LogOut,
  Sparkles,
  Layers,
  Radio
} from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const {
    user,
    logout,
    terminal,
    activeSessions,
    setAuthModalOpen,
    setSessionsModalOpen,
    setTerminalModalOpen
  } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Multi-Terminal & System Telemetry Top Ribbon */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Radio className={`w-3.5 h-3.5 ${connected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className="font-mono font-medium">
              Event Bus: {connected ? 'LIVE STREAM' : 'DISCONNECTED'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Current Physical Machine / Terminal Fingerprint */}
          <button
            onClick={() => setTerminalModalOpen(true)}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono transition group"
            title="Click to switch simulated machine/terminal"
          >
            <Laptop className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold underline decoration-dotted">
              Terminal: {terminal.terminalLabel} ({terminal.terminalId})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => setSessionsModalOpen(true)}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{activeSessions.length || 1} Active Terminals / Devices</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 font-mono">
            <span className="text-slate-400">Arch:</span>
            <span className="text-indigo-400 font-medium">Event-Driven Microservices</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab('events')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  EVENTIX
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono font-semibold">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-1 font-mono">Resilient Ticketing Platform</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'events'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Event Discovery
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('tickets')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  activeTab === 'tickets'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Ticket className="w-4 h-4" />
                My Tickets
              </button>
            )}

            <button
              onClick={() => setActiveTab('organizer')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'organizer'
                  ? 'bg-slate-800 text-purple-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Organizer Portal & Analytics
            </button>

            <button
              onClick={() => setActiveTab('resilience')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'resilience'
                  ? 'bg-slate-800 text-rose-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Resilience & Chaos Console
            </button>
          </nav>
        </div>

        {/* User Auth Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 justify-end">
                  <span>{user.name}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded font-bold ${
                    user.role === 'ORGANIZER'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : user.role === 'ADMIN'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">{user.email}</div>
              </div>

              <button
                onClick={logout}
                title="Logout from this device"
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition transform active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
