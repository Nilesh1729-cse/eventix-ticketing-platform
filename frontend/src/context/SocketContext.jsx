import React, { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // During Vite dev, connects to localhost:5000 directly or via proxy
    const wsUrl = `${protocol}//${window.location.hostname}:5000`;

    let ws;
    let reconnectTimer;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setConnected(true);
          console.log('[WS] Connected to Eventix Real-Time Stream');
        };

        ws.onmessage = (message) => {
          try {
            const data = JSON.parse(message.data);
            if (data.type === 'EVENT_BUS_NOTIFICATION') {
              setLastEvent(data.event);
              setEventHistory((prev) => [data.event, ...prev.slice(0, 49)]);
            }
          } catch (e) {
            console.error('[WS] Parse error:', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          // Try reconnect in 3s
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn('[WS] Error:', err.message || 'connection failed');
          ws.close();
        };

        setSocket(ws);
      } catch (e) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected, lastEvent, eventHistory }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
