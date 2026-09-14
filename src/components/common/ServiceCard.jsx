import React from 'react';
import { Calendar, Clock, Wrench, Store, ArrowRight, Star, Heart } from 'lucide-react';

function ServiceCard({
  service,
  onSelect = null,
  onClick = null,
  onBook = () => {},
  isFav = false,
  onToggleFav = null,
  onToggleFavourite = null,
  className = ''
}) {
  if (!service) return null;

  const handleSelect = onSelect || onClick || (() => {});
  const handleToggleFav = onToggleFav || onToggleFavourite;

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={() => handleSelect(service)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect(service);
        }
      }}
      className={`card-interactive group overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Service Header / Banner */}
      <div className="relative h-40 bg-paper-warm overflow-hidden">
        <img
          src={service.image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=70"}
          alt={service.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity" />

        {/* Top Badges & Favorite Button */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="bg-paper/90 backdrop-blur text-ink font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Clock size={11} className="text-accent-deep" />
            <span>{service.duration || '1 - 2 hours'}</span>
          </span>

          {handleToggleFav && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFav(service.id);
              }}
              className={`p-1.5 rounded-full backdrop-blur pointer-events-auto transition-colors shadow-sm ${
                isFav ? 'bg-warning text-white' : 'bg-paper/85 text-ink hover:bg-paper hover:text-warning'
              }`}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={14} className={isFav ? 'fill-white' : ''} />
            </button>
          )}
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-accent text-ink font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {service.category || 'Service'}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h4 className="font-display font-bold text-base text-ink group-hover:text-accent-deep transition-colors line-clamp-1 mb-1">
            {service.name}
          </h4>

          {service.desc && (
            <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed mb-3">
              {service.desc}
            </p>
          )}

          {service.merchant && (
            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-ink-soft">
              <div className="flex items-center gap-1.5 min-w-0">
                <Store size={13} className="text-accent-deep shrink-0" />
                <span className="line-clamp-1">{service.merchant.name}</span>
              </div>
              {service.merchant.rating > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-ink font-bold shrink-0">
                  <Star size={12} className="fill-accent text-accent-deep" />
                  <span>{service.merchant.rating.toFixed(1)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & Booking Action */}
        <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-muted block leading-none">Rate</span>
            <span className="font-display font-extrabold text-base text-ink">
              R{Number(service.price).toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBook(service);
            }}
            className="px-3.5 py-2 rounded-xl bg-ink hover:bg-accent hover:text-ink text-paper font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Calendar size={13} />
            <span>Book Pro</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ServiceCard);
