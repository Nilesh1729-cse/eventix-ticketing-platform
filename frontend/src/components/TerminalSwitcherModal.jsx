import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Laptop, Smartphone, Monitor, Building2, Check, Plus, X } from 'lucide-react';

export const TerminalSwitcherModal = () => {
  const { terminal, switchTerminal, terminalModalOpen, setTerminalModalOpen } = useAuth();
  const [customId, setCustomId] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  if (!terminalModalOpen) return null;

  const presetTerminals = [
    {
      id: 'term-win-desktop-01',
      label: 'Office Workstation (Win 11 Desktop)',
      icon: Monitor,
      desc: 'Local high-performance workstation'
    },
    {
      id: 'term-mac-laptop-02',
      label: 'Home Laptop (MacBook Pro M3)',
      icon: Laptop,
      desc: 'Remote personal machine'
    },
    {
      id: 'term-ios-mobile-03',
      label: 'iPhone Mobile Client (iOS Safari)',
      icon: Smartphone,
      desc: 'Mobile terminal for on-the-go booking'
    },
    {
      id: 'term-kiosk-boxoffice-04',
      label: 'Box-Office Kiosk Terminal #4',
      icon: Building2,
      desc: 'On-site venue box office terminal'
    }
  ];

  const handleSelect = (id, label) => {
    switchTerminal(id, label);
    setTerminalModalOpen(false);
  };

  const handleCustomAdd = (e) => {
    e.preventDefault();
    if (!customLabel) return;
    const genId = customId || `term-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    switchTerminal(genId, customLabel);
    setTerminalModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={() => setTerminalModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Physical Machine & Terminal Simulator</h2>
            <p className="text-xs text-slate-400">
              Simulate accessing Eventix from different physical devices, terminals, and locations.
            </p>
          </div>
        </div>

        {/* Current Active Terminal Card */}
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-semibold">
              Currently Emulated Terminal
            </span>
            <div className="font-medium text-white text-sm">{terminal.terminalLabel}</div>
            <div className="text-xs text-slate-400 font-mono">ID: {terminal.terminalId}</div>
          </div>
          <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded-full border border-cyan-500/40 font-mono font-medium">
            Active Now
          </span>
        </div>

        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Select Physical Terminal Profile:
        </div>

        <div className="space-y-2 mb-6">
          {presetTerminals.map((item) => {
            const Icon = item.icon;
            const isSelected = terminal.terminalId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id, item.label)}
                className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-slate-400 font-mono">{item.id} • {item.desc}</div>
                  </div>
                </div>

                {isSelected && (
                  <span className="p-1 bg-emerald-500 text-white rounded-full">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Terminal Creator */}
        <form onSubmit={handleCustomAdd} className="pt-4 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Or Define Custom Physical Machine:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input
              type="text"
              placeholder="Machine Label (e.g. iPad Pro)"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Terminal ID (optional)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={!customLabel}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Switch to Custom Terminal
          </button>
        </form>
      </div>
    </div>
  );
};
