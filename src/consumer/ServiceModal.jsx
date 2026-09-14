import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Clock, Calendar, Store, CheckCircle, ShieldCheck, MessageSquare, Phone, Heart } from 'lucide-react';

export default function ServiceModal() {
  const {
    selectedService,
    setSelectedService,
    setSelectedMerchant,
    setBookingService,
    setIsBookingModalOpen,
    setActiveChatMerchant,
    toggleFavourite,
    isFavourite
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedService) {
        setSelectedService(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedService, setSelectedService]);

  if (!selectedService) return null;

  const s = selectedService;
  const merchant = s.merchant;

  const handleOpenBooking = () => {
    setBookingService(s);
    setSelectedService(null);
    setIsBookingModalOpen(true);
  };

  const handleOpenStorefront = () => {
    if (merchant) {
      setSelectedMerchant(merchant);
      setSelectedService(null);
    }
  };

  const handleStartChat = () => {
    if (merchant) {
      setActiveChatMerchant(merchant);
      setSelectedService(null);
    }
  };

  const isFav = isFavourite(s.id, 'service');

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-xl w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Modal Image Header */}
        <div className="relative h-56 sm:h-64 w-full bg-stone-900 shrink-0">
          <img
            src={s.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80'}
            alt={s.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
          
          <button
            type="button"
            onClick={() => toggleFavourite(s.id, 'service')}
            className={`absolute top-4 right-14 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center shadow-raised transition-all ${
              isFav ? 'bg-warning text-white' : 'bg-paper/90 text-ink hover:bg-paper hover:text-warning'
            }`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={16} className={isFav ? 'fill-white' : ''} />
          </button>

          <button
            onClick={() => setSelectedService(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-paper/90 hover:bg-paper text-ink flex items-center justify-center shadow-raised transition-all"
          >
            <X size={18} />
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-ink text-[11px] font-bold uppercase tracking-wider mb-1.5 shadow-sm">
              Bookable Service
            </span>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-paper drop-shadow-md leading-tight">
              {s.name}
            </h2>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Price & Duration Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-paper-warm border border-ink/10">
            <div>
              <span className="text-[11px] uppercase font-bold text-ink-muted block">Service Rate</span>
              <span className="font-display font-black text-2xl text-ink">
                R{Number(s.price).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-right">
              {s.duration && (
                <div>
                  <span className="text-[11px] uppercase font-bold text-ink-muted block">Duration</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-ink">
                    <Clock size={14} className="text-accent-deep" />
                    {s.duration}
                  </span>
                </div>
              )}
              <div className="pl-4 border-l border-ink/15">
                <span className="text-[11px] uppercase font-bold text-emerald-700 block">Instant Booking</span>
                <span className="text-xs font-bold text-ink">Available Today</span>
              </div>
            </div>
          </div>

          {/* Provider Details Card */}
          {merchant && (
            <div className="p-4 rounded-2xl border border-ink/15 bg-paper flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={merchant.logo || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=150&q=80'}
                  alt={merchant.name}
                  className="w-12 h-12 rounded-xl object-cover border border-ink/10"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-ink">{merchant.name}</h4>
                    {merchant.isVerified && (
                      <ShieldCheck size={14} className="text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted">{merchant.suburb} • {merchant.rating || 5.0} ★</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenStorefront}
                className="px-3 py-1.5 rounded-xl border border-ink/20 hover:bg-paper-warm text-xs font-bold text-ink transition-colors shrink-0"
              >
                View Business
              </button>
            </div>
          )}

          {/* Service Description */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-ink-soft">About This Service</h4>
            <p className="text-xs text-ink/80 leading-relaxed whitespace-pre-line">
              {s.desc || 'Professional, high-standard local service conducted by verified neighborhood specialists. All equipment, sanitization, and expert care provided.'}
            </p>
          </div>

          {/* Service Highlights / Guarantees */}
          <div className="space-y-2 pt-2 border-t border-ink/10">
            <h4 className="font-bold text-xs uppercase tracking-wider text-ink-soft">Booking Protection</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink-muted">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                <span>Confirmed appointment slot</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                <span>Direct WhatsApp contact</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                <span>Free cancellation up to 2h prior</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                <span>Pay on completion or upfront</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-ink/10 bg-paper-warm flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleStartChat}
            className="px-4 py-3 rounded-2xl border border-ink/20 bg-paper hover:bg-paper-warm text-ink text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">Ask Question</span>
          </button>

          <button
            type="button"
            onClick={handleOpenBooking}
            className="flex-1 py-3 px-6 rounded-2xl bg-accent hover:bg-accent-hover text-ink font-extrabold text-xs transition-all shadow-raised flex items-center justify-center gap-2"
          >
            <Calendar size={16} />
            <span>Book Appointment • R{Number(s.price).toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
