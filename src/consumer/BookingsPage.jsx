import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Clock, Phone, MessageCircle, CheckCircle, AlertCircle, XCircle, ArrowRight, Wrench, Star } from 'lucide-react';

export default function BookingsPage() {
  const { 
    bookings, 
    updateBookingStatus, 
    setActiveChatMerchant, 
    merchants, 
    setConsumerTab, 
    setSelectedBooking,
    setReviewMerchant,
    setReviewTransaction,
    setIsReviewModalOpen
  } = useApp();
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

  const filteredBookings = bookings.filter(b => {
    const st = (b.status || 'PENDING').toUpperCase();
    if (filter === 'pending') return st === 'PENDING';
    if (filter === 'confirmed') return st === 'CONFIRMED';
    if (filter === 'in_progress') return st === 'IN_PROGRESS';
    if (filter === 'completed') return st === 'COMPLETED';
    if (filter === 'cancelled') return ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(st);
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Service Appointments</h1>
          <p className="text-xs text-ink-muted">Manage your trade call-outs, plumbing visits, and consultations</p>
        </div>
        <button
          onClick={() => setConsumerTab('services')}
          className="text-xs font-bold text-accent-deep hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Find Service Pros</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Bookings (${bookings.length})` },
          { id: 'confirmed', label: 'Confirmed' },
          { id: 'pending', label: 'Pending Response' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled / Other' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${filter === tab.id ? 'bg-ink text-paper border-ink shadow-sm' : 'bg-paper hover:bg-paper-warm text-ink-soft border-ink/15'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-paper rounded-3xl border border-ink/15 space-y-3 shadow-card">
          <Calendar size={32} className="mx-auto text-ink-muted" />
          <h3 className="font-display font-bold text-lg text-ink">No appointments found</h3>
          <p className="text-xs text-ink-muted max-w-xs mx-auto">
            Need a geyser fixed, COCs, or electrical load-shedding backup? Book directly with neighborhood verified pros.
          </p>
          <button
            onClick={() => setConsumerTab('services')}
            className="px-4 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm"
          >
            Explore Verified Trade Pros
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(b => {
            const merchant = merchants.find(m => m.id === b.merchantId) || b.merchant;
            const normSt = (b.status || '').toUpperCase();
            const isConfirmed = normSt === 'CONFIRMED' || normSt === 'RESCHEDULED';
            const isCompleted = normSt === 'COMPLETED';
            const isPending = normSt === 'PENDING';
            const isInProgress = normSt === 'IN_PROGRESS';
            const isCancelled = ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(normSt);

            return (
              <div
                key={b.id}
                className="bg-paper rounded-2xl border border-ink/15 p-6 shadow-card space-y-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-accent/20 border border-accent flex items-center justify-center font-bold text-ink shrink-0">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-ink">{b.serviceName}</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isConfirmed ? 'bg-success-tint text-success border border-success/30' :
                          isInProgress ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          isPending ? 'bg-warning-tint text-warning border border-warning/30' :
                          isCompleted ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          isCancelled ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-paper-warm text-ink-muted border border-ink/10'
                        }`}>
                          {isConfirmed && <CheckCircle size={11} />}
                          {isPending && <Clock size={11} />}
                          <span>{b.status}</span>
                        </span>
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        With <strong className="text-ink">{merchant?.name || 'Local Pro'}</strong> ({merchant?.suburb})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-display font-extrabold text-xl text-ink">R{b.servicePrice}</div>
                      <span className="text-[10px] text-ink-muted">Call-out / Service</span>
                    </div>
                  </div>
                </div>

                {/* Appointment Schedule & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-paper-warm p-3.5 rounded-xl border border-ink/10">
                  <div className="flex items-center gap-2 font-medium text-ink">
                    <Calendar size={15} className="text-accent-deep" />
                    <span>Appointment Date: <strong>{b.date}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-ink">
                    <Clock size={15} className="text-accent-deep" />
                    <span>Time Slot: <strong>{b.timeSlot}</strong></span>
                  </div>
                  {b.notes && (
                    <div className="sm:col-span-2 text-ink-soft text-[11px] pt-1 border-t border-ink/10">
                      <strong>Problem Notes:</strong> {b.notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {merchant?.phone && (
                      <a
                        href={`https://wa.me/${merchant.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${merchant.name}, regarding my appointment for ${b.serviceName} on ${b.date}:`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-success text-white text-xs font-bold hover:bg-success/90 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Phone size={13} />
                        <span>WhatsApp Pro</span>
                      </a>
                    )}
                    {merchant && (
                      <button
                        onClick={() => setActiveChatMerchant(merchant)}
                        className="px-3 py-1.5 rounded-xl bg-paper hover:bg-paper-warm border border-ink/15 text-xs font-bold text-ink flex items-center gap-1.5"
                      >
                        <MessageCircle size={13} />
                        <span>Chat</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="px-3 py-1.5 rounded-xl bg-paper-warm hover:bg-paper border border-ink/15 text-xs font-bold text-ink transition-colors shadow-sm"
                    >
                      View Details
                    </button>

                    {isCompleted && (
                      <button
                        onClick={() => {
                          const targetMerchant = merchant || { id: b.merchantId, name: b.businessName || b.serviceName || 'Service Provider' };
                          setReviewMerchant(targetMerchant);
                          setReviewTransaction({
                            bookingId: b.id,
                            type: 'booking',
                            serviceName: b.serviceName,
                            date: b.date
                          });
                          setIsReviewModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Star size={13} className="fill-ink" />
                        <span>Rate & Review</span>
                      </button>
                    )}
                  </div>

                  {(normSt === 'PENDING' || normSt === 'CONFIRMED') && (
                    <button
                      onClick={() => updateBookingStatus(b.id, 'CANCELLED')}
                      className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

