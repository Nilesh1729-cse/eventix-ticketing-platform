import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Laptop, Trash2, Shield, X, AlertTriangle } from 'lucide-react';

export const ActiveSessionsModal = () => {
  const {
    user,
    terminal,
    activeSessions,
    sessionsModalOpen,
    setSessionsModalOpen,
    revokeRemoteSession,
    revokeAllOtherSessions
  } = useAuth();

  if (!sessionsModalOpen) return null;

  const handleRevoke = async (sessionId) => {
    if (window.confirm('Are you sure you want to terminate this remote terminal session?')) {
      await revokeRemoteSession(sessionId);
    }
  };

  const handleRevokeOthers = async () => {
    if (window.confirm('Log out of all other physical devices and terminals except this one?')) {
      await revokeAllOtherSessions();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        <button
          onClick={() => setSessionsModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Multi-Terminal Active Sessions</h2>
            <p className="text-xs text-slate-400">
              Account: <span className="text-emerald-400 font-mono">{user?.email}</span> — Terminals currently authenticated.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{activeSessions.length}</strong> active device connection{activeSessions.length === 1 ? '' : 's'}.
          </span>
          {activeSessions.length > 1 && (
            <button
              onClick={handleRevokeOthers}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Revoke All Other Devices
            </button>
          )}
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {activeSessions.map((sess) => {
            const isCurrentTerminal = sess.terminalId === terminal.terminalId;
            return (
              <div
                key={sess.sessionId}
                className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                  isCurrentTerminal
                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${isCurrentTerminal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {sess.terminalLabel}
                      </span>
                      {isCurrentTerminal && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded-full border border-emerald-500/30">
                          This Device
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 font-mono mt-1 space-x-2">
                      <span>IP: {sess.clientIp}</span>
                      <span>•</span>
                      <span>Terminal: {sess.terminalId}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">
                      Logged in: {new Date(sess.loginTime).toLocaleString()}
                    </div>
                  </div>
                </div>

                {!isCurrentTerminal && (
                  <button
                    onClick={() => handleRevoke(sess.sessionId)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/30 transition"
                    title="Terminate this terminal session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {activeSessions.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">
              No active sessions recorded.
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => setSessionsModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
