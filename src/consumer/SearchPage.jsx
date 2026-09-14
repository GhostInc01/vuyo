import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import SearchBar from '../components/common/SearchBar';
import BusinessCard from '../components/common/BusinessCard';
import ProductCard from '../components/common/ProductCard';
import ServiceCard from '../components/common/ServiceCard';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';
import { 
  Search, SlidersHorizontal, Store, ShoppingBag, Wrench, Layers, 
  MapPin, ArrowUpDown, Star, Clock, Navigation, Check, X, ChevronLeft, ChevronRight, RotateCcw
} from 'lucide-react';

export default function SearchPage() {
  const {
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    suburb,
    setSuburb,
    radius,
    activeLocation,
    setIsLocationModalOpen,
    categories,
    setSelectedMerchant,
    setSelectedProduct,
    setSelectedService,
    setBookingService,
    setIsBookingModalOpen,
    addToCart,
    toggleFavourite,
    isFavourite
  } = useApp();

  // Search, Filter & Pagination State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'businesses' | 'products' | 'services'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'rating' | 'distance' | 'price-asc' | 'price-desc' | 'newest'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // Advanced Filters
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const [maxDistance, setMaxDistance] = useState('');
  const [businessType, setBusinessType] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Results State from Server
  const [searchResults, setSearchResults] = useState({
    items: [],
    businesses: [],
    products: [],
    services: [],
    counts: { all: 0, businesses: 0, products: 0, services: 0 },
    pagination: { page: 1, limit: 12, total: 0, totalPages: 1, hasMore: false, hasPrev: false }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Server-side search execution
  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    setSearchError(null);
    try {
      const params = {
        q: searchQuery,
        type: activeTab,
        category: category !== 'All' ? category : undefined,
        suburb: suburb !== 'All' ? suburb : undefined,
        latitude: activeLocation?.latitude,
        longitude: activeLocation?.longitude,
        radius: maxDistance ? Number(maxDistance) : (radius === 'all' ? undefined : radius),
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        openNow: openNow ? true : undefined,
        maxDistance: maxDistance ? Number(maxDistance) : undefined,
        businessType: businessType !== 'all' ? businessType : undefined,
        sortBy,
        page,
        limit
      };

      const data = await api.searchMarketplace(params);
      setSearchResults(data);
    } catch (err) {
      console.error('Marketplace search failed:', err);
      setSearchError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, activeTab, category, suburb, activeLocation?.latitude, activeLocation?.longitude, radius, minPrice, maxPrice, minRating, openNow, maxDistance, businessType, sortBy, page, limit]);

  // Debounce search when query or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 200);
    return () => clearTimeout(timer);
  }, [executeSearch]);

  // Reset to page 1 whenever filters change (except page itself)
  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('All');
    setSuburb('All');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setOpenNow(false);
    setMaxDistance('');
    setBusinessType('all');
    setSortBy('relevance');
    setActiveTab('all');
    setPage(1);
  };

  const handleBookService = (srv) => {
    setBookingService(srv);
    setIsBookingModalOpen(true);
  };

  const activeFilterCount = [
    category !== 'All',
    suburb !== 'All',
    minPrice !== '',
    maxPrice !== '',
    minRating !== '',
    openNow,
    maxDistance !== '',
    businessType !== 'all'
  ].filter(Boolean).length;

  const totalResults = searchResults.pagination?.total || 0;
  const startItemIdx = totalResults === 0 ? 0 : (searchResults.pagination.page - 1) * limit + 1;
  const endItemIdx = Math.min(searchResults.pagination.page * limit, totalResults);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in">
      {/* Search Header Container */}
      <div className="bg-paper-warm border border-ink/10 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={(val) => handleFilterChange(setSearchQuery, val)}
              onSubmit={() => setPage(1)}
              onSelectSuggestion={(sug) => {
                setSearchQuery(sug.text);
                setPage(1);
              }}
              placeholder="Search business name, product (e.g. Perfume), service (e.g. Braids), tags..."
              category={category}
              onCategoryChange={(cat) => handleFilterChange(setCategory, cat)}
              categories={categories}
              size="lg"
            />
          </div>

          {/* Quick Filters: Suburb, Sort & Advanced Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Geographic Discovery Trigger */}
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-1.5 bg-paper hover:bg-accent/15 border border-ink/15 hover:border-accent rounded-2xl px-3 py-2 text-xs font-semibold text-ink transition-colors cursor-pointer group shadow-sm"
              title="Click to change South Africa discovery area or radius"
            >
              <MapPin size={14} className="text-accent-deep group-hover:scale-110 transition-transform" />
              <span className="max-w-[120px] truncate">{activeLocation?.suburb || activeLocation?.city || suburb}</span>
              <span className="text-[10px] text-ink-muted bg-paper-warm px-1.5 py-0.5 rounded font-bold border border-ink/10">
                {radius === 'all' ? 'All SA' : `${radius}km`}
              </span>
              <span className="text-[10px] text-accent-deep font-bold hover:underline">Change</span>
            </button>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-paper border border-ink/15 rounded-2xl px-3 py-2 text-xs font-semibold text-ink">
              <ArrowUpDown size={14} className="text-ink-muted" />
              <select
                value={sortBy}
                onChange={(e) => handleFilterChange(setSortBy, e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-semibold text-ink cursor-pointer"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="rating">Sort: Top Rated</option>
                <option value="distance">Sort: Distance (Closest)</option>
                <option value="price-asc">Sort: Price (Low to High)</option>
                <option value="price-desc">Sort: Price (High to Low)</option>
                <option value="newest">Sort: Newest First</option>
              </select>
            </div>

            {/* Advanced Filters Button Toggle */}
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                isFiltersOpen || activeFilterCount > 0
                  ? 'bg-accent text-ink border border-accent shadow-sm'
                  : 'bg-paper text-ink border border-ink/15 hover:bg-paper-warm'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-ink text-paper text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {isFiltersOpen && (
          <div className="pt-4 border-t border-ink/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
            {/* 1. Price Range */}
            <div className="bg-paper p-3.5 rounded-2xl border border-ink/10 space-y-1.5">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                Price Range (ZAR)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min R"
                  min="0"
                  value={minPrice}
                  onChange={(e) => handleFilterChange(setMinPrice, e.target.value)}
                  className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                />
                <span className="text-ink-muted text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max R"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => handleFilterChange(setMaxPrice, e.target.value)}
                  className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* 2. Minimum Rating */}
            <div className="bg-paper p-3.5 rounded-2xl border border-ink/10 space-y-1.5">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                Minimum Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => handleFilterChange(setMinRating, e.target.value)}
                className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="">Any Rating</option>
                <option value="4.5">★ 4.5 & above (Top Tier)</option>
                <option value="4.0">★ 4.0 & above (Great)</option>
                <option value="3.0">★ 3.0 & above (Good)</option>
                <option value="2.0">★ 2.0 & above</option>
              </select>
            </div>

            {/* 3. Distance Radius */}
            <div className="bg-paper p-3.5 rounded-2xl border border-ink/10 space-y-1.5">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                Max Distance Radius
              </label>
              <select
                value={maxDistance}
                onChange={(e) => handleFilterChange(setMaxDistance, e.target.value)}
                className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="">Any Distance</option>
                <option value="2">Within 2 km (Walking)</option>
                <option value="5">Within 5 km (Neighborhood)</option>
                <option value="10">Within 10 km (Local)</option>
                <option value="25">Within 25 km (Regional)</option>
                <option value="50">Within 50 km</option>
              </select>
            </div>

            {/* 4. Business Type & Open Now */}
            <div className="bg-paper p-3.5 rounded-2xl border border-ink/10 space-y-2">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                Business Type & Status
              </label>
              <select
                value={businessType}
                onChange={(e) => handleFilterChange(setBusinessType, e.target.value)}
                className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent cursor-pointer mb-2"
              >
                <option value="all">All Business Types</option>
                <option value="brand-agent">Brand Agents & Consultants</option>
                <option value="service">Trade & Personal Services</option>
                <option value="retail">Local Retail & Food</option>
              </select>

              <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openNow}
                  onChange={(e) => handleFilterChange(setOpenNow, e.target.checked)}
                  className="rounded text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-success" />
                  <span>Open Now Only</span>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Facet Tabs & Active Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink/10">
          <button
            onClick={() => handleFilterChange(setActiveTab, 'all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper text-ink hover:bg-paper-warm border border-ink/10'
            }`}
          >
            All Results ({searchResults.counts.all})
          </button>
          <button
            onClick={() => handleFilterChange(setActiveTab, 'businesses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
              activeTab === 'businesses'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper text-ink hover:bg-paper-warm border border-ink/10'
            }`}
          >
            <Store size={13} />
            Businesses ({searchResults.counts.businesses})
          </button>
          <button
            onClick={() => handleFilterChange(setActiveTab, 'products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
              activeTab === 'products'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper text-ink hover:bg-paper-warm border border-ink/10'
            }`}
          >
            <ShoppingBag size={13} />
            Products ({searchResults.counts.products})
          </button>
          <button
            onClick={() => handleFilterChange(setActiveTab, 'services')}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
              activeTab === 'services'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper text-ink hover:bg-paper-warm border border-ink/10'
            }`}
          >
            <Wrench size={13} />
            Services ({searchResults.counts.services})
          </button>

          {(searchQuery || activeFilterCount > 0) && (
            <button
              onClick={handleResetFilters}
              className="ml-auto text-xs font-bold text-accent-deep hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Geographic Discovery Context Bar */}
      <div className="bg-accent/15 border border-accent/30 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-accent-deep shrink-0" />
          <span className="text-ink">
            Discovering within <strong>{radius === 'all' ? 'entire South Africa' : `${radius} km`}</strong> of <strong className="text-ink">{activeLocation?.label || `${activeLocation?.suburb}, ${activeLocation?.city}`}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className="text-xs font-bold text-accent-deep hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Change Discovery Area / Radius 📍</span>
        </button>
      </div>

      {/* Results Header: Count & Current Page summary */}
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <div>
          {totalResults > 0 ? (
            <span>Showing <strong className="text-ink font-bold">{startItemIdx}–{endItemIdx}</strong> of <strong className="text-ink font-bold">{totalResults}</strong> results</span>
          ) : (
            <span>No listings match the current criteria</span>
          )}
        </div>

        {/* Limit Selector */}
        <div className="flex items-center gap-1.5">
          <span>Items per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="bg-paper border border-ink/15 rounded-lg px-2 py-0.5 text-xs font-bold text-ink focus:outline-none cursor-pointer"
          >
            <option value="6">6</option>
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="48">48</option>
          </select>
        </div>
      </div>

      {/* Content Rendering: Loading, Empty, or Results */}
      {isLoading ? (
        <LoadingState type="business" count={6} />
      ) : totalResults === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching local listings found"
          message={`We couldn't find matches for "${searchQuery || category}". Try adjusting price, distance radius, or clearing specific filters.`}
          actionLabel="Clear All Search Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="space-y-10">
          {/* Section: Businesses */}
          {(activeTab === 'all' || activeTab === 'businesses') && searchResults.businesses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-ink inline-flex items-center gap-2">
                    <Store size={18} className="text-accent-deep" />
                    Local Businesses ({searchResults.businesses.length})
                  </h2>
                  <p className="text-xs text-ink-muted">Verified neighbourhood storefronts & service providers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {searchResults.businesses.map(merchant => (
                  <BusinessCard
                    key={merchant.id}
                    merchant={merchant}
                    onClick={() => setSelectedMerchant(merchant)}
                    onToggleFavourite={() => toggleFavourite(merchant.id)}
                    isFav={isFavourite(merchant.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Products */}
          {(activeTab === 'all' || activeTab === 'products') && searchResults.products.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-ink inline-flex items-center gap-2">
                    <ShoppingBag size={18} className="text-accent-deep" />
                    Local Products ({searchResults.products.length})
                  </h2>
                  <p className="text-xs text-ink-muted">Available for local delivery or pickup</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => addToCart(product)}
                    onClick={() => setSelectedProduct(product)}
                    isFav={isFavourite(product.id, 'product')}
                    onToggleFavourite={() => toggleFavourite(product.id, 'product')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Services */}
          {(activeTab === 'all' || activeTab === 'services') && searchResults.services.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-ink inline-flex items-center gap-2">
                    <Wrench size={18} className="text-accent-deep" />
                    Bookable Services ({searchResults.services.length})
                  </h2>
                  <p className="text-xs text-ink-muted">Local appointments, styling, repairs, and consultations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.services.map(service => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onBook={() => handleBookService(service)}
                    onClick={() => setSelectedService(service)}
                    isFav={isFavourite(service.id, 'service')}
                    onToggleFavourite={() => toggleFavourite(service.id, 'service')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {searchResults.pagination.totalPages > 1 && (
            <div className="pt-8 border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-ink-muted">
                Page <strong className="text-ink font-bold">{searchResults.pagination.page}</strong> of <strong className="text-ink font-bold">{searchResults.pagination.totalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!searchResults.pagination.hasPrev}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-2 rounded-xl bg-paper border border-ink/15 hover:bg-paper-warm text-ink text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: searchResults.pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === searchResults.pagination.totalPages || Math.abs(p - searchResults.pagination.page) <= 1)
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-2 text-ink-muted text-xs">...</span>}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            p === searchResults.pagination.page
                              ? 'bg-ink text-paper shadow-sm'
                              : 'bg-paper border border-ink/15 hover:bg-paper-warm text-ink'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  disabled={!searchResults.pagination.hasMore}
                  onClick={() => setPage(prev => Math.min(prev + 1, searchResults.pagination.totalPages))}
                  className="px-3 py-2 rounded-xl bg-paper border border-ink/15 hover:bg-paper-warm text-ink text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
