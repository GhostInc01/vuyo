import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Star, Send, ShieldCheck, AlertCircle, ShoppingBag, Calendar, CheckCircle2 } from 'lucide-react';

export default function ReviewModal() {
  const { 
    isReviewModalOpen, 
    setIsReviewModalOpen, 
    reviewMerchant, 
    reviewTransaction,
    setReviewTransaction,
    submitReview, 
    user,
    orders = [],
    bookings = []
  } = useApp();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTxKey, setSelectedTxKey] = useState('');

  // Update userName when user changes
  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isReviewModalOpen) {
        setIsReviewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReviewModalOpen, setIsReviewModalOpen]);

  // Determine eligible completed transactions for this user & merchant
  const eligibleTransactions = useMemo(() => {
    if (!reviewMerchant) return [];

    const list = [];
    // Completed orders
    orders.forEach(o => {
      if (o.merchantId === reviewMerchant.id && (o.status === 'Delivered' || o.status === 'COMPLETED')) {
        list.push({
          key: `order:${o.id}`,
          type: 'order',
          orderId: o.id,
          label: `Order #${o.id.slice(-6)} · R${o.total}`,
          date: o.placedAt || (o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Recent')
        });
      }
    });

    // Completed bookings
    bookings.forEach(b => {
      const bStatus = (b.status || '').toUpperCase();
      if (b.merchantId === reviewMerchant.id && bStatus === 'COMPLETED') {
        list.push({
          key: `booking:${b.id}`,
          type: 'booking',
          bookingId: b.id,
          label: `Booking #${b.id.slice(-6)} · ${b.serviceName || 'Service'}`,
          date: b.date || 'Recent'
        });
      }
    });

    return list;
  }, [reviewMerchant, orders, bookings]);

  // Set default selected transaction
  useEffect(() => {
    if (reviewTransaction) {
      if (reviewTransaction.orderId) {
        setSelectedTxKey(`order:${reviewTransaction.orderId}`);
      } else if (reviewTransaction.bookingId) {
        setSelectedTxKey(`booking:${reviewTransaction.bookingId}`);
      }
    } else if (eligibleTransactions.length > 0) {
      setSelectedTxKey(eligibleTransactions[0].key);
    } else {
      setSelectedTxKey('');
    }
  }, [reviewTransaction, eligibleTransactions]);

  if (!isReviewModalOpen || !reviewMerchant) return null;

  const isConsumer = user && (!user.role || user.role === 'consumer');
  const hasEligibleTx = reviewTransaction || eligibleTransactions.length > 0;
  const canSubmit = isConsumer && hasEligibleTx && comment.trim().length > 0 && !isSubmitting;

  const handleClose = () => {
    setIsReviewModalOpen(false);
    setReviewTransaction(null);
    setComment('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    let orderId = reviewTransaction?.orderId || null;
    let bookingId = reviewTransaction?.bookingId || null;

    if (!orderId && !bookingId && selectedTxKey) {
      const [type, id] = selectedTxKey.split(':');
      if (type === 'order') orderId = id;
      if (type === 'booking') bookingId = id;
    }

    setIsSubmitting(true);
    const success = await submitReview(reviewMerchant.id, {
      rating: Math.round(rating),
      comment: comment.trim(),
      userName: userName.trim() || user?.name || 'Local Shopper',
      orderId,
      bookingId
    });
    setIsSubmitting(false);

    if (success) {
      setComment('');
      handleClose();
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-md w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-deep">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 id="review-modal-title" className="font-display font-extrabold text-base text-ink">Verified Review & Rating</h2>
              <p className="text-[11px] text-ink-muted">Feedback for {reviewMerchant.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Verification Warnings & Notifications */}
        {!user && (
          <div className="m-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong className="block font-bold">Sign-in Required</strong>
              Only registered consumers can submit verified reviews. Please sign in to your account.
            </div>
          </div>
        )}

        {user && user.role && user.role !== 'consumer' && (
          <div className="m-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900">
              <strong className="block font-bold">Consumer Accounts Only</strong>
              Only consumer shoppers can review local businesses. Business and admin accounts are restricted.
            </div>
          </div>
        )}

        {user && isConsumer && !hasEligibleTx && (
          <div className="m-5 p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-start gap-2.5">
            <ShoppingBag size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <strong className="block font-bold">Completed Transaction Required</strong>
              Reviews require a completed order or booking with {reviewMerchant.name}. Complete a purchase to unlock review privileges!
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Verified Transaction Badge / Selector */}
          {hasEligibleTx && (
            <div className="p-3 bg-paper-warm rounded-2xl border border-ink/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  Verified Transaction
                </span>
                <span>1 review per order/booking</span>
              </div>

              {reviewTransaction ? (
                <div className="text-xs font-bold text-ink flex items-center gap-2">
                  {reviewTransaction.orderId ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg text-[11px]">
                      <ShoppingBag size={12} />
                      Order #{reviewTransaction.orderId.slice(-6)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 px-2 py-0.5 rounded-lg text-[11px]">
                      <Calendar size={12} />
                      Booking #{reviewTransaction.bookingId?.slice(-6)}
                    </span>
                  )}
                  <span className="text-[11px] text-ink-muted">{reviewTransaction.date || 'Completed'}</span>
                </div>
              ) : (
                <div>
                  <select
                    value={selectedTxKey}
                    onChange={e => setSelectedTxKey(e.target.value)}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                  >
                    {eligibleTransactions.map(tx => (
                      <option key={tx.key} value={tx.key}>
                        {tx.label} ({tx.date})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Star Selector */}
          <div className="text-center py-2">
            <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Overall Rating (1–5 Stars)</div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star
                    size={28}
                    className={`transition-colors ${(hoverRating || rating) >= star ? 'fill-accent text-accent-deep' : 'text-ink/20'}`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-ink mt-1 block">
              {rating === 5 ? '⭐⭐⭐⭐⭐ 5 Stars - Outstanding!' :
               rating === 4 ? '⭐⭐⭐⭐ 4 Stars - Very Good' :
               rating === 3 ? '⭐⭐⭐ 3 Stars - Average' :
               rating === 2 ? '⭐⭐ 2 Stars - Needs Improvement' : '⭐ 1 Star - Disappointed'}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Reviewer Name</label>
            <input
              type="text"
              required
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="e.g. Thandiwe N."
              className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-soft mb-1">Your Honest Feedback</label>
            <textarea
              rows="3"
              required
              placeholder="How was the service, product quality, or delivery? Keep it helpful for your neighbors..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={15} />
            <span>{isSubmitting ? 'Publishing Review...' : 'Submit Verified Review'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
