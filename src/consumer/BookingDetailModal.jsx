import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, Calendar, Clock, MapPin, Phone, MessageSquare, Store, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';

export default function BookingDetailModal() {
  const {
    selectedBooking,
    setSelectedBooking,
    setSelectedMerchant,
    setActiveChatMerchant,
    updateBookingStatus,
    setReviewMerchant,
    setReviewTransaction,
    setIsReviewModalOpen,
    addToast
  } = useApp();

  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!selectedBooking) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedBooking(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBooking, setSelectedBooking]);

  if (!selectedBooking) return null;

  const b = selectedBooking;
  const merchant = b.merchant;

  const normStatus = (b.status || 'PENDING').toUpperCase();

  const handlePayBooking = async () => {
    try {
      setIsPaying(true);
      const token = localStorage.getItem('localbiz_token');
      const amount = Number(b.price || b.servicePrice || 0);
      const paymentIntent = await api.createPayment({
        bookingId: b.id,
        amount,
        method: 'CARD',
        provider: 'mock'
      }, token);

      const processed = await api.processPayment(paymentIntent.id, {
        amount
      }, token);

      if (processed.status === 'SUCCESS') {
        setSelectedBooking(prev => ({
          ...prev,
          paymentStatus: 'Paid',
          status: 'CONFIRMED'
        }));
        if (addToast) addToast('Payment approved! Appointment confirmed.', 'success');
      } else {
        if (addToast) addToast(processed.failureReason || 'Payment failed', 'error');
      }
    } catch (err) {
      if (addToast) addToast(err.message || 'Payment failed', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (window.confirm('Are you sure you want to cancel this booking appointment?')) {
      await updateBookingStatus(b.id, 'CANCELLED');
      setSelectedBooking(prev => ({ ...prev, status: 'CANCELLED' }));
    }
  };

  const handleOpenStorefront = () => {
    if (merchant) {
      setSelectedMerchant(merchant);
      setSelectedBooking(null);
    }
  };

  const handleOpenChat = () => {
    if (merchant) {
      setActiveChatMerchant(merchant);
      setSelectedBooking(null);
    }
  };

  const handleOpenReview = () => {
    const targetMerchant = merchant || { id: b.merchantId, name: b.businessName || b.serviceName || 'Service Provider' };
    setReviewMerchant(targetMerchant);
    setReviewTransaction({
      bookingId: b.id,
      type: 'booking',
      serviceName: b.serviceName,
      date: b.date
    });
    setIsReviewModalOpen(true);
    setSelectedBooking(null);
  };

  const getStatusBadge = (st) => {
    const s = (st || '').toUpperCase();
    if (s === 'CONFIRMED') return 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30';
    if (s === 'IN_PROGRESS') return 'bg-blue-500/15 text-blue-800 border-blue-500/30';
    if (s === 'COMPLETED') return 'bg-purple-500/15 text-purple-800 border-purple-500/30';
    if (s === 'RESCHEDULED') return 'bg-indigo-500/15 text-indigo-800 border-indigo-500/30';
    if (s === 'CANCELLED' || s === 'REJECTED') return 'bg-red-500/15 text-red-800 border-red-500/30';
    if (s === 'NO_SHOW') return 'bg-slate-500/15 text-slate-800 border-slate-500/30';
    return 'bg-accent/25 text-ink border-accent/40';
  };

  const canCancel = ['PENDING', 'CONFIRMED', 'PENDING RESPONSE'].includes(normStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-detail-title"
        className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-md w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="booking-detail-title" className="font-display font-extrabold text-lg text-ink">
                Booking Details
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(b.status)}`}>
                {b.status}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-0.5">Booking #{b.id}</p>
          </div>
          <button
            onClick={() => setSelectedBooking(null)}
            className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
            aria-label="Close booking details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Rescheduled Notice */}
          {normStatus === 'RESCHEDULED' && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
              <AlertTriangle size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Appointment Rescheduled</strong>
                <span>New slot: <strong>{b.rescheduledDate || b.date}</strong> at <strong>{b.rescheduledTime || b.timeSlot || b.time}</strong></span>
              </div>
            </div>
          )}

          {/* Service Banner */}
          <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-2">
            <span className="text-[10px] font-bold uppercase text-accent-deep tracking-wider block">Service</span>
            <h3 className="font-display font-black text-xl text-ink">
              {b.serviceTitle || b.serviceName}
            </h3>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-ink/10">
              <span className="text-ink-muted">Rate / Total</span>
              <span className="font-black text-ink text-base">
                R{Number(b.price || b.servicePrice || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-ink/10">
              <span className="text-ink-muted">Payment Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                (b.paymentStatus || '').toUpperCase() === 'PAID' ? 'bg-emerald-500/15 text-emerald-800' : 'bg-amber-500/15 text-amber-800'
              }`}>
                {b.paymentStatus || 'Pending'}
              </span>
            </div>

            {(b.paymentStatus || '').toUpperCase() !== 'PAID' && normStatus !== 'CANCELLED' && normStatus !== 'REJECTED' && (
              <button
                type="button"
                onClick={handlePayBooking}
                disabled={isPaying}
                className="w-full mt-2 py-2.5 px-3 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <CreditCard size={15} />
                <span>{isPaying ? 'Processing...' : `Pay R${Number(b.price || b.servicePrice || 0).toFixed(2)} Online Now`}</span>
              </button>
            )}
          </div>

          {/* Appointment Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-paper border border-ink/15 space-y-1">
              <span className="text-[10px] uppercase font-bold text-ink-muted flex items-center gap-1">
                <Calendar size={12} className="text-accent-deep" /> Date
              </span>
              <p className="font-bold text-xs text-ink">{b.date}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-paper border border-ink/15 space-y-1">
              <span className="text-[10px] uppercase font-bold text-ink-muted flex items-center gap-1">
                <Clock size={12} className="text-accent-deep" /> Time Slot
              </span>
              <p className="font-bold text-xs text-ink">{b.time || b.timeSlot || 'Scheduled'}</p>
            </div>
          </div>

          {/* Business Information Card */}
          {merchant && (
            <div className="p-4 rounded-2xl border border-ink/15 bg-paper space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={merchant.logo || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=120&q=80'}
                    alt={merchant.name}
                    className="w-10 h-10 rounded-xl object-cover border border-ink/10"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-ink">{merchant.name}</h4>
                    <p className="text-[11px] text-ink-muted">{merchant.suburb}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="p-2 rounded-xl bg-paper-warm hover:bg-accent/20 border border-ink/15 text-ink transition-colors"
                    title="Direct Message"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenStorefront}
                    className="px-2.5 py-1.5 rounded-xl border border-ink/20 hover:bg-paper-warm text-[11px] font-bold text-ink transition-colors"
                  >
                    Storefront
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-ink-muted space-y-1 pt-2 border-t border-ink/10">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-accent-deep shrink-0" />
                  <span>{merchant.address || 'Address provided by business'}</span>
                </div>
                {merchant.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-accent-deep shrink-0" />
                    <span>{merchant.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Notes */}
          {b.notes && (
            <div className="p-3.5 rounded-2xl bg-paper-warm border border-ink/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-ink-muted block">Client Instructions</span>
              <p className="text-xs text-ink">{b.notes}</p>
            </div>
          )}

          {/* Review Prompt Banner for Completed Appointments */}
          {normStatus === 'COMPLETED' && (
            <div className="p-4 rounded-2xl bg-accent/20 border border-accent/40 space-y-2.5">
              <div className="flex items-center gap-2 text-ink font-bold text-xs">
                <CheckCircle size={16} className="text-emerald-700" />
                <span>Service Completed! How was your experience?</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Help other neighborhood residents by leaving a verified rating and community review.
              </p>
              <button
                type="button"
                onClick={handleOpenReview}
                className="w-full py-2 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs shadow-sm transition-colors"
              >
                ★ Rate & Review {merchant?.name || 'Service'}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-ink/10 bg-paper-warm flex items-center justify-between gap-3 shrink-0">
          {canCancel ? (
            <button
              type="button"
              onClick={handleCancelBooking}
              className="btn-base btn-danger btn-sm"
            >
              Cancel Booking
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={() => setSelectedBooking(null)}
            className="btn-base btn-primary btn-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
