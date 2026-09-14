import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Bell, CheckCircle2, CheckCheck, Clock, ShieldCheck, 
  ShoppingBag, Calendar, CreditCard, Star, AlertCircle, Trash2 
} from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationsDrawer() {
  const { 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    notifications = [], 
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    setConsumerTab,
    portal,
    setPortal,
    user
  } = useApp();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isNotificationsOpen) {
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationsOpen, setIsNotificationsOpen]);

  if (!isNotificationsOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = activeFilter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'order':
        return ShoppingBag;
      case 'booking':
        return Calendar;
      case 'payment':
        return CreditCard;
      case 'review':
        return Star;
      case 'approval':
        return ShieldCheck;
      case 'alert':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case 'order':
        return 'bg-accent/20 text-accent-deep border-accent/30';
      case 'booking':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'payment':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'approval':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'alert':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-paper-warm text-ink border-ink/15';
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-md bg-paper h-full shadow-modal flex flex-col justify-between border-l border-ink/20 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-ink/10 bg-paper-warm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-ink font-bold shadow-sm">
                <Bell size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="notifications-drawer-title" className="font-display font-extrabold text-lg text-ink">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-accent text-ink text-[10px] font-extrabold border border-ink/20">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-muted">Stay updated on orders, bookings & payments</p>
              </div>
            </div>
            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
              title="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Controls: Filter Tabs & Mark All Read */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 p-1 bg-paper rounded-xl border border-ink/10">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'all' 
                    ? 'bg-ink text-paper shadow-sm' 
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'unread' 
                    ? 'bg-ink text-paper shadow-sm' 
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-accent-deep hover:text-ink transition-colors hover:underline"
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-paper-warm flex items-center justify-center text-ink-muted">
                {activeFilter === 'unread' ? <CheckCircle2 size={28} className="text-emerald-500" /> : <Bell size={28} />}
              </div>
              <h3 className="font-display font-bold text-base text-ink">
                {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-xs text-ink-muted max-w-xs leading-relaxed">
                {activeFilter === 'unread' 
                  ? "You're all caught up! Updates regarding your orders, appointments and payments will appear here."
                  : "Updates regarding your neighbourhood orders, bookings and local reviews will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map(n => {
              const Icon = getTypeIcon(n.type);
              const badgeStyle = getTypeBadgeStyle(n.type);

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markNotificationRead(n.id);
                    const isBiz = n.role === 'business' || user?.role === 'business' || portal === 'merchant';
                    const isAdmin = n.role === 'admin' || user?.role === 'admin' || portal === 'admin';

                    if (isBiz) {
                      setPortal('merchant');
                    } else if (isAdmin) {
                      setPortal('admin');
                    } else {
                      setPortal('consumer');
                      if (n.type === 'order') {
                        setConsumerTab('orders');
                      } else if (n.type === 'booking') {
                        setConsumerTab('bookings');
                      }
                    }
                    setIsNotificationsOpen(false);
                  }}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    n.read 
                      ? 'bg-paper border-ink/10 opacity-75 hover:opacity-100 hover:border-ink/20' 
                      : 'bg-paper-warm/90 border-accent/40 shadow-sm hover:border-accent'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 ${badgeStyle}`}>
                    <Icon size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h4 className="font-display font-bold text-xs text-ink leading-tight truncate">
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-accent-deep shrink-0" title="Unread" />
                      )}
                    </div>

                    <p className="text-xs text-ink-soft leading-relaxed line-clamp-3">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-ink-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatRelativeTime(n.createdAt)}
                      </span>
                      <span>·</span>
                      <span className="uppercase font-semibold tracking-wider text-[9px]">
                        {n.type || 'info'}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-muted hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete notification"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink/10 bg-paper-warm flex items-center justify-between text-[11px] text-ink-muted">
          <span>Real-time notifications</span>
          <span className="font-medium text-ink-soft">LocalBiz Gauteng</span>
        </div>
      </div>
    </div>
  );
}
