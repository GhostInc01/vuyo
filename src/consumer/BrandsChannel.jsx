import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ShieldCheck, MapPin, ChevronRight, Heart, Phone, Search, Star } from 'lucide-react';

export default function BrandsChannel() {
  const { merchants, setSelectedMerchant, suburb, favourites, toggleFavourite } = useApp();
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const brandAgents = merchants.filter(m => m.kind === 'brand-agent');

  const brandsList = ['All', 'Avon', 'Blossom Care', 'Inuka Fragrances', 'Tupperware'];

  const filteredAgents = brandAgents.filter(agent => {
    const matchesBrand = selectedBrand === 'All' || agent.name.toLowerCase().includes(selectedBrand.toLowerCase()) || agent.category.toLowerCase().includes(selectedBrand.toLowerCase()) || agent.tagline.toLowerCase().includes(selectedBrand.toLowerCase());
    const matchesSearch = !searchQuery || agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || agent.suburb.toLowerCase().includes(searchQuery.toLowerCase()) || agent.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBrand && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Brand Hero */}
      <div className="rounded-3xl bg-ink text-paper p-8 md:p-12 border border-ink shadow-raised space-y-4">
        <div className="inline-flex items-center gap-2 bg-accent text-ink px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Direct-Selling Brand Channels</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight">
          Shop Avon, Blossom & Inuka <br />
          from your neighbours.
        </h1>
        <p className="text-xs sm:text-sm text-paper/80 max-w-2xl leading-relaxed">
          Skip 2-week catalog delivery waits. LocalBiz connects you directly to accredited brand representatives holding genuine local stock in {suburb} for same-day delivery or handover.
        </p>

        {/* Brand quick filter chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {brandsList.map(brand => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedBrand === brand
                  ? 'bg-accent text-ink shadow-sm'
                  : 'bg-paper/10 text-paper hover:bg-paper/20'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Results Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search representatives or suburbs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-paper border border-ink/15 rounded-xl pl-9 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent shadow-sm"
          />
        </div>
        <div className="text-xs text-ink-muted font-medium self-end sm:self-auto">
          Showing <strong>{filteredAgents.length}</strong> accredited representatives
        </div>
      </div>

      {/* Brand Representatives Grid */}
      {filteredAgents.length === 0 ? (
        <div className="p-12 text-center bg-paper rounded-3xl border border-ink/15 space-y-3">
          <Sparkles size={32} className="mx-auto text-ink-muted" />
          <h3 className="font-display font-bold text-lg text-ink">No representatives found</h3>
          <p className="text-xs text-ink-muted">Try selecting "All" or adjusting your search keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAgents.map(agent => {
            const isFav = favourites.includes(agent.id);
            return (
              <div
                key={agent.id}
                className="bg-paper rounded-3xl border border-ink/15 p-6 shadow-card hover:shadow-raised transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center group relative"
              >
                <div className="relative shrink-0">
                  <img
                    src={agent.cover}
                    alt={agent.name}
                    className="w-28 h-28 rounded-2xl object-cover border border-ink/10 group-hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => setSelectedMerchant(agent)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(agent.id);
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all ${
                      isFav 
                        ? 'bg-warning text-white border-warning' 
                        : 'bg-paper/80 text-ink-muted hover:text-ink border-ink/10'
                    }`}
                    title={isFav ? 'Remove from Saved' : 'Save Representative'}
                  >
                    <Heart size={14} className={isFav ? 'fill-white' : ''} />
                  </button>
                </div>

                <div className="flex-1 space-y-2 text-left w-full">
                  <div className="flex items-center gap-2">
                    <span className="bg-accent/20 text-ink text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {agent.rank || 'Diamond'} Rep
                    </span>
                    <span className="text-xs font-bold text-ink flex items-center gap-1">
                      <Star size={12} className="fill-accent text-accent-deep" />
                      <span>{agent.rating} ({agent.reviewCount})</span>
                    </span>
                  </div>

                  <h3 
                    onClick={() => setSelectedMerchant(agent)}
                    className="font-display font-extrabold text-xl text-ink group-hover:text-accent-deep transition-colors cursor-pointer"
                  >
                    {agent.name}
                  </h3>

                  <p className="text-xs text-ink-soft line-clamp-2">
                    {agent.tagline}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-ink/10">
                    <span className="flex items-center gap-1 text-ink-muted">
                      <MapPin size={12} className="text-accent-deep" />
                      <span>{agent.suburb} ({agent.distanceKm || 1.2} km)</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${agent.phone ? agent.phone.replace(/[^0-9]/g, '') : '27821194432'}?text=${encodeURIComponent(`Hi ${agent.name}, I found your store on LocalBiz and would like to ask about available stock.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-success-tint hover:bg-success/20 text-success font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Phone size={12} />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => setSelectedMerchant(agent)}
                        className="px-3 py-1.5 rounded-xl bg-ink text-paper hover:bg-ink-soft font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <span>Catalog</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

