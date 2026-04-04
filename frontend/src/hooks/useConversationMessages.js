import { useCallback, useState } from 'react';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';

function sortByCreatedAt(a, b) {
  const ta = new Date(a.createdAt).getTime();
  const tb = new Date(b.createdAt).getTime();
  return ta - tb;
}

/**
 * REST load/send for one conversation. Caller merges socket events via appendMessage.
 */
export function useConversationMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api(`/api/v1/conversations/${conversationId}/messages`);
      const list = Array.isArray(res.data) ? res.data : [];
      setMessages([...list].sort(sortByCreatedAt));
    } catch (e) {
      setError(getUserFacingMessage(e, 'Could not load messages'));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const appendMessage = useCallback((msg) => {
    if (!msg || msg.id == null) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].sort(sortByCreatedAt);
    });
  }, []);

  const sendMessage = useCallback(async (conversationId, content) => {
    const trimmed = content.trim();
    if (!trimmed || !conversationId) return;
    const res = await api(`/api/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content: trimmed },
    });
    if (res.data) appendMessage(res.data);
  }, [appendMessage]);

  return { messages, loading, error, loadMessages, sendMessage, appendMessage };
}
