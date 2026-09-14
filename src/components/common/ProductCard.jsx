import React from 'react';
import { Plus, Check, ShoppingBag, Store, Star, Heart } from 'lucide-react';

function ProductCard({
  product,
  onSelect = null,
  onClick = null,
  onAddToCart = () => {},
  isAdded = false,
  isFav = false,
  onToggleFav = null,
  onToggleFavourite = null,
  className = ''
}) {
  if (!product) return null;

  const handleSelect = onSelect || onClick || (() => {});
  const handleToggleFav = onToggleFav || onToggleFavourite;

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={() => handleSelect(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect(product);
        }
      }}
      className={`card-interactive group overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Product Image */}
      <div className="relative h-44 bg-paper-warm overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />

        {/* Stock Badge & Favorite Button Row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur shadow-sm ${
              product.inStock
                ? 'bg-success/90 text-white'
                : 'bg-warning/90 text-white'
            }`}
          >
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </span>

          {handleToggleFav && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFav(product.id);
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

        {/* Category Pill */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-paper/90 backdrop-blur text-ink font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {product.category}
          </span>
        </div>
      </div>

      {/* Content & Price */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h4 className="font-display font-bold text-sm text-ink group-hover:text-accent-deep transition-colors line-clamp-1 mb-1">
            {product.name}
          </h4>

          {product.desc && (
            <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed mb-2">
              {product.desc}
            </p>
          )}

          {product.merchant?.name && (
            <div className="flex items-center justify-between gap-1 text-[11px] text-ink-muted">
              <div className="flex items-center gap-1 min-w-0">
                <Store size={12} className="shrink-0 text-accent-deep" />
                <span className="line-clamp-1">{product.merchant.name}</span>
              </div>
              {product.merchant.rating > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-ink font-bold shrink-0">
                  <Star size={11} className="fill-accent text-accent-deep" />
                  <span>{product.merchant.rating.toFixed(1)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & Add to Cart Footer */}
        <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-muted block leading-none">Price</span>
            <span className="font-display font-extrabold text-base text-ink">
              R{Number(product.price).toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm ${
              !product.inStock
                ? 'bg-paper-warm text-ink-muted cursor-not-allowed border border-ink/10'
                : isAdded
                ? 'bg-success text-white'
                : 'bg-accent hover:bg-accent-hover text-ink'
            }`}
          >
            {isAdded ? <Check size={14} /> : <Plus size={14} />}
            <span>{isAdded ? 'Added' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ProductCard);
