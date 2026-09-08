import React, { createContext, useContext, useState, useEffect } from 'react';
import api, {
  getActiveTerminal,
  setActiveTerminal,
  getTerminalToken,
  setTerminalToken,
  removeTerminalToken
} from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [terminal, setTerminal] = useState(getActiveTerminal);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(`eventix_user_${terminal.terminalId}`) || localStorage.getItem('eventix_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => getTerminalToken(terminal.terminalId));
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [terminalModalOpen, setTerminalModalOpen] = useState(false);

  useEffect(() => {
    const handleRevoked = (e) => {
      setUser(null);
      setToken(null);
      alert(`⚠️ Your session on ${terminal.terminalLabel} (${terminal.terminalId}) has been revoked remotely or expired.`);
    };
    window.addEventListener('eventix_session_revoked', handleRevoked);
    return () => window.removeEventListener('eventix_session_revoked', handleRevoked);
  }, [terminal]);

  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [token, terminal.terminalId]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/auth/sessions');
      setActiveSessions(res.data.sessions || []);
    } catch (err) {
      console.warn('Could not fetch sessions:', err.message);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        terminalId: terminal.terminalId,
        terminalLabel: terminal.terminalLabel
      });

      setTerminalToken(terminal.terminalId, res.data.token, res.data.user);
      setUser(res.data.user);
      setToken(res.data.token);
      setAuthModalOpen(false);
      await fetchSessions();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ email, password, name, role = 'AUDIENCE' }) => {
    setLoading(true);
    try {
      await api.post('/auth/register', { email, password, name, role });
      return await login(email, password);
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const logout = () => {
    removeTerminalToken(terminal.terminalId);
    setUser(null);
    setToken(null);
    setActiveSessions([]);
  };

  const switchTerminal = (newId, newLabel) => {
    setActiveTerminal(newId, newLabel);
    setTerminal({ terminalId: newId, terminalLabel: newLabel });

    // Load credentials stored for this specific terminal (if any)
    const savedToken = getTerminalToken(newId);
    const savedUserStr = localStorage.getItem(`eventix_user_${newId}`);
    const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

    setToken(savedToken);
    setUser(savedUser);
  };

  const revokeRemoteSession = async (sessionId) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      await fetchSessions();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      await api.post('/auth/sessions/revoke-others');
      await fetchSessions();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        terminal,
        activeSessions,
        loading,
        authModalOpen,
        sessionsModalOpen,
        terminalModalOpen,
        setAuthModalOpen,
        setSessionsModalOpen,
        setTerminalModalOpen,
        login,
        register,
        logout,
        switchTerminal,
        fetchSessions,
        revokeRemoteSession,
        revokeAllOtherSessions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
