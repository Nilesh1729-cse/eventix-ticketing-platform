import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Key, Mail, User, ShieldCheck, X, Sparkles } from 'lucide-react';

export const AuthModal = () => {
  const { authModalOpen, setAuthModalOpen, login, register, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('');
  const [role, setRole] = useState('AUDIENCE');
  const [error, setError] = useState(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    let res;
    if (isRegister) {
      res = await register({ email, password, name, role });
    } else {
      res = await login(email, password);
    }

    if (!res.success) {
      setError(res.error);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setError(null);
    setEmail(demoEmail);
    setPassword('Password123!');
    const res = await login(demoEmail, 'Password123!');
    if (!res.success) {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            {isRegister ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isRegister ? 'Create Eventix Account' : 'Sign In to Eventix'}
            </h2>
            <p className="text-xs text-slate-400">
              Multi-terminal authentication enabled with token session tracking.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Quick Demo Login Buttons */}
        {!isRegister && (
          <div className="mb-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Quick Demo Accounts (One-Click Sign In)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('alex@eventix.io')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-600/20 border border-slate-700 hover:border-emerald-500 text-slate-200 text-center transition group"
              >
                <div className="text-xs font-semibold group-hover:text-emerald-300">Audience</div>
                <div className="text-[10px] text-slate-400 truncate">alex@</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('organizer@eventix.io')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-purple-600/20 border border-slate-700 hover:border-purple-500 text-slate-200 text-center transition group"
              >
                <div className="text-xs font-semibold group-hover:text-purple-300">Organizer</div>
                <div className="text-[10px] text-slate-400 truncate">organizer@</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@eventix.io')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600/20 border border-slate-700 hover:border-rose-500 text-slate-200 text-center transition group"
              >
                <div className="text-xs font-semibold group-hover:text-rose-300">Admin</div>
                <div className="text-[10px] text-slate-400 truncate">admin@</div>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Elena Rostova"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('AUDIENCE')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition ${
                    role === 'AUDIENCE'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Audience / Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ORGANIZER')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition ${
                    role === 'ORGANIZER'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Event Executor / Organizer
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Authenticate & Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 transition underline decoration-dotted"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register as Audience or Organizer"}
          </button>
        </div>
      </div>
    </div>
  );
};
