import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, Send, Store, ShieldCheck, Phone, CheckCheck, Check, Clock } from 'lucide-react';

const QUICK_CHIPS = [
  'Is this in stock for same-day delivery?',
  'Can I collect this afternoon?',
  'What is your call-out fee for Alberton?',
  'Do you bring a card machine for payment?'
];

export default function ChatDrawer() {
  const { 
    activeChatMerchant, 
    setActiveChatMerchant, 
    user, 
    setIsAuthOpen,
    activeConversation,
    setActiveConversation,
    fetchUnreadMessageCounts,
    addToast
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeChatMerchant) {
        setActiveChatMerchant(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChatMerchant, setActiveChatMerchant]);

  // Load and poll conversation thread
  useEffect(() => {
    if (!activeChatMerchant) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    const loadThread = async () => {
      const token = localStorage.getItem('localbiz_token');
      if (!token) {
        // Fallback for unauthenticated preview
        setMessages([
          {
            id: 'init-1',
            senderRole: 'business',
            text: `Sawubona! Welcome to ${activeChatMerchant.name}. How can we assist you in ${activeChatMerchant.suburb} today?`,
            createdAt: new Date().toISOString()
          }
        ]);
        return;
      }

      try {
        setLoading(true);
        const conv = await api.startConversation({ merchantId: activeChatMerchant.id }, token);
        if (!isMounted) return;

        setActiveConversation(conv);
        if (conv.messages && conv.messages.length > 0) {
          setMessages(conv.messages);
        } else {
          setMessages([
            {
              id: 'init-1',
              senderRole: 'business',
              text: `Sawubona! Welcome to ${activeChatMerchant.name}. How can we assist you in ${activeChatMerchant.suburb} today?`,
              createdAt: new Date().toISOString()
            }
          ]);
        }

        // Mark as read
        if (conv.id) {
          await api.markConversationRead(conv.id, token).catch(() => {});
          fetchUnreadMessageCounts();
        }
      } catch (err) {
        console.error('Failed to load chat thread:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadThread();

    // 3-second REST polling for live message updates
    const pollInterval = setInterval(async () => {
      const token = localStorage.getItem('localbiz_token');
      if (!token || !activeChatMerchant) return;

      try {
        const conv = await api.startConversation({ merchantId: activeChatMerchant.id }, token);
        if (!isMounted) return;

        if (conv?.messages && conv.messages.length > 0) {
          setMessages(conv.messages);
        }

        if (conv?.unreadCountConsumer > 0) {
          await api.markConversationRead(conv.id, token).catch(() => {});
          fetchUnreadMessageCounts();
        }
      } catch (err) {
        // Suppress polling error logs in background
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [activeChatMerchant]);

  if (!activeChatMerchant) return null;

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!user) {
      addToast('Please sign in to send messages to merchants', 'info');
      setIsAuthOpen(true);
      return;
    }

    const token = localStorage.getItem('localbiz_token');
    const optimisticMsg = {
      id: 'opt-' + Date.now(),
      senderRole: 'consumer',
      text,
      read: false,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev.filter(m => m.id !== 'init-1'), optimisticMsg]);
    setInputText('');
    setSending(true);

    try {
      let convId = activeConversation?.id;
      if (!convId) {
        const conv = await api.startConversation({ merchantId: activeChatMerchant.id }, token);
        setActiveConversation(conv);
        convId = conv.id;
      }

      const res = await api.sendConversationMessage(convId, { text }, token);
      if (res.conversation?.messages) {
        setMessages(res.conversation.messages);
      } else if (res.message) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.message : m));
      }
    } catch (e) {
      console.error('Error sending message:', e);
      addToast('Failed to deliver message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const getWhatsAppUrl = () => {
    const cleanPhone = (activeChatMerchant.phone || '27821194432').replace(/[^0-9]/g, '');
    const latestCustomerMsg = [...messages].reverse().find(m => m.senderRole === 'consumer')?.text || 'Sawubona! Reaching out via LocalBiz';
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${activeChatMerchant.name}, I'm reaching out via LocalBiz:\n"${latestCustomerMsg}"`)}`;
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-md bg-paper h-full shadow-modal flex flex-col justify-between border-l border-ink/20 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-ink/10 flex items-center justify-between bg-paper-warm">
          <div className="flex items-center gap-3">
            <img
              src={activeChatMerchant.logo || activeChatMerchant.cover}
              alt={activeChatMerchant.name}
              className="w-10 h-10 rounded-xl object-cover border border-ink/15 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 id="chat-drawer-title" className="font-display font-bold text-sm text-ink">{activeChatMerchant.name}</h3>
                <ShieldCheck size={14} className="text-success" />
              </div>
              <p className="text-[10px] text-ink-muted">
                Replies in {activeChatMerchant.respondsIn || '15 mins'} · {activeChatMerchant.suburb}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-success-tint hover:bg-success/20 text-success border border-success/30 transition-colors"
              title="Continue on WhatsApp"
            >
              <Phone size={15} />
            </a>
            <button
              onClick={() => setActiveChatMerchant(null)}
              className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-paper">
          {loading && messages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-ink-muted text-xs gap-2">
              <Clock size={20} className="animate-spin text-accent-deep" />
              <span>Connecting to secure chat...</span>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderRole === 'consumer' || msg.senderRole === 'customer' || (user && msg.senderId === user.id);
              const timeString = msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now');
              
              return (
                <div
                  key={msg.id || msg.createdAt}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                      isMe 
                        ? 'bg-ink text-paper rounded-br-none' 
                        : 'bg-paper-warm text-ink rounded-bl-none border border-ink/10'
                    }`}
                  >
                    {msg.text || msg.content}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-ink-muted mt-1 px-1">
                    <span>{timeString}</span>
                    {isMe && (
                      msg.read ? (
                        <CheckCheck size={12} className="text-accent-deep font-bold" title="Read" />
                      ) : (
                        <Check size={12} className="text-ink-muted" title="Sent" />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-paper-warm/50 border-t border-ink/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip)}
              className="px-2.5 py-1 rounded-lg bg-paper hover:bg-paper-warm border border-ink/10 text-[10px] font-medium text-ink-soft whitespace-nowrap transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} 
          className="p-3 border-t border-ink/10 bg-paper-warm flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={user ? `Message ${activeChatMerchant.name}...` : 'Sign in to message merchant...'}
            value={inputText}
            disabled={sending}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 bg-paper border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="w-9 h-9 rounded-xl bg-accent hover:bg-accent-hover text-ink flex items-center justify-center transition-colors shrink-0 shadow-sm disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
