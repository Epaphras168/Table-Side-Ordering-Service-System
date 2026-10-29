import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { WS_BASE_URL, getToken } from '../api/client';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { status } = useAuth();
  const listenersRef = useRef(new Map()); // event -> Set<handler>
  const socketRef = useRef(null);

  useEffect(() => {
    if (status !== 'signed-in') return undefined;

    let closedByEffect = false;
    let retryDelay = 1000;
    let socket;

    function connect() {
      const token = getToken();
      if (!token) return;
      socket = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.addEventListener('message', (event) => {
        let parsed;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
        const handlers = listenersRef.current.get(parsed.event);
        handlers?.forEach((fn) => fn(parsed.payload));
      });

      socket.addEventListener('close', () => {
        if (closedByEffect) return;
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 1.6, 15000);
      });

      socket.addEventListener('open', () => {
        retryDelay = 1000;
      });
    }

    connect();
    return () => {
      closedByEffect = true;
      socket?.close();
    };
  }, [status]);

  const api = useMemo(
    () => ({
      subscribe(event, handler) {
        if (!listenersRef.current.has(event)) listenersRef.current.set(event, new Set());
        listenersRef.current.get(event).add(handler);
        return () => listenersRef.current.get(event)?.delete(handler);
      },
    }),
    []
  );

  return <RealtimeContext.Provider value={api}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeEvent(event, handler) {
  const ctx = useContext(RealtimeContext);
  useEffect(() => {
    if (!ctx) return undefined;
    return ctx.subscribe(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, handler]);
}
