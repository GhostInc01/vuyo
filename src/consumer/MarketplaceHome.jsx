import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import SearchBar from '../components/common/SearchBar';
import CategoryCard from '../components/common/CategoryCard';
import BusinessCard from '../components/common/BusinessCard';
import ProductCard from '../components/common/ProductCard';
import ServiceCard from '../components/common/ServiceCard';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { 
  Sparkles, ChevronRight, Store, ShoppingBag, Wrench, 
  Tag, MapPin, ShieldCheck, Ticket, Percent, ArrowRight
} from 'lucide-react';

export default function MarketplaceHome() {
  const {
    user,
    merchants,
    products,
    categories,
    promotions,
    campaigns,
    category,
    setCategory,
    suburb,
    radius,
    activeLocation,
    setIsLocationModalOpen,
    searchQuery,
    setSearchQuery,
    setSelectedMerchant,
    setSelectedProduct,
    setSelectedService,
    setBookingService,
    setIsBookingModalOpen,
    addToCart,
    setConsumerTab,
    toggleFavourite,
    isFavourite,
    setIsRegisterBusinessOpen,
    isLoading,
    loadError,
    refreshData
  } = useApp();

  // Dynamic time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.name ? user.name.split(' ')[0] : 'Neighbour';
    if (hour < 12) return `Sawubona, ${name}! Good morning ☀️`;
    if (hour < 17) return `Good afternoon, ${name}! 🌤️`;
    return `Good evening, ${name}! 🌙`;
  }, [user]);

  // 1. Categories enriched with live counts
  const enrichedCategories = useMemo(() => {
    return categories.slice(0, 6).map(cat => {
      const merchantCount = merchants.filter(m => m.category === cat.name).length;
      const productCount = products.filter(p => p.category === cat.name).length;
      return {
        ...cat,
        itemCount: merchantCount + productCount
      };
    });
  }, [categories, merchants, products]);

  // 2. Nearby businesses (within radius or first few approved)
  const nearbyBusinesses = useMemo(() => {
    return merchants
      .filter(m => {
        if (radius === 'all') return true;
        const d = m.distanceKm !== undefined && m.distanceKm !== null ? m.distanceKm : 2.5;
        return d <= Number(radius);
      })
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
      .slice(0, 6);
  }, [merchants, radius]);

  // 3. Popular businesses (top rated rating >= 4.8)
  const popularBusinesses = useMemo(() => {
    return [...merchants]
      .filter(m => (m.rating || 0) >= 4.8)
      .sort((a, b) => (b.reviewsCount || b.reviews || 0) - (a.reviewsCount || a.reviews || 0))
      .slice(0, 3);
  }, [merchants]);

  // 4. Popular products (physical goods)
  const popularProducts = useMemo(() => {
    return products
      .filter(p => !p.isService)
      .slice(0, 4);
  }, [products]);

  // 5. Popular services (bookable appointments)
  const popularServices = useMemo(() => {
    return products
      .filter(p => p.isService)
      .slice(0, 3);
  }, [products]);

  const handleBookService = (srv) => {
    setBookingService(srv);
    setIsBookingModalOpen(true);
  };

  const handleSearchSubmit = () => {
    setConsumerTab('search');
  };

  return (
    <div className="space-y-10 animate-in fade-in pb-12">
      {/* 1. GREETING & HERO HEADER */}
      <section className="relative rounded-3xl overflow-hidden bg-accent border-2 border-ink shadow-raised p-5 sm:p-10 md:p-12 w-full max-w-full">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-accent-deep/20 pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 rounded-full bg-paper/20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 bg-paper/90 hover:bg-paper border border-ink/20 px-3 py-1.5 rounded-full text-xs font-bold text-ink shadow-sm transition-all hover:scale-105 cursor-pointer text-left group max-w-full"
            title="Click to change discovery area or search radius"
          >
            <MapPin size={14} className="text-accent-deep group-hover:animate-bounce shrink-0" />
            <span className="truncate min-w-0">Discovering in: <strong>{activeLocation?.label || `${suburb}, ${activeLocation?.city || 'Gauteng'}`}</strong> ({radius === 'all' ? 'All SA' : `${radius}km`})</span>
            <span className="text-[10px] bg-ink text-paper px-2 py-0.5 rounded-full font-bold ml-1 shrink-0">Change 📍</span>
          </button>

          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-ink/75">
              {greeting}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-ink leading-tight tracking-tight">
              Your whole neighbourhood, <br className="hidden sm:inline" />
              one trusted marketplace.
            </h1>
          </div>

          <p className="text-xs sm:text-sm md:text-base font-medium text-ink/85 leading-relaxed max-w-2xl">
            Order authentic goods from verified local sellers, warm bakery batches, or book certified trades and beauty professionals in Alberton with escrow protection.
          </p>

          {/* 2. SEARCH BAR ON HERO */}
          <div className="pt-2 max-w-2xl">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearchSubmit}
              placeholder="Search local business, product (e.g. Perfume), or service (e.g. Braids)..."
              category={category}
              onCategoryChange={setCategory}
              categories={categories}
              size="lg"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setConsumerTab('businesses')}
              className="px-5 py-2.5 rounded-xl bg-ink text-paper font-bold text-xs hover:bg-ink-soft transition-all shadow-sm flex items-center gap-2"
            >
              <Store size={14} />
              <span>Browse All Businesses</span>
            </button>
            <button
              onClick={() => setConsumerTab('categories')}
              className="px-5 py-2.5 rounded-xl bg-paper border-2 border-ink text-ink font-bold text-xs hover:bg-paper-warm transition-all shadow-sm flex items-center gap-2"
            >
              <Tag size={14} />
              <span>Explore Categories</span>
            </button>
            <button
              onClick={() => setIsRegisterBusinessOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-accent-soft hover:bg-accent border border-ink/20 text-ink font-bold text-xs transition-colors shadow-sm"
            >
              + Register Business
            </button>
          </div>
        </div>
      </section>

      {/* 8. PROMOTIONS BANNER & VOUCHERS */}
      <section className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-accent/20 to-orange-500/15 border border-accent/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent text-ink flex items-center justify-center shrink-0 shadow-sm">
            <Ticket size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-accent font-black text-[10px] text-ink uppercase tracking-wider">
                VOUCHER
              </span>
              <h3 className="font-display font-extrabold text-sm sm:text-base text-ink">
                R50 OFF Your First Neighborhood Order
              </h3>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Use code <strong className="text-ink font-mono font-bold bg-paper px-1.5 py-0.5 rounded border border-ink/20">LOCALBIZ50</strong> at checkout for orders over R200.
            </p>
          </div>
        </div>

        <button
          onClick={() => setConsumerTab('search')}
          className="px-4 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft transition-colors shrink-0 flex items-center gap-1.5"
        >
          <span>Claim Offer</span>
          <ChevronRight size={14} />
        </button>
      </section>

      {/* Error State Banner */}
      {loadError && (
        <ErrorState
          title="Unable to load marketplace listings"
          message={loadError}
          onRetry={refreshData}
        />
      )}

      {/* 3. CATEGORIES SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-xl text-ink">Browse by Category</h2>
            <p className="text-xs text-ink-muted">Find approved merchants and trades near {suburb}</p>
          </div>
          <button
            onClick={() => setConsumerTab('categories')}
            className="text-xs font-bold text-accent-deep hover:underline inline-flex items-center gap-1"
          >
            View all categories <ArrowRight size={14} />
          </button>
        </div>

        {isLoading ? (
          <LoadingState type="cards" count={6} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {enrichedCategories.map(cat => (
              <CategoryCard
                key={cat.id || cat.name}
                category={cat}
                onClick={() => {
                  setCategory(cat.name);
                  setConsumerTab('search');
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. NEARBY BUSINESSES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-xl text-ink flex items-center gap-2">
              <MapPin size={20} className="text-accent-deep" />
              Nearby Businesses ({nearbyBusinesses.length})
            </h2>
            <p className="text-xs text-ink-muted">Sellers and workshops operating within {radius === 'all' ? 'entire South Africa' : `${radius}km`} of {activeLocation?.suburb || activeLocation?.city || suburb}</p>
          </div>
          <button
            onClick={() => setConsumerTab('businesses')}
            className="text-xs font-bold text-accent-deep hover:underline inline-flex items-center gap-1"
          >
            View all directory <ArrowRight size={14} />
          </button>
        </div>

        {isLoading ? (
          <LoadingState type="cards" count={3} />
        ) : nearbyBusinesses.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No nearby businesses within this radius"
            message={`Try increasing your search radius beyond ${radius}km or exploring adjacent suburbs.`}
            actionLabel="Explore All Businesses"
            onAction={() => setConsumerTab('businesses')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {nearbyBusinesses.map(merchant => (
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
      </section>

      {/* 5. POPULAR BUSINESSES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-xl text-ink flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              Top-Rated Local Favorites
            </h2>
            <p className="text-xs text-ink-muted">Highest customer satisfaction and stellar community reviews (4.8+ ★)</p>
          </div>
          <button
            onClick={() => setConsumerTab('businesses')}
            className="text-xs font-bold text-accent-deep hover:underline inline-flex items-center gap-1"
          >
            See top rated <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {popularBusinesses.map(merchant => (
            <BusinessCard
              key={merchant.id}
              merchant={merchant}
              onClick={() => setSelectedMerchant(merchant)}
              onToggleFavourite={() => toggleFavourite(merchant.id)}
              isFav={isFavourite(merchant.id)}
            />
          ))}
        </div>
      </section>

      {/* 6. POPULAR PRODUCTS */}
      {(isLoading || popularProducts.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-xl text-ink flex items-center gap-2">
                <ShoppingBag size={20} className="text-accent-deep" />
                Popular Local Products
              </h2>
              <p className="text-xs text-ink-muted">Direct from neighbourhood makers, bakeries, and brand distributors</p>
            </div>
            <button
              onClick={() => setConsumerTab('search')}
              className="text-xs font-bold text-accent-deep hover:underline inline-flex items-center gap-1"
            >
              Browse catalog <ArrowRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <LoadingState type="cards" count={4} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {popularProducts.map(product => (
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
          )}
        </section>
      )}

      {/* 7. POPULAR SERVICES */}
      {(isLoading || popularServices.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-xl text-ink flex items-center gap-2">
                <Wrench size={20} className="text-accent-deep" />
                Popular Bookable Services
              </h2>
              <p className="text-xs text-ink-muted">Master trades, beauty specialists, and maintenance pros available for appointments</p>
            </div>
            <button
              onClick={() => setConsumerTab('search')}
              className="text-xs font-bold text-accent-deep hover:underline inline-flex items-center gap-1"
            >
              View all services <ArrowRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <LoadingState type="cards" count={3} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularServices.map(service => (
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
          )}
        </section>
      )}
    </div>
  );
}
