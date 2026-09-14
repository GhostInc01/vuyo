import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Plus, Minus, ShoppingBag, ShieldCheck, Calendar, Clock, Phone, Store, Star, Check, Heart } from 'lucide-react';

export default function ProductModal() {
  const { 
    selectedProduct, 
    setSelectedProduct, 
    addToCart, 
    merchants, 
    setBookingService, 
    setSelectedMerchant, 
    setIsCartOpen,
    toggleFavourite,
    isFavourite
  } = useApp();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedProduct) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct, setSelectedProduct]);

  if (!selectedProduct) return null;

  const merchant = merchants.find(m => m.id === selectedProduct.merchantId);
  const isService = selectedProduct.isService || Boolean(selectedProduct.duration);

  const handleAdd = () => {
    addToCart(selectedProduct, qty);
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const handleBookService = () => {
    setSelectedProduct(null);
    setBookingService({
      service: selectedProduct,
      merchant: merchant
    });
  };

  const isFav = isFavourite(selectedProduct.id, isService ? 'service' : 'product');

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-lg w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="relative h-64 bg-paper-warm shrink-0">
          <img
            src={selectedProduct.image}
            alt={selectedProduct.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => toggleFavourite(selectedProduct.id, isService ? 'service' : 'product')}
            className={`absolute top-4 right-14 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center shadow-md transition-colors ${
              isFav ? 'bg-warning text-white' : 'bg-paper/90 text-ink hover:bg-paper hover:text-warning'
            }`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={16} className={isFav ? 'fill-white' : ''} />
          </button>
          <button
            onClick={() => setSelectedProduct(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-paper/90 backdrop-blur text-ink hover:bg-paper flex items-center justify-center shadow-md transition-colors"
          >
            <X size={18} />
          </button>
          
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span className="bg-ink/90 backdrop-blur-sm text-paper text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isService ? 'Professional Service' : 'Genuine Product'}
            </span>
            {!isService && (selectedProduct.inStock === false || (selectedProduct.stockCount !== undefined && selectedProduct.stockCount <= 0)) ? (
              <span className="bg-danger text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Out of Stock
              </span>
            ) : (
              <span className="bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check size={11} />
                <span>In Stock {selectedProduct.stockCount !== undefined ? `(${selectedProduct.stockCount} left)` : ''}</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-accent-deep uppercase tracking-wider">
                {selectedProduct.category}
              </span>
              {isService && selectedProduct.duration && (
                <span className="text-[11px] font-bold text-ink-muted flex items-center gap-1">
                  <Clock size={12} />
                  <span>Est. {selectedProduct.duration}</span>
                </span>
              )}
            </div>

            <h2 id="product-modal-title" className="font-display font-extrabold text-2xl text-ink leading-tight mt-1">
              {selectedProduct.name}
            </h2>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display font-extrabold text-3xl text-ink">
                R{selectedProduct.price}
              </span>
              {isService && (
                <span className="text-xs text-ink-muted font-medium">call-out base rate</span>
              )}
            </div>
          </div>

          {/* Merchant Quick Info Strip */}
          {merchant && (
            <div 
              onClick={() => {
                setSelectedProduct(null);
                setSelectedMerchant(merchant);
              }}
              className="p-3 bg-paper-warm rounded-2xl border border-ink/10 flex items-center justify-between hover:bg-paper-warm/80 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={merchant.cover}
                  alt={merchant.name}
                  className="w-10 h-10 rounded-xl object-cover border border-ink/10"
                />
                <div>
                  <div className="font-display font-bold text-xs text-ink group-hover:text-accent-deep transition-colors">
                    {merchant.name}
                  </div>
                  <div className="text-[11px] text-ink-muted flex items-center gap-1">
                    <span>{merchant.suburb}</span>
                    <span>·</span>
                    <Star size={11} className="fill-accent text-accent-deep inline" />
                    <span>{merchant.rating}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-accent-deep">
                View Store →
              </span>
            </div>
          )}

          <p className="text-xs text-ink-soft leading-relaxed border-t border-ink/10 pt-3">
            {selectedProduct.desc}
          </p>

          <div className="flex items-center gap-2 text-xs font-semibold text-success bg-success-tint px-3.5 py-2.5 rounded-2xl">
            <ShieldCheck size={16} className="shrink-0" />
            <span>Buyer Escrow active: payment held until satisfaction confirmed.</span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-ink/10 flex items-center gap-3">
            {isService ? (
              /* Service Booking CTA */
              <button
                onClick={handleBookService}
                className="w-full py-3.5 px-6 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2"
              >
                <Calendar size={16} />
                <span>Book Service Call-Out (R{selectedProduct.price})</span>
              </button>
            ) : (
              /* Physical Product Quantity & Add to Cart */
              <>
                {(!selectedProduct.inStock || (selectedProduct.stockCount !== undefined && selectedProduct.stockCount <= 0)) ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-6 rounded-xl bg-ink/10 text-ink-muted font-bold text-xs cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={16} />
                    <span>Product Currently Out of Stock</span>
                  </button>
                ) : (
                  <>
                    <div className="flex items-center border border-ink/20 rounded-xl overflow-hidden bg-paper-warm shrink-0">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="px-3 py-2 text-ink hover:bg-paper transition-colors"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="px-3.5 font-bold text-xs text-ink">{qty}</span>
                      <button
                        onClick={() => {
                          const max = selectedProduct.stockCount !== undefined ? selectedProduct.stockCount : 99;
                          if (qty < max) setQty(qty + 1);
                        }}
                        disabled={selectedProduct.stockCount !== undefined && qty >= selectedProduct.stockCount}
                        className="px-3 py-2 text-ink hover:bg-paper disabled:opacity-40 transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={handleAdd}
                      className="flex-1 py-3 px-5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={15} />
                      <span>Add to Cart · R{selectedProduct.price * qty}</span>
                    </button>

                    {merchant && (
                      <a
                        href={`https://wa.me/${(merchant.phone || '27821194432').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${merchant.name}, I want to order "${selectedProduct.name}" (R${selectedProduct.price}) via LocalBiz.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-success-tint hover:bg-success/20 text-success border border-success/30 transition-colors shrink-0"
                        title="Order via WhatsApp"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

