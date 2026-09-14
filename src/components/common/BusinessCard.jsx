import React from 'react';
import { MapPin, ShieldCheck, Clock, Heart, ArrowUpRight } from 'lucide-react';
import Rating from './Rating';

function BusinessCard({
  merchant,
  onSelect = null,
  onClick = null,
  isFav = false,
  onToggleFav = null,
  onToggleFavourite = null,
  viewMode = 'grid',
  className = ''
}) {
  if (!merchant) return null;

  const handleSelect = onSelect || onClick || (() => {});
  const handleToggleFav = onToggleFav || onToggleFavourite;
  const isList = viewMode === 'list';

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={() => handleSelect(merchant)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect(merchant);
        }
      }}
      className={`card-interactive group overflow-hidden flex ${
        isList ? 'flex-col sm:flex-row items-stretch' : 'flex-col'
      } ${className}`}
    >
      {/* Cover Image Container */}
      <div className={`relative bg-paper-warm overflow-hidden ${isList ? 'sm:w-64 h-48 sm:h-auto shrink-0' : 'h-44 w-full'}`}>
        <img
          src={merchant.cover}
          alt={merchant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="bg-paper/90 backdrop-blur text-ink font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {merchant.category}
          </span>

          {handleToggleFav && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFav(merchant.id);
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

        {/* Bottom Status Tag */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {merchant.verified && (
            <span className="bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <ShieldCheck size={11} />
              <span>Verified</span>
            </span>
          )}
          {merchant.openNow && (
            <span className="bg-paper text-success text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              ● Open Now
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-extrabold text-base text-ink group-hover:text-accent-deep transition-colors line-clamp-1">
              {merchant.name}
            </h3>
            <ArrowUpRight size={16} className="text-ink-muted group-hover:text-ink shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>

          <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed mb-3">
            {merchant.tagline || merchant.specialty || merchant.about}
          </p>

          <Rating value={merchant.rating} count={merchant.reviewCount} />
        </div>

        {/* Footer Details Strip */}
        <div className="pt-3 border-t border-ink/10 flex items-center justify-between text-[11px] font-medium text-ink-soft">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
            <MapPin size={12} className="text-accent-deep shrink-0" />
            <span className="truncate">
              {merchant.nearestBranch ? `${merchant.nearestBranch.name || merchant.nearestBranch.suburb}` : merchant.suburb || merchant.city}
            </span>
            {merchant.distanceLabel ? (
              <span className="text-accent-deep font-extrabold bg-accent/20 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                {merchant.distanceLabel}
              </span>
            ) : merchant.distanceKm !== undefined && merchant.distanceKm !== null ? (
              <span className="text-ink-muted shrink-0">({merchant.distanceKm} km)</span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 text-ink-muted shrink-0">
            <Clock size={11} />
            <span>~{merchant.respondsIn?.replace('about ', '')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BusinessCard);
