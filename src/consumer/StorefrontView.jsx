import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  ArrowLeft, Star, MapPin, Clock, ShieldCheck, MessageCircle, 
  Phone, Plus, Check, ShoppingBag, Info, Heart, Share2, Wrench, Calendar, Sparkles,
  Globe, Mail, Layers, Tag, Copy
} from 'lucide-react';
import EmptyState from '../components/common/EmptyState';

export default function StorefrontView() {
  const { 
    selectedMerchant, 
    setSelectedMerchant, 
    products, 
    addToCart, 
    setSelectedProduct,
    setBookingService,
    setIsBookingModalOpen,
    setActiveChatMerchant,
    setIsReviewModalOpen,
    setReviewMerchant,
    toggleFavourite,
    isFavourite,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'reviews' | 'about'
  const [catalogFilterType, setCatalogFilterType] = useState('all'); // 'all' | 'products' | 'services'
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchInStore, setSearchInStore] = useState('');
  const [storePromos, setStorePromos] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (selectedMerchant?.id) {
      api.getPromotions(selectedMerchant.id)
        .then(data => {
          if (Array.isArray(data)) setStorePromos(data);
        })
        .catch(() => {});
    }
  }, [selectedMerchant?.id]);

  const handleCopyCode = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    addToast(`Coupon code "${code}" copied! Apply at checkout.`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (!selectedMerchant) return null;

  const merchantProducts = products.filter(p => p.merchantId === selectedMerchant.id);
  const merchantProductsOnly = merchantProducts.filter(p => !p.isService);
  const merchantServicesOnly = merchantProducts.filter(p => p.isService);
  const categories = ['All', ...new Set(merchantProducts.map(p => p.category))];

  const filteredProducts = merchantProducts.filter(p => {
    if (catalogFilterType === 'products' && p.isService) return false;
    if (catalogFilterType === 'services' && !p.isService) return false;
    const matchesCat = selectedCat === 'All' || p.category === selectedCat;
    const matchesSearch = !searchInStore || 
      p.name.toLowerCase().includes(searchInStore.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchInStore.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const reviews = selectedMerchant.reviews || [];
  const fav = isFavourite(selectedMerchant.id);

  const ratingSummary = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.min(Math.max(Math.round(r.rating || 5), 1), 5);
      counts[star] = (counts[star] || 0) + 1;
    });
    const total = reviews.length;
    return {
      averageRating: selectedMerchant.rating || 5.0,
      reviewCount: total,
      distribution: counts,
      breakdown: {
        5: total > 0 ? Math.round((counts[5] / total) * 100) : 0,
        4: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
        3: total > 0 ? Math.round((counts[3] / total) * 100) : 0,
        2: total > 0 ? Math.round((counts[2] / total) * 100) : 0,
        1: total > 0 ? Math.round((counts[1] / total) * 100) : 0
      }
    };
  }, [reviews, selectedMerchant.rating]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    addToast(`Store link for "${selectedMerchant.name}" copied!`, 'success');
  };

  const whatsappPhone = selectedMerchant.phone?.replace(/[^0-9]/g, '') || '';
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Sawubona ${selectedMerchant.owner}! I saw your store "${selectedMerchant.name}" on LocalBiz and would like to ask about your products & services.`)}`;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Controls Strip */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedMerchant(null)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-paper hover:bg-paper-warm border border-ink/15 text-xs font-bold text-ink transition-colors shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to all businesses</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleFavourite(selectedMerchant.id)}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold ${fav ? 'bg-warning-tint border-warning text-warning' : 'bg-paper border-ink/15 hover:bg-paper-warm text-ink'}`}
            title="Save to favourites"
          >
            <Heart size={15} className={fav ? 'fill-warning' : ''} />
            <span className="hidden sm:inline">{fav ? 'Saved' : 'Save'}</span>
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-paper hover:bg-paper-warm border border-ink/15 text-ink transition-colors flex items-center gap-1 text-xs font-bold"
            title="Share Store"
          >
            <Share2 size={15} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Store Header Banner */}
      <div className="rounded-3xl bg-paper border border-ink/15 overflow-hidden shadow-card">
        <div className="relative h-64 sm:h-72 w-full bg-paper-warm">
          <img
            src={selectedMerchant.cover}
            alt={selectedMerchant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-paper">
            <div className="flex items-center gap-4">
              {/* Business Logo */}
              <img
                src={selectedMerchant.logo || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=150&q=80'}
                alt={selectedMerchant.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-paper shadow-md bg-paper shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="bg-accent text-ink text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {selectedMerchant.category}
                  </span>
                  {selectedMerchant.verified && (
                    <span className="bg-success text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={12} />
                      <span>Verified Trade Seller</span>
                    </span>
                  )}
                  {selectedMerchant.openNow && (
                    <span className="bg-paper/90 text-success text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      ● Open Now
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-paper leading-tight">
                  {selectedMerchant.name}
                </h1>
                <p className="text-xs sm:text-sm text-paper/85 max-w-xl mt-1 leading-relaxed">
                  {selectedMerchant.tagline}
                </p>
              </div>
            </div>

            {/* Quick Contact & WhatsApp Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-success hover:bg-success/90 text-white font-bold text-xs transition-colors shadow-raised flex items-center gap-1.5"
              >
                <Phone size={14} />
                <span>WhatsApp Seller</span>
              </a>

              <button
                onClick={() => setActiveChatMerchant(selectedMerchant)}
                className="px-3.5 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-1.5"
              >
                <MessageCircle size={15} />
                <span>Chat</span>
              </button>

              <a
                href={`tel:${selectedMerchant.phone}`}
                className="px-3 py-2 rounded-xl bg-paper/90 text-ink font-bold text-xs hover:bg-paper transition-colors flex items-center gap-1.5"
              >
                <Phone size={13} />
                <span>Call</span>
              </a>
            </div>
          </div>
        </div>

        {/* Info Strip */}
        <div className="px-6 py-4 bg-paper-warm border-t border-ink/10 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-ink-soft">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <Star size={14} className="fill-accent text-accent-deep" />
              <span>{selectedMerchant.rating} rating</span>
              <span className="text-ink-muted">({selectedMerchant.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-accent-deep" />
              <span>{selectedMerchant.suburb} ({selectedMerchant.distanceKm} km)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>Replies in {selectedMerchant.respondsIn}</span>
            </div>
          </div>
          <div className="text-[11px] text-ink-muted">
            Owner: <strong className="text-ink font-bold">{selectedMerchant.owner}</strong> · {selectedMerchant.phone}
          </div>
        </div>

        {/* Active Promotions & Coupons Banner */}
        {storePromos.length > 0 && (
          <div className="px-6 py-3.5 bg-amber-500/10 border-t border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-amber-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                Active Store Discounts & Coupons
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {storePromos.map(promo => (
                <div
                  key={promo.id}
                  className="bg-paper p-3 rounded-2xl border border-amber-500/20 shadow-sm flex items-center gap-3 shrink-0 min-w-[240px]"
                >
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 shrink-0">
                    <Tag size={16} />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs text-ink">{promo.code}</span>
                      <span className="text-[10px] font-extrabold text-success">
                        {promo.discountType === 'FIXED' ? `R${promo.discountValue} OFF` : `${promo.discountValue || promo.discountPercent}% OFF`}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted truncate">
                      {promo.name || promo.description || (promo.minSpend ? `Min spend R${promo.minSpend}` : 'Store special')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(promo.code)}
                    className="px-2.5 py-1.5 rounded-lg bg-ink text-paper text-[10px] font-bold hover:bg-ink-soft shrink-0 flex items-center gap-1"
                  >
                    {copiedCode === promo.code ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedCode === promo.code ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Store Navigation Tabs */}
        <div className="px-6 border-t border-ink/10 flex items-center gap-2 bg-paper">
          {[
            { id: 'catalog', label: `Catalog & Services (${merchantProducts.length})` },
            { id: 'reviews', label: `Reviews & Ratings (${selectedMerchant.reviewCount})` },
            { id: 'about', label: 'Business Profile & Hours' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-colors ${activeTab === t.id ? 'border-accent text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: CATALOG & SERVICES */}
      {activeTab === 'catalog' && (
        <div className="space-y-5">
          {/* Sub-filtering: Type and Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-ink/10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCatalogFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                  catalogFilterType === 'all'
                    ? 'bg-accent text-ink shadow-sm'
                    : 'bg-paper text-ink-muted hover:text-ink border border-ink/10'
                }`}
              >
                <Layers size={13} />
                <span>All Offerings ({merchantProducts.length})</span>
              </button>
              <button
                onClick={() => setCatalogFilterType('products')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                  catalogFilterType === 'products'
                    ? 'bg-accent text-ink shadow-sm'
                    : 'bg-paper text-ink-muted hover:text-ink border border-ink/10'
                }`}
              >
                <ShoppingBag size={13} />
                <span>Products & Goods ({merchantProductsOnly.length})</span>
              </button>
              <button
                onClick={() => setCatalogFilterType('services')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                  catalogFilterType === 'services'
                    ? 'bg-accent text-ink shadow-sm'
                    : 'bg-paper text-ink-muted hover:text-ink border border-ink/10'
                }`}
              >
                <Wrench size={13} />
                <span>Services ({merchantServicesOnly.length})</span>
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search this store..."
                value={searchInStore}
                onChange={e => setSearchInStore(e.target.value)}
                className="w-full bg-paper border border-ink/15 rounded-xl pl-3 pr-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Category Chips */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors ${selectedCat === cat ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-warm text-ink-soft border border-ink/15'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No items found in this store"
              message="No items matched your current search or category filter in this storefront."
              actionLabel="Clear Store Filters"
              onAction={() => { setCatalogFilterType('all'); setSelectedCat('All'); setSearchInStore(''); }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-paper rounded-2xl border border-ink/15 overflow-hidden shadow-card hover:shadow-raised transition-all flex flex-col justify-between p-4 group"
                >
                  <div>
                    <div 
                      onClick={() => setSelectedProduct(product)}
                      className="relative h-40 w-full rounded-xl overflow-hidden mb-3 bg-paper-warm cursor-pointer"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.isService ? (
                        <span className="absolute top-2 left-2 bg-paper/90 backdrop-blur text-accent-deep text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <Wrench size={10} />
                          <span>Service</span>
                        </span>
                      ) : (
                        <span className="absolute top-2 left-2 bg-paper/90 backdrop-blur text-success text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                          {product.inStock ? 'In Stock' : 'Pre-order'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavourite(product.id, product.isService ? 'service' : 'product');
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur transition-colors shadow-sm ${
                          isFavourite(product.id, product.isService ? 'service' : 'product')
                            ? 'bg-warning text-white'
                            : 'bg-paper/85 text-ink hover:bg-paper hover:text-warning'
                        }`}
                        aria-label="Toggle favourite"
                      >
                        <Heart size={12} className={isFavourite(product.id, product.isService ? 'service' : 'product') ? 'fill-white' : ''} />
                      </button>
                    </div>

                    <div 
                      onClick={() => setSelectedProduct(product)}
                      className="cursor-pointer"
                    >
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                        {product.category}
                      </div>
                      <h3 className="font-display font-bold text-sm text-ink group-hover:text-accent-deep transition-colors leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-ink-soft line-clamp-2 mt-1 leading-relaxed">
                        {product.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-ink/10 flex items-center justify-between">
                    <div className="font-display font-extrabold text-base text-ink">
                      R{product.price}
                    </div>

                    {product.isService ? (
                      <button
                        onClick={() => {
                          setBookingService(product);
                          setIsBookingModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-ink text-paper hover:bg-ink-soft text-xs font-bold transition-colors shadow-sm"
                      >
                        Book Call-Out
                      </button>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVIEWS & RATINGS */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Rating Summary Card */}
          <div className="bg-paper p-6 rounded-3xl border border-ink/15 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent flex flex-col items-center justify-center font-display font-extrabold text-2xl text-ink">
                  <span>{selectedMerchant.rating ? selectedMerchant.rating.toFixed(1) : '5.0'}</span>
                  <span className="text-[10px] font-semibold text-ink-muted">out of 5</span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-accent-deep">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className={i < Math.round(selectedMerchant.rating || 5) ? 'fill-accent text-accent-deep' : 'text-ink/20'} />
                    ))}
                  </div>
                  <div className="text-xs font-bold text-ink mt-0.5">
                    Verified Customer Ratings ({selectedMerchant.reviewCount || reviews.length} reviews)
                  </div>
                  <div className="text-[11px] text-ink-muted">Genuine local transactions verified via LocalBiz</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setReviewMerchant(selectedMerchant);
                  setIsReviewModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-sm shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Star size={14} className="fill-ink" />
                <span>Write a Review</span>
              </button>
            </div>

            {/* 1–5 Star Rating Distribution Breakdown */}
            <div className="space-y-2 max-w-lg">
              <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                Rating Breakdown (1–5 Stars)
              </div>
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingSummary.distribution[star] || 0;
                const pct = ratingSummary.breakdown[star] || 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-bold text-ink-soft flex items-center gap-1">
                      <span>{star}</span>
                      <Star size={12} className="fill-accent text-accent-deep" />
                    </span>
                    <div className="flex-1 h-2.5 bg-paper-warm rounded-full overflow-hidden border border-ink/10">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-medium text-ink-muted text-[11px]">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="p-8 text-center bg-paper rounded-2xl border border-ink/15 text-xs text-ink-muted">
                No written reviews yet. Be the first to review {selectedMerchant.name}!
              </div>
            ) : (
              reviews.map(r => (
                <div key={r.id} className="p-5 rounded-2xl bg-paper border border-ink/15 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-ink flex items-center gap-2 flex-wrap">
                      <span>{r.userName}</span>
                      {r.orderId ? (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                          <ShoppingBag size={10} />
                          Verified Order #{r.orderId.slice(-6)}
                        </span>
                      ) : r.bookingId ? (
                        <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-purple-200">
                          <Calendar size={10} />
                          Verified Booking #{r.bookingId.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-success bg-success-tint px-2 py-0.5 rounded-full">
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} size={12} className="fill-accent text-accent-deep" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">{r.comment}</p>
                  {r.reply && (
                    <div className="mt-2.5 p-3 rounded-xl bg-paper-warm border border-ink/10 text-xs">
                      <span className="font-bold text-accent-deep text-[10px] block uppercase tracking-wider">Response from {selectedMerchant.name}</span>
                      <p className="text-ink text-xs mt-0.5">{r.reply}</p>
                    </div>
                  )}
                  <span className="text-[10px] text-ink-muted block">{new Date(r.createdAt).toLocaleDateString('en-ZA')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BUSINESS PROFILE & HOURS */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-paper p-6 rounded-3xl border border-ink/15 shadow-card space-y-4">
            <h3 className="font-display font-extrabold text-lg text-ink">About {selectedMerchant.name}</h3>
            <p className="text-xs text-ink-soft leading-relaxed">{selectedMerchant.about}</p>

            <div className="pt-3 border-t border-ink/10 space-y-2 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Business Type:</span>
                <strong className="text-ink capitalize">{selectedMerchant.kind}</strong>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Specialty:</span>
                <strong className="text-ink">{selectedMerchant.specialty}</strong>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Suburb:</span>
                <strong className="text-ink">{selectedMerchant.suburb}</strong>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Average Response:</span>
                <strong className="text-ink">{selectedMerchant.respondsIn}</strong>
              </div>
            </div>
          </div>

          <div className="bg-paper p-6 rounded-3xl border border-ink/15 shadow-card space-y-4">
            <h3 className="font-display font-extrabold text-lg text-ink">Operating Hours & Contact Details</h3>
            
            {/* Opening Hours */}
            <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-ink font-bold">
                <Clock size={15} className="text-accent-deep" />
                <span>Weekly Opening Hours</span>
              </div>
              <p className="text-xs text-ink-soft">{selectedMerchant.businessHours || 'Monday - Saturday: 08:00 - 17:30'}</p>
            </div>

            {/* Address, Phone, Email, Website */}
            <div className="space-y-2 pt-2 text-xs divide-y divide-ink/10">
              <div className="flex items-start justify-between py-2">
                <span className="text-ink-muted flex items-center gap-1.5 shrink-0">
                  <MapPin size={14} className="text-accent-deep" /> Physical Address:
                </span>
                <span className="font-bold text-ink text-right">
                  {selectedMerchant.address || `${selectedMerchant.suburb}, Greater Johannesburg`}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-ink-muted flex items-center gap-1.5 shrink-0">
                  <Phone size={14} className="text-accent-deep" /> Direct Phone:
                </span>
                <a href={`tel:${selectedMerchant.phone}`} className="font-bold text-ink hover:underline">
                  {selectedMerchant.phone}
                </a>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-ink-muted flex items-center gap-1.5 shrink-0">
                  <Mail size={14} className="text-accent-deep" /> Official Email:
                </span>
                <a
                  href={`mailto:${selectedMerchant.email || `contact@${selectedMerchant.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.za`}`}
                  className="font-bold text-ink hover:underline"
                >
                  {selectedMerchant.email || `contact@${selectedMerchant.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.za`}
                </a>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-ink-muted flex items-center gap-1.5 shrink-0">
                  <Globe size={14} className="text-accent-deep" /> Website:
                </span>
                <a
                  href={selectedMerchant.website || `https://${selectedMerchant.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.localbiz.co.za`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-accent-deep hover:underline truncate max-w-[200px]"
                >
                  {selectedMerchant.website || `${selectedMerchant.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.localbiz.co.za`}
                </a>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-ink-muted flex items-center gap-1.5 shrink-0">
                  <MessageCircle size={14} className="text-success" /> WhatsApp Support:
                </span>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="font-bold text-success hover:underline">
                  Open WhatsApp Chat →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

