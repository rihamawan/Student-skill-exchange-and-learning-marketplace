import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getUserFacingMessage } from '../lib/apiErrors';
import { getTokenUserId } from '../lib/jwtPayload';
import { useConversationMessages } from '../hooks/useConversationMessages';
import { useConversationSocket } from '../hooks/useConversationSocket';

function numId(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function peerStudentId(conv, currentUserId) {
  const me = numId(currentUserId);
  if (!conv || me == null) return null;
  const s1 = numId(conv.student1Id);
  const s2 = numId(conv.student2Id);
  if (s1 === me) return s2;
  if (s2 === me) return s1;
  return s2 ?? s1;
}

export function ConversationsPage() {
  const { user } = useAuth();
  // Must match JWT used for API calls — stale React/localStorage user.id caused wrong "mine" + peer labels.
  const myId = getTokenUserId() ?? numId(user?.id ?? user?.UserID ?? user?.userId);

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');

  const { messages, loading: messagesLoading, error: messagesError, loadMessages, sendMessage, appendMessage } =
    useConversationMessages();

  const onSocketMessage = useCallback(
    (msg) => {
      const cid = numId(msg?.conversationId);
      const sel = numId(selectedId);
      if (cid != null && sel != null && cid === sel) appendMessage(msg);
    },
    [selectedId, appendMessage]
  );

  const { socketState, socketError } = useConversationSocket(selectedId, onSocketMessage);

  const loadConversations = useCallback(async () => {
    setSelectedId(null);
    setListLoading(true);
    setListError('');
    try {
      const res = await api('/api/v1/conversations');
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setListError(getUserFacingMessage(e, 'Could not load conversations'));
      setConversations([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (conversations.length && selectedId == null) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSendError('');
    try {
      await sendMessage(selectedId, draft);
      setDraft('');
    } catch (err) {
      setSendError(getUserFacingMessage(err, 'Send failed'));
    }
  }

  if (listLoading) {
    return (
      <div>
        <h1>Conversations</h1>
        <LoadingState label="Loading your conversations…" />
      </div>
    );
  }

  if (listError) {
    return (
      <div>
        <h1>Conversations</h1>
        <ErrorState message={listError} onRetry={() => void loadConversations()} />
      </div>
    );
  }

  const selectedConv = conversations.find((c) => numId(c.id) === numId(selectedId)) ?? null;
  const selectedPeerLabel =
    selectedConv?.peerName ||
    (selectedConv?.peerId != null ? `Student #${selectedConv.peerId}` : null) ||
    (peerStudentId(selectedConv, myId) != null ? `Student #${peerStudentId(selectedConv, myId)}` : 'Conversation');

  if (!conversations.length) {
    return (
      <div>
        <h1>Conversations</h1>
        <p className="muted">You have no conversations yet. Start one from an exchange or skill flow when available.</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <h1>Conversations</h1>
      <p className="muted">Real-time updates when the chat server is connected.</p>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <ul className="chat-conv-list">
            {conversations.map((c) => {
              const peer = peerStudentId(c, myId);
              const active = numId(c.id) === numId(selectedId);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`chat-conv-item${active ? ' active' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    {c.peerName ||
                      (c.peerId != null ? `Student #${c.peerId}` : null) ||
                      (peer != null ? `Student #${peer}` : `Conversation #${c.id}`)}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="chat-main">
          {!selectedId ? (
            <p className="muted">Select a conversation.</p>
          ) : (
            <>
              <div className="chat-toolbar">
                <span className="chat-with-label">
                  <strong>{selectedPeerLabel}</strong>
                </span>
                <span className="muted">
                  Socket: {socketState}
                  {socketError ? ` — ${socketError}` : ''}
                </span>
                <span className="chat-toolbar-actions">
                  <Link to={`/student/confirm-exchange/${selectedId}`}>Confirm exchange (Form 2)</Link>
                </span>
              </div>
              {messagesLoading ? (
                <p className="muted">Loading messages…</p>
              ) : messagesError ? (
                <p className="form-error" role="alert">
                  {messagesError}
                </p>
              ) : !messages.length ? (
                <p className="muted">No messages yet. Say hello below.</p>
              ) : (
                <ul className="chat-messages">
                  {messages.map((m) => {
                    const mine = myId != null && numId(m.senderId) === myId;
                    return (
                      <li key={m.id} className={`chat-bubble-wrap${mine ? ' mine' : ''}`}>
                        <div className="chat-bubble">
                          <div className="chat-meta">
                            {mine ? 'You' : m.senderName || `Student #${m.senderId}`}
                          </div>
                          <div className="chat-text">{m.content}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <form className="chat-compose" onSubmit={handleSend}>
                {sendError ? (
                  <p className="form-error" role="alert">
                    {sendError}
                  </p>
                ) : null}
                <div className="chat-compose-row">
                  <input
                    className="chat-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    aria-label="Message"
                  />
                  <button type="submit" className="btn-primary" disabled={!draft.trim()}>
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
