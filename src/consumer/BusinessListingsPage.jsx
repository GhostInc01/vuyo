import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import BusinessCard from '../components/common/BusinessCard';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';
import { Store, MapPin, SlidersHorizontal, Star, ShieldCheck, Clock, Navigation } from 'lucide-react';

export default function BusinessListingsPage() {
  const {
    merchants,
    categories,
    category,
    setCategory,
    suburb,
    setSuburb,
    radius,
    setRadius,
    quickFilter,
    setQuickFilter,
    setSelectedMerchant,
    toggleFavourite,
    isFavourite,
    isLoading
  } = useApp();

  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'name' | 'distance'

  // Filter merchants based on filters
  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => {
      // Must be approved
      if (m.status && m.status.toLowerCase() !== 'approved') return false;

      // Category filter
      if (category !== 'All' && m.category !== category) return false;

      // Suburb filter
      if (suburb && suburb !== 'All' && m.suburb && !m.suburb.toLowerCase().includes(suburb.toLowerCase())) return false;

      // Quick filter
      if (quickFilter === 'open' && !m.isOpen) return false;
      if (quickFilter === 'top-rated' && (m.rating || 0) < 4.8) return false;
      if (quickFilter === 'verified' && !m.isVerified) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [merchants, category, suburb, quickFilter, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent-deep text-xs font-bold uppercase tracking-wider mb-2">
            <Store size={13} />
            <span>Local Business Directory</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">
            Approved Neighborhood Merchants
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Discover verified small businesses, trusted trade contractors, and local service pros.
          </p>
        </div>

        {/* Total Active Counter Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-paper-warm border border-ink/15 rounded-2xl text-right">
            <span className="text-[10px] uppercase font-bold text-ink-muted block">Verified Listings</span>
            <span className="text-lg font-black text-ink">{filteredMerchants.length} / {merchants.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-paper-warm border border-ink/10 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Suburb Selector */}
          <div>
            <label className="block text-[11px] font-bold text-ink-soft mb-1 flex items-center gap-1">
              <MapPin size={13} className="text-accent-deep" /> Suburb / Area
            </label>
            <select
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
            >
              <option value="All">All Suburbs</option>
              <option value="Alberton North">Alberton North</option>
              <option value="Florentia">Florentia</option>
              <option value="New Redruth">New Redruth</option>
              <option value="Meyersdal">Meyersdal</option>
              <option value="Brackendowns">Brackendowns</option>
              <option value="Johannesburg South">Johannesburg South</option>
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-[11px] font-bold text-ink-soft mb-1 flex items-center gap-1">
              <SlidersHorizontal size={13} className="text-accent-deep" /> Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Radius Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-ink-soft flex items-center gap-1">
                <Navigation size={13} className="text-accent-deep" /> Proximity Radius
              </label>
              <span className="text-[11px] font-bold text-accent-deep">{radius} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer mt-1"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-ink-soft mb-1">Sort Directory By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
            >
              <option value="rating">Top Rated (Highest First)</option>
              <option value="name">Alphabetical (A - Z)</option>
              <option value="distance">Nearest Distance</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink/10">
          <span className="text-[11px] font-bold text-ink-muted mr-1">Quick Filters:</span>
          <button
            onClick={() => setQuickFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              quickFilter === 'all'
                ? 'bg-accent text-ink shadow-sm'
                : 'bg-paper text-ink-muted hover:text-ink border border-ink/10'
            }`}
          >
            All Businesses
          </button>
          <button
            onClick={() => setQuickFilter('open')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all ${
              quickFilter === 'open'
                ? 'bg-accent text-ink shadow-sm'
                : 'bg-paper text-ink-muted hover:text-ink border border-ink/10'
            }`}
          >
            <Clock size={12} />
            Open Now
          </button>
          <button
            onClick={() => setQuickFilter('top-rated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all ${
              quickFilter === 'top-rated'
                ? 'bg-accent text-ink shadow-sm'
                : 'bg-paper text-ink-muted hover:text-ink border border-ink/10'
            }`}
          >
            <Star size={12} className="fill-amber-400 text-amber-400" />
            Top Rated (4.8+)
          </button>
          <button
            onClick={() => setQuickFilter('verified')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all ${
              quickFilter === 'verified'
                ? 'bg-accent text-ink shadow-sm'
                : 'bg-paper text-ink-muted hover:text-ink border border-ink/10'
            }`}
          >
            <ShieldCheck size={12} className="text-emerald-600" />
            Verified LocalBiz Only
          </button>

          {(category !== 'All' || suburb !== 'All' || quickFilter !== 'all') && (
            <button
              onClick={() => { setCategory('All'); setSuburb('All'); setQuickFilter('all'); }}
              className="ml-auto text-xs font-bold text-accent-deep hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid of Business Listings */}
      {isLoading ? (
        <LoadingState type="business" count={6} />
      ) : filteredMerchants.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No businesses found matching your criteria"
          message="Try widening your search radius, selecting 'All Suburbs', or clearing the category filter."
          actionLabel="Reset All Filters"
          onAction={() => { setCategory('All'); setSuburb('All'); setQuickFilter('all'); }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredMerchants.map(merchant => (
            <BusinessCard
              key={merchant.id}
              merchant={merchant}
              onClick={() => setSelectedMerchant(merchant)}
              onToggleFavourite={() => toggleFavourite(merchant.id)}
              isFav={isFavourite(merchant.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
