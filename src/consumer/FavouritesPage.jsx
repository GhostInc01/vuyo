import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import BusinessCard from '../components/common/BusinessCard';
import ProductCard from '../components/common/ProductCard';
import ServiceCard from '../components/common/ServiceCard';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';
import { 
  Heart, 
  Search, 
  ArrowRight, 
  Store, 
  ShoppingBag, 
  Wrench, 
  Layers, 
  LogIn
} from 'lucide-react';

export default function FavouritesPage() {
  const { 
    user,
    setIsAuthOpen,
    favourites, 
    toggleFavourite, 
    setSelectedMerchant, 
    setSelectedProduct,
    setSelectedService,
    setBookingService,
    setIsBookingModalOpen,
    addToCart,
    setConsumerTab, 
    isLoading 
  } = useApp();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'business' | 'product' | 'service'
  const [filterQuery, setFilterQuery] = useState('');

  // Normalize favourites by entity type
  const normalizedFavourites = useMemo(() => {
    return (favourites || []).map(f => {
      let resolvedType = f.entityType;
      if (!resolvedType) {
        if (f.product?.isService) resolvedType = 'service';
        else if (f.product) resolvedType = 'product';
        else resolvedType = 'business';
      }
      return {
        ...f,
        type: resolvedType
      };
    });
  }, [favourites]);

  // Counts by type
  const counts = useMemo(() => {
    return {
      all: normalizedFavourites.length,
      business: normalizedFavourites.filter(f => f.type === 'business' && f.merchant).length,
      product: normalizedFavourites.filter(f => f.type === 'product' && f.product).length,
      service: normalizedFavourites.filter(f => f.type === 'service' && f.product).length
    };
  }, [normalizedFavourites]);

  // Filtered list based on active tab and query
  const filteredFavourites = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return normalizedFavourites.filter(f => {
      // 1. Tab match
      if (activeTab !== 'all' && f.type !== activeTab) {
        return false;
      }

      // 2. Query match
      if (!q) return true;

      if (f.type === 'business' && f.merchant) {
        return (
          f.merchant.name?.toLowerCase().includes(q) ||
          f.merchant.category?.toLowerCase().includes(q) ||
          f.merchant.suburb?.toLowerCase().includes(q) ||
          f.merchant.tagline?.toLowerCase().includes(q)
        );
      }

      if ((f.type === 'product' || f.type === 'service') && f.product) {
        return (
          f.product.name?.toLowerCase().includes(q) ||
          f.product.desc?.toLowerCase().includes(q) ||
          f.product.category?.toLowerCase().includes(q) ||
          f.product.merchant?.name?.toLowerCase().includes(q)
        );
      }

      return false;
    });
  }, [normalizedFavourites, activeTab, filterQuery]);

  const businesses = useMemo(() => filteredFavourites.filter(f => f.type === 'business' && f.merchant), [filteredFavourites]);
  const products = useMemo(() => filteredFavourites.filter(f => f.type === 'product' && f.product), [filteredFavourites]);
  const services = useMemo(() => filteredFavourites.filter(f => f.type === 'service' && f.product), [filteredFavourites]);

  const handleBookService = (srv) => {
    setBookingService(srv);
    setIsBookingModalOpen(true);
  };

  // If user is unauthenticated
  if (!user) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="max-w-md mx-auto p-8 rounded-3xl bg-paper border border-ink/10 shadow-raised space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/20 flex items-center justify-center text-accent-deep">
            <Heart size={28} className="fill-accent text-accent-deep" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-ink">Sign in to view favorites</h2>
          <p className="text-sm text-ink-muted">
            Save your preferred neighborhood stores, bookable services, and must-have products to access them anytime across all your devices.
          </p>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="w-full py-3 px-6 rounded-2xl bg-ink hover:bg-accent hover:text-ink text-paper font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <LogIn size={16} />
            <span>Sign In / Register</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in pb-16">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent-deep text-xs font-bold uppercase tracking-wider mb-2">
            <Heart size={13} className="fill-accent text-accent-deep" />
            <span>Saved Directory</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink">
            Your Favourites
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Quick access to your saved neighborhood stores, products, and bookable services
          </p>
        </div>

        <button
          onClick={() => setConsumerTab('marketplace')}
          className="px-4 py-2 rounded-2xl bg-paper-warm hover:bg-accent/20 border border-ink/10 text-xs font-bold text-ink hover:text-accent-deep transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <span>Explore Marketplace</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 2. Controls: Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-ink/10">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper border border-ink/10 text-ink-muted hover:text-ink hover:bg-paper-warm'
            }`}
          >
            <Layers size={14} />
            <span>All Saved</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'business'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper border border-ink/10 text-ink-muted hover:text-ink hover:bg-paper-warm'
            }`}
          >
            <Store size={14} />
            <span>Businesses</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'business' ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink'
            }`}>
              {counts.business}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('product')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'product'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper border border-ink/10 text-ink-muted hover:text-ink hover:bg-paper-warm'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Products</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'product' ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink'
            }`}>
              {counts.product}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('service')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'service'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper border border-ink/10 text-ink-muted hover:text-ink hover:bg-paper-warm'
            }`}
          >
            <Wrench size={14} />
            <span>Services</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'service' ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink'
            }`}>
              {counts.service}
            </span>
          </button>
        </div>

        {/* Search within favorites */}
        {counts.all > 0 && (
          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search saved items..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-paper border border-ink/15 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-accent"
            />
          </div>
        )}
      </div>

      {/* 3. Main Content Display */}
      {isLoading ? (
        <LoadingState type="business" count={3} />
      ) : counts.all === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites saved yet"
          message="Tap the heart icon on any neighborhood business, product, or service to save it here for fast re-orders and instant bookings."
          actionLabel="Explore Neighborhood Marketplace"
          onAction={() => setConsumerTab('marketplace')}
        />
      ) : filteredFavourites.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching favorites"
          message={`No saved ${activeTab === 'all' ? 'items' : activeTab + 's'} match "${filterQuery}". Try clearing your search filter.`}
          actionLabel="Clear Filter"
          onAction={() => setFilterQuery('')}
        />
      ) : activeTab === 'all' ? (
        // Unified "All" View: Sections for Businesses, Products, and Services
        <div className="space-y-10">
          {/* Saved Businesses Section */}
          {businesses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-lg text-ink flex items-center gap-2">
                  <Store size={18} className="text-accent-deep" />
                  <span>Saved Businesses ({businesses.length})</span>
                </h2>
                <button
                  onClick={() => setActiveTab('business')}
                  className="text-xs font-bold text-accent-deep hover:underline"
                >
                  View only businesses
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map(f => (
                  <BusinessCard
                    key={f.id}
                    merchant={f.merchant}
                    onClick={() => setSelectedMerchant(f.merchant)}
                    onToggleFavourite={() => toggleFavourite(f.merchantId, 'business')}
                    isFav={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Saved Products Section */}
          {products.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-lg text-ink flex items-center gap-2">
                  <ShoppingBag size={18} className="text-accent-deep" />
                  <span>Saved Products ({products.length})</span>
                </h2>
                <button
                  onClick={() => setActiveTab('product')}
                  className="text-xs font-bold text-accent-deep hover:underline"
                >
                  View only products
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(f => (
                  <ProductCard
                    key={f.id}
                    product={f.product}
                    onClick={() => setSelectedProduct(f.product)}
                    onAddToCart={() => addToCart(f.product)}
                    onToggleFavourite={() => toggleFavourite(f.productId, 'product')}
                    isFav={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Saved Services Section */}
          {services.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-lg text-ink flex items-center gap-2">
                  <Wrench size={18} className="text-accent-deep" />
                  <span>Saved Services ({services.length})</span>
                </h2>
                <button
                  onClick={() => setActiveTab('service')}
                  className="text-xs font-bold text-accent-deep hover:underline"
                >
                  View only services
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(f => (
                  <ServiceCard
                    key={f.id}
                    service={f.product}
                    onClick={() => setSelectedService(f.product)}
                    onBook={() => handleBookService(f.product)}
                    onToggleFavourite={() => toggleFavourite(f.productId, 'service')}
                    isFav={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'business' ? (
        // Business Tab View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map(f => (
            <BusinessCard
              key={f.id}
              merchant={f.merchant}
              onClick={() => setSelectedMerchant(f.merchant)}
              onToggleFavourite={() => toggleFavourite(f.merchantId, 'business')}
              isFav={true}
            />
          ))}
        </div>
      ) : activeTab === 'product' ? (
        // Product Tab View
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(f => (
            <ProductCard
              key={f.id}
              product={f.product}
              onClick={() => setSelectedProduct(f.product)}
              onAddToCart={() => addToCart(f.product)}
              onToggleFavourite={() => toggleFavourite(f.productId, 'product')}
              isFav={true}
            />
          ))}
        </div>
      ) : (
        // Service Tab View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(f => (
            <ServiceCard
              key={f.id}
              service={f.product}
              onClick={() => setSelectedService(f.product)}
              onBook={() => handleBookService(f.product)}
              onToggleFavourite={() => toggleFavourite(f.productId, 'service')}
              isFav={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}


