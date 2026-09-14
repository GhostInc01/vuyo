import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, Calendar, Clock, MapPin, Phone, ShieldCheck, CheckCircle2, Wrench, AlertCircle, Ban } from 'lucide-react';

export default function BookingModal() {
  const { 
    isBookingModalOpen, 
    setIsBookingModalOpen, 
    bookingService, 
    selectedMerchant, 
    createBooking, 
    savedProfile, 
    suburb 
  } = useApp();

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('09:00');
  const [customerName, setCustomerName] = useState(savedProfile?.name || 'Thandiwe Nkosi');
  const [phone, setPhone] = useState(savedProfile?.phone || '+27 82 119 4432');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const merchant = selectedMerchant || bookingService?.merchant;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isBookingModalOpen) {
        setIsBookingModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBookingModalOpen, setIsBookingModalOpen]);

  // Fetch real-time availability for selected date
  useEffect(() => {
    if (!merchant?.id || !date) return;
    let isMounted = true;
    setLoadingAvailability(true);
    setBookingError('');
    api.getMerchantAvailability(merchant.id, date)
      .then(data => {
        if (!isMounted) return;
        setAvailability(data);
        if (data.slots && data.slots.length > 0) {
          const firstAvail = data.slots.find(s => s.available);
          if (firstAvail && (!timeSlot || data.slots.find(s => s.timeSlot === timeSlot)?.isBooked)) {
            setTimeSlot(firstAvail.timeSlot);
          }
        }
      })
      .catch(() => {
        // Fallback default slots if availability fails
        if (isMounted) setAvailability(null);
      })
      .finally(() => {
        if (isMounted) setLoadingAvailability(false);
      });

    return () => { isMounted = false; };
  }, [merchant?.id, date]);

  if (!isBookingModalOpen || !bookingService) return null;

  const defaultSlots = [
    '08:30', '10:00', '11:30', '13:30', '15:00', '16:30'
  ];

  const slotsToRender = availability?.slots || defaultSlots.map(t => ({
    timeSlot: t,
    available: true,
    isBooked: false,
    status: 'Available'
  }));

  const isClosedDay = availability?.isClosedDay || false;
  const isSelectedSlotBooked = Boolean(
    availability?.slots?.find(s => s.timeSlot === timeSlot)?.isBooked
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isClosedDay) {
      setBookingError(`Business is closed on ${availability?.dayName}s. Please pick another date.`);
      return;
    }
    if (isSelectedSlotBooked) {
      setBookingError(`The slot ${timeSlot} on ${date} is already booked. Please choose an available slot.`);
      return;
    }

    setIsSubmitting(true);
    setBookingError('');
    const success = await createBooking({
      merchantId: merchant?.id,
      serviceId: bookingService.id,
      customerName,
      phone,
      serviceName: bookingService.name,
      servicePrice: bookingService.price,
      duration: bookingService.duration || '45 mins',
      date,
      timeSlot,
      notes
    });
    setIsSubmitting(false);
    if (!success) {
      setBookingError('Could not complete booking. The selected slot may have just been reserved.');
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-lg w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent text-ink flex items-center justify-center font-bold">
              <Wrench size={18} />
            </div>
            <div>
              <h2 id="booking-modal-title" className="font-display font-extrabold text-lg text-ink">Book Service Call-Out</h2>
              <p className="text-[11px] text-ink-muted">With {merchant?.name || 'Verified Professional'}</p>
            </div>
          </div>
          <button
            onClick={() => setIsBookingModalOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Error Alert */}
          {bookingError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Selected Service Card */}
          <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-accent-deep tracking-wider block mb-0.5">
                Selected Service
              </span>
              <h3 className="font-display font-bold text-sm text-ink">{bookingService.name}</h3>
              <p className="text-xs text-ink-muted mt-0.5">{bookingService.desc || 'Professional on-site service & certified labor.'}</p>
              {bookingService.duration && (
                <span className="text-[11px] font-semibold text-ink-soft mt-1 inline-block">
                  Estimated duration: {bookingService.duration}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-display font-extrabold text-xl text-ink">R{bookingService.price}</div>
              <span className="text-[10px] text-ink-muted">Standard rate</span>
            </div>
          </div>

          {/* Date Picker & Availability Status */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-accent-deep" />
              <span>Appointment Date</span>
            </label>
            <input
              type="date"
              required
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
            />
            {availability && (
              <div className="flex items-center justify-between text-[11px] mt-1 text-ink-muted">
                <span>Operating hours: {availability.openingHours}</span>
                <span>Days: {availability.openingDays}</span>
              </div>
            )}
          </div>

          {/* Closed Day Alert */}
          {isClosedDay && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-medium">
              <Ban size={16} className="shrink-0 text-amber-700" />
              <span>This business is closed on <strong>{availability?.dayName}s</strong>. Please choose another date.</span>
            </div>
          )}

          {/* Time Slot Selection Grid */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-accent-deep" />
                <span>Select Appointment Time Slot</span>
              </span>
              {loadingAvailability && (
                <span className="text-[10px] text-accent-deep animate-pulse">Checking availability...</span>
              )}
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slotsToRender.map(s => {
                const isSelected = timeSlot === s.timeSlot;
                const isBooked = s.isBooked;

                return (
                  <button
                    key={s.timeSlot}
                    type="button"
                    disabled={isBooked || isClosedDay}
                    onClick={() => setTimeSlot(s.timeSlot)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isBooked
                        ? 'bg-paper-warm/80 text-ink-muted/50 border-ink/10 line-through cursor-not-allowed'
                        : isSelected
                        ? 'bg-accent text-ink border-accent font-black shadow-sm ring-2 ring-accent/30'
                        : 'bg-paper hover:bg-accent/15 border-ink/15 text-ink'
                    }`}
                  >
                    <span>{s.timeSlot}</span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                      isBooked ? 'text-red-500/70' : isSelected ? 'text-ink font-bold' : 'text-emerald-700'
                    }`}>
                      {isBooked ? 'Booked' : isSelected ? 'Selected' : 'Available'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 pt-2 border-t border-ink/10">
            <h4 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
              Contact & Location
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Your Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">South African Mobile (for SMS/WhatsApp)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Problem Description or Notes</label>
              <textarea
                rows="2"
                placeholder="e.g. Geyser leaking from bottom valve, need PIRB certificate..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Trust Guarantee */}
          <div className="p-3 bg-success-tint rounded-xl border border-success/30 flex items-center gap-2 text-xs text-success font-medium">
            <ShieldCheck size={16} className="shrink-0" />
            <span>Verified trade professional. Pay only when work is completed.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isClosedDay || isSelectedSlotBooked}
            className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>
              {isSubmitting
                ? 'Requesting Appointment...'
                : isClosedDay
                ? 'Business Closed on Selected Day'
                : isSelectedSlotBooked
                ? 'Selected Slot is Booked'
                : `Confirm Booking Request (R${bookingService.price})`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

