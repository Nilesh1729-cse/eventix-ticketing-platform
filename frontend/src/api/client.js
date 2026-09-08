import axios from 'axios';

// Get or initialize persistent simulated terminal identity
export const getActiveTerminal = () => {
  let terminalId = localStorage.getItem('eventix_current_terminal_id');
  let terminalLabel = localStorage.getItem('eventix_current_terminal_label');

  if (!terminalId) {
    terminalId = 'term-win-desktop-01';
    terminalLabel = 'Office Workstation (Win 11 Desktop)';
    localStorage.setItem('eventix_current_terminal_id', terminalId);
    localStorage.setItem('eventix_current_terminal_label', terminalLabel);
  }

  return { terminalId, terminalLabel };
};

export const setActiveTerminal = (terminalId, terminalLabel) => {
  localStorage.setItem('eventix_current_terminal_id', terminalId);
  localStorage.setItem('eventix_current_terminal_label', terminalLabel);
};

export const getTerminalToken = (terminalId) => {
  return localStorage.getItem(`eventix_token_${terminalId}`) || localStorage.getItem('eventix_token') || null;
};

export const setTerminalToken = (terminalId, token, user) => {
  localStorage.setItem(`eventix_token_${terminalId}`, token);
  localStorage.setItem(`eventix_user_${terminalId}`, JSON.stringify(user));
  // Also keep general token in sync
  localStorage.setItem('eventix_token', token);
  localStorage.setItem('eventix_user', JSON.stringify(user));
};

export const removeTerminalToken = (terminalId) => {
  localStorage.removeItem(`eventix_token_${terminalId}`);
  localStorage.removeItem(`eventix_user_${terminalId}`);
  localStorage.removeItem('eventix_token');
  localStorage.removeItem('eventix_user');
};

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to dynamically inject auth token and terminal headers
api.interceptors.request.use((config) => {
  const { terminalId, terminalLabel } = getActiveTerminal();
  const token = getTerminalToken(terminalId);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Terminal-Id'] = terminalId;
  config.headers['X-Terminal-Label'] = terminalLabel;

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to catch 401 unauth or session revocations
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const { terminalId } = getActiveTerminal();
      removeTerminalToken(terminalId);
      window.dispatchEvent(new CustomEvent('eventix_session_revoked', { detail: { terminalId } }));
    }
    return Promise.reject(error);
  }
);

export default api;
