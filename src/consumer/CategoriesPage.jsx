import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CategoryCard from '../components/common/CategoryCard';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';
import { Grid, Layers, Sparkles, ArrowRight, Search } from 'lucide-react';

export default function CategoriesPage() {
  const { categories, merchants, products, setCategory, setConsumerTab, isLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Compute live item counts for each category from actual DB data
  const enrichedCategories = categories.map(cat => {
    const merchantCount = merchants.filter(m => m.category === cat.name).length;
    const productCount = products.filter(p => p.category === cat.name).length;
    return {
      ...cat,
      itemCount: merchantCount + productCount,
      merchantCount,
      productCount
    };
  });

  const filteredCategories = enrichedCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectCategory = (catName) => {
    setCategory(catName);
    setConsumerTab('search');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-ink via-ink/90 to-stone-900 text-paper p-6 sm:p-10 border border-ink/20 shadow-raised">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider mb-3">
            <Layers size={13} />
            <span>Discover Local Economy</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-4xl text-paper tracking-tight">
            Browse All Categories
          </h1>
          <p className="text-paper/70 text-xs sm:text-sm mt-2 leading-relaxed">
            Explore verified neighbourhood businesses, artisan services, fresh goods, and local trade experts across Alberton and greater Johannesburg South.
          </p>

          {/* Quick Search Bar inside categories */}
          <div className="mt-6 max-w-md relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-paper/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter categories (e.g. Beauty, Bakery, Repairs)..."
              className="w-full bg-paper/10 border border-paper/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-paper placeholder:text-paper/40 focus:outline-none focus:border-accent focus:bg-paper/15 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid of Categories */}
      {isLoading ? (
        <LoadingState type="category" count={6} />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No categories found"
          message={`No category matches "${searchTerm}". Try another search term or browse all listings.`}
          actionLabel="Clear Filter"
          onAction={() => setSearchTerm('')}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-lg text-ink">
                Popular Sectors ({filteredCategories.length})
              </h2>
              <p className="text-xs text-ink-muted">Tap any category to view approved merchants and services</p>
            </div>
            <button
              onClick={() => { setCategory('All'); setConsumerTab('search'); }}
              className="text-xs font-bold text-accent-deep hover:underline inline-flex items-center gap-1"
            >
              Browse all items <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {filteredCategories.map((cat) => (
              <CategoryCard
                key={cat.id || cat.name}
                category={cat}
                onClick={() => handleSelectCategory(cat.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent-deep flex items-center justify-center shrink-0 font-bold text-base">
            🌿
          </div>
          <div>
            <h3 className="font-bold text-xs text-ink">Farm-Fresh & Food</h3>
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
              Support local bakeries, butcheries, organic produce stalls, and home catering kitchens in your area.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent-deep flex items-center justify-center shrink-0 font-bold text-base">
            ✂️
          </div>
          <div>
            <h3 className="font-bold text-xs text-ink">Beauty, Hair & Nails</h3>
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
              Book qualified braiders, stylists, nail techs, and skincare professionals with verified reviews.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent-deep flex items-center justify-center shrink-0 font-bold text-base">
            🔧
          </div>
          <div>
            <h3 className="font-bold text-xs text-ink">Home & Auto Care</h3>
            <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
              Find trusted local plumbers, electricians, mobile mechanics, and solar technicians on demand.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
