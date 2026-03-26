import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { baseUrl } from '../lib/api';
import { getStoredToken } from '../lib/authStorage';

/**
 * Connects Socket.io for a conversation, joins the room, forwards `message` events.
 * Optional `onExchangeReadiness` when the server emits `exchange_readiness` (Form 2 slider sync).
 * Caller loads initial messages via REST separately.
 */
export function useConversationSocket(conversationId, onIncomingMessage, onExchangeReadiness) {
  const [socketState, setSocketState] = useState('idle');
  const [socketError, setSocketError] = useState('');
  const handlerRef = useRef(onIncomingMessage);
  const readinessRef = useRef(onExchangeReadiness);

  const token = conversationId ? getStoredToken() : null;
  const authBlocked = Boolean(conversationId && !token);

  useEffect(() => {
    handlerRef.current = onIncomingMessage;
  }, [onIncomingMessage]);

  useEffect(() => {
    readinessRef.current = onExchangeReadiness;
  }, [onExchangeReadiness]);

  useEffect(() => {
    if (!conversationId || authBlocked) {
      return undefined;
    }

    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync UI when starting Socket.io connection
    setSocketState('connecting');
    setSocketError('');

    const socket = io(baseUrl, { auth: { token: `Bearer ${token}` } });

    socket.on('connect', () => {
      if (cancelled) return;
      setSocketState('connected');
      socket.emit('join_conversation', { conversationId }, (res) => {
        if (cancelled) return;
        if (res && !res.success) setSocketError(res.error || 'Could not join chat');
      });
    });

    socket.on('connect_error', (err) => {
      if (cancelled) return;
      setSocketState('error');
      setSocketError(err.message || 'Could not connect to chat server');
    });

    socket.on('message', (msg) => {
      if (cancelled || !msg) return;
      handlerRef.current?.(msg);
    });

    socket.on('exchange_readiness', (payload) => {
      if (cancelled || !payload) return;
      readinessRef.current?.(payload);
    });

    return () => {
      cancelled = true;
      socket.emit('leave_conversation', { conversationId });
      socket.close();
      setSocketState('idle');
    };
  }, [conversationId, authBlocked, token]);

  const combinedError = authBlocked ? 'Not logged in' : socketError;

  return {
    socketState: authBlocked ? 'idle' : socketState,
    socketError: combinedError,
  };
}
