import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Store, Tag, Check, AlertCircle } from 'lucide-react';

export default function CartDrawer() {
  const { 
    isCartOpen, 
    setIsCartOpen, 
    cart, 
    updateCartQty, 
    removeFromCart, 
    clearCart,
    setIsCheckoutOpen,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    addToast 
  } = useApp();

  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'collection'
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCartOpen) {
        setIsCartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const deliveryFee = deliveryType === 'delivery' ? (subtotal > 0 ? 35 : 0) : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const discount = appliedPromo?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount + deliveryFee + platformFee);

  const primaryMerchant = cart[0]?.merchant;

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    try {
      setIsApplyingPromo(true);
      await applyPromoCode(code, primaryMerchant?.id || 'b-avon', cart, subtotal);
      setPromoCode('');
    } catch (err) {
      setPromoError(err.message || 'Invalid promotion code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Group items by merchant for clarity
  const merchantGroups = cart.reduce((groups, item) => {
    const merchantId = item.merchant?.id || 'unknown';
    if (!groups[merchantId]) {
      groups[merchantId] = {
        merchant: item.merchant,
        items: []
      };
    }
    groups[merchantId].items.push(item);
    return groups;
  }, {});

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-md bg-paper h-full shadow-modal flex flex-col justify-between border-l border-ink/20 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-ink font-bold shadow-sm">
              <ShoppingBag size={16} />
            </div>
            <div>
              <h2 id="cart-drawer-title" className="font-display font-extrabold text-lg text-ink">Your Cart</h2>
              <p className="text-[11px] text-ink-muted">{cart.length} item types in basket</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-ink-muted hover:text-warning font-semibold transition-colors"
                title="Clear all items"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-paper-warm flex items-center justify-center text-ink-muted">
                <ShoppingBag size={28} />
              </div>
              <h3 className="font-display font-bold text-base text-ink">Your cart is empty</h3>
              <p className="text-xs text-ink-muted max-w-xs">
                Browse nearby Avon sellers, home bakers, or verified service pros and add items to your cart.
              </p>
            </div>
          ) : (
            <>
              {/* Delivery vs Collection Toggle */}
              <div className="bg-paper-warm p-1.5 rounded-2xl border border-ink/10 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                    deliveryType === 'delivery'
                      ? 'bg-paper text-ink shadow-sm border border-ink/10'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Truck size={14} className={deliveryType === 'delivery' ? 'text-accent-deep' : ''} />
                  <span>Delivery (+R35)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('collection')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                    deliveryType === 'collection'
                      ? 'bg-paper text-ink shadow-sm border border-ink/10'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Store size={14} className={deliveryType === 'collection' ? 'text-accent-deep' : ''} />
                  <span>Self-Collect (R0)</span>
                </button>
              </div>

              {/* Items grouped by merchant */}
              {Object.values(merchantGroups).map(({ merchant, items }) => (
                <div key={merchant?.id || 'unknown'} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Seller: <strong className="text-ink">{merchant?.name || 'Local Seller'}</strong>
                    </span>
                    <span className="text-[10px] text-accent-deep font-semibold">
                      {merchant?.suburb}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map(item => (
                      <div
                        key={item.product.id}
                        className="p-3 rounded-2xl border border-ink/10 bg-paper-warm/50 flex items-center gap-3"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-14 h-14 rounded-xl object-cover bg-paper border border-ink/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-bold text-xs text-ink truncate">
                            {item.product.name}
                          </h4>
                          <div className="text-[11px] text-ink-muted">
                            {item.product.category}
                          </div>
                          <div className="font-bold text-xs text-ink mt-0.5 flex items-center gap-2">
                            <span>R{item.product.price} <span className="text-[10px] font-normal text-ink-muted">each</span></span>
                            {item.product.stockCount !== undefined && item.qty >= item.product.stockCount && (
                              <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.2 rounded">Max stock</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="w-6 h-6 rounded-md bg-paper border border-ink/20 flex items-center justify-center text-xs font-bold text-ink hover:bg-paper-warm transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-ink">{item.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            disabled={item.product.stockCount !== undefined && item.qty >= item.product.stockCount}
                            className="w-6 h-6 rounded-md bg-paper border border-ink/20 flex items-center justify-center text-xs font-bold text-ink hover:bg-paper-warm disabled:opacity-30 transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-1 p-1 text-ink-muted hover:text-warning transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Promo Code Input */}
              <div className="pt-2">
                <form onSubmit={handleApplyPromo} className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                      <input
                        type="text"
                        placeholder="Promo code (e.g. LOCAL10)"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-ink text-paper hover:bg-ink-soft text-xs font-bold transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedPromo && (
                    <div className="flex items-center justify-between text-[11px] text-success font-semibold px-1">
                      <span className="flex items-center gap-1">
                        <Check size={12} />
                        <span>{appliedPromo.label} (-R{discount})</span>
                      </span>
                      <button
                        type="button"
                        onClick={removePromoCode}
                        className="text-ink-muted hover:text-warning"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {promoError && (
                    <div className="text-[11px] text-warning flex items-center gap-1 px-1">
                      <AlertCircle size={12} />
                      <span>{promoError}</span>
                    </div>
                  )}
                </form>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer & Checkout */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-ink/10 bg-paper-warm space-y-3">
            <div className="space-y-1.5 text-xs text-ink-soft">
              <div className="flex justify-between">
                <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span className="font-bold text-ink">R{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span className="font-bold">-R{discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{deliveryType === 'delivery' ? 'Local Delivery Fee' : 'Collection at Store'}</span>
                <span className="font-bold text-ink">{deliveryFee > 0 ? `R${deliveryFee}` : 'Free'}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Escrow Protection</span>
                <span className="font-bold text-ink">R{platformFee}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-ink border-t border-ink/10 pt-2">
                <span>Total Due</span>
                <span>R{total}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout · R{total}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

