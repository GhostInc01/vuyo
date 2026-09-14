import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, ShieldCheck, CheckCircle2, CreditCard, Banknote, Truck, Store, QrCode, Phone, ArrowRight, AlertCircle, Tag } from 'lucide-react';

export default function CheckoutModal() {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    cart, 
    placeOrder, 
    suburb, 
    user,
    savedProfile,
    setConsumerTab,
    addToast,
    appliedPromo,
    applyPromoCode,
    removePromoCode
  } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('card_machine'); // 'card_machine' | 'instant_card' | 'cash' | 'instant_eft'
  const [cashTendered, setCashTendered] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCheckoutOpen && !completedOrder) {
        setIsCheckoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, completedOrder, setIsCheckoutOpen]);

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setPhone(user.phone || '');
      setAddress(savedProfile?.address || `14 Voortrekker Ave, ${suburb}`);
      setNotes(savedProfile?.notes || '');
    } else {
      const saved = localStorage.getItem('localbiz_customer');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCustomerName(parsed.name || 'Thandiwe Nkosi');
          setPhone(parsed.phone || '+27 82 119 4432');
          setAddress(parsed.address || `14 Voortrekker Ave, ${suburb}`);
        } catch (e) {}
      } else {
        setCustomerName('Thandiwe Nkosi');
        setPhone('+27 82 119 4432');
        setAddress(`14 Voortrekker Ave, ${suburb}`);
      }
    }
  }, [user, savedProfile, suburb, isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const deliveryFee = deliveryType === 'delivery' ? 35 : 0;
  const platformFee = 5;
  const discount = appliedPromo?.discountAmount || 0;
  const total = Math.max(0, subtotal + deliveryFee + platformFee - discount);
  const primaryMerchant = cart[0]?.merchant;

  const handleApplyPromo = async (e) => {
    if (e) e.preventDefault();
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoError('');
    try {
      await applyPromoCode(promoInput.trim(), primaryMerchant?.id || 'b-avon', cart, subtotal);
      setPromoInput('');
    } catch (err) {
      setPromoError(err.message || 'Invalid promotion code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPaymentError('');

    // Save customer details in localStorage
    localStorage.setItem('localbiz_customer', JSON.stringify({
      name: customerName,
      phone: phone,
      address: address
    }));

    const orderData = {
      merchantId: primaryMerchant?.id || 'b-avon',
      businessName: primaryMerchant?.name || "Nomsa's Avon Corner",
      customer: customerName,
      phone: phone,
      address: deliveryType === 'delivery' ? address : `Self-Collection at ${primaryMerchant?.name || 'Store'} (${primaryMerchant?.suburb})`,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      platformFee: platformFee,
      discount: discount,
      promoCode: appliedPromo?.promotion?.code || undefined,
      total: total,
      status: 'PENDING',
      paymentMethod: paymentMethod,
      deliveryType: deliveryType,
      notes: notes + (paymentMethod === 'cash' && cashTendered ? ` (Customer paying R${cashTendered}, change needed: R${Math.max(0, Number(cashTendered) - total)})` : ''),
      lines: cart.map(i => ({
        productId: i.product.id,
        name: i.product.name,
        qty: i.qty,
        price: i.product.price
      }))
    };

    const res = await placeOrder(orderData);
    const orderObj = res?.order || res;

    if (!orderObj || !orderObj.id) {
      setIsSubmitting(false);
      return;
    }

    // If Instant Card is selected, initiate and process payment through Payment Architecture
    if (paymentMethod === 'instant_card') {
      try {
        const token = localStorage.getItem('localbiz_token');
        // Step 1: Create Payment intent
        const paymentIntent = await api.createPayment({
          orderId: orderObj.id,
          amount: total,
          method: 'CARD',
          provider: 'mock'
        }, token);

        // Step 2: Process payment with Mock Provider (scrubbing sensitive card data)
        const processed = await api.processPayment(paymentIntent.id, {
          cardNumber: cardNumber || '4242 4242 4242 4242',
          amount: total
        }, token);

        setIsSubmitting(false);

        if (processed.status === 'SUCCESS') {
          addToast('Payment approved! Order confirmed.', 'success');
          setCompletedOrder({
            ...orderObj,
            status: 'ACCEPTED',
            paymentStatus: 'Paid',
            merchantPhone: primaryMerchant?.phone || '+27821194432',
            merchantName: primaryMerchant?.name || 'Local Seller'
          });
        } else {
          // Payment Failed: Order remains PENDING, never completed
          const reason = processed.failureReason || 'Payment declined by issuing bank';
          setPaymentError(reason);
          addToast(reason, 'error');
        }
      } catch (err) {
        setIsSubmitting(false);
        setPaymentError(err.message || 'Payment processing failed');
        addToast(err.message || 'Payment failed', 'error');
      }
      return;
    }

    // Default offline/handover payment flow
    setIsSubmitting(false);
    setCompletedOrder({
      ...orderObj,
      merchantPhone: primaryMerchant?.phone || '+27821194432',
      merchantName: primaryMerchant?.name || 'Local Seller'
    });
  };

  const closeCompleted = () => {
    setCompletedOrder(null);
    setIsCheckoutOpen(false);
    setConsumerTab('orders');
  };

  // WhatsApp Order Confirmation URL generator
  const getWhatsAppReceiptUrl = () => {
    if (!completedOrder) return '#';
    const cleanPhone = (completedOrder.merchantPhone || '27821194432').replace(/[^0-9]/g, '');
    const itemsText = (completedOrder.lines || []).map(l => `• ${l.qty}x ${l.name} (R${l.price * l.qty})`).join('\n');
    const msg = `Sawubona ${completedOrder.merchantName}!\n\nI just placed Order #${completedOrder.id} on LocalBiz.\n\nItems:\n${itemsText}\n\nTotal: R${completedOrder.total}\nDelivery: ${completedOrder.address}\nPayment: ${completedOrder.paymentMethod}\nCustomer: ${completedOrder.customer} (${completedOrder.phone})\n\nPlease confirm order receipt. Siyabonga!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-lg w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {completedOrder ? (
          /* Order Placed Success View */
          <div className="p-8 text-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-full bg-success-tint border-2 border-success text-success mx-auto flex items-center justify-center shadow-md animate-in zoom-in">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-success">
                Order Confirmed
              </span>
              <h2 id="checkout-modal-title" className="font-display font-extrabold text-2xl text-ink mt-1">
                Order #{completedOrder.id} Placed!
              </h2>
              <p className="text-xs text-ink-muted max-w-xs mx-auto mt-2">
                Your order of <strong>R{completedOrder.total}</strong> has been logged with {completedOrder.merchantName}.
              </p>
            </div>

            <div className="bg-paper-warm rounded-2xl p-4 border border-ink/10 text-left text-xs space-y-2">
              <div className="flex justify-between font-bold text-ink">
                <span>Payment Mode:</span>
                <span className="capitalize">{completedOrder.paymentMethod?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Handover Address:</span>
                <span className="truncate max-w-[200px] text-right font-medium">{completedOrder.address}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Escrow Status:</span>
                <span className="text-success font-bold">Funds Protected</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={getWhatsAppReceiptUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 rounded-xl bg-success hover:bg-success/90 text-white font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2"
              >
                <Phone size={15} />
                <span>Send WhatsApp Receipt to Seller</span>
              </a>

              <button
                onClick={closeCompleted}
                className="w-full py-3 rounded-xl bg-paper hover:bg-paper-warm border border-ink/15 text-ink font-bold text-xs transition-colors"
              >
                View Order in Tracking
              </button>
            </div>
          </div>
        ) : (
          /* Normal Checkout Form */
          <>
            {/* Header */}
            <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm shrink-0">
              <div>
                <h2 className="font-display font-extrabold text-xl text-ink">Complete Checkout</h2>
                <p className="text-[11px] text-ink-muted">Paying to {primaryMerchant?.name || 'Local Seller'}</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              {/* Delivery vs Collection */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider">
                  1. Delivery Option
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${deliveryType === 'delivery' ? 'border-accent bg-accent/20 font-bold' : 'border-ink/15 hover:bg-paper-warm'}`}
                  >
                    <Truck size={16} className="text-accent-deep shrink-0" />
                    <div>
                      <div className="text-xs text-ink font-bold">Local Delivery</div>
                      <div className="text-[10px] text-ink-muted">+R35 local driver</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('collection')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${deliveryType === 'collection' ? 'border-accent bg-accent/20 font-bold' : 'border-ink/15 hover:bg-paper-warm'}`}
                  >
                    <Store size={16} className="text-accent-deep shrink-0" />
                    <div>
                      <div className="text-xs text-ink font-bold">Collection</div>
                      <div className="text-[10px] text-ink-muted">Free pickup</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Contact & Address Details */}
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider">
                  2. Recipient Information
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Thandiwe Nkosi"
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">South African Phone (WhatsApp)</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+27 82 123 4567"
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {deliveryType === 'delivery' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Street Address & Suburb</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder={`e.g. 14 Voortrekker Ave, ${suburb}`}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Gate / Specific Instructions</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Buzz unit 4B at intercom, call on arrival"
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 pt-3 border-t border-ink/10">
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider">
                  3. Select Payment Method
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('card_machine'); setPaymentError(''); }}
                    className={`p-3 rounded-xl border text-left transition-all ${paymentMethod === 'card_machine' ? 'border-accent bg-accent/20 font-bold shadow-sm' : 'border-ink/15 hover:bg-paper-warm'}`}
                  >
                    <Truck size={16} className="text-accent-deep mb-1" />
                    <div className="text-xs text-ink font-bold leading-tight">Card on Handover</div>
                    <div className="text-[10px] text-ink-muted">Seller card POS</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('instant_card'); setPaymentError(''); }}
                    className={`p-3 rounded-xl border text-left transition-all ${paymentMethod === 'instant_card' ? 'border-accent bg-accent/20 font-bold shadow-sm' : 'border-ink/15 hover:bg-paper-warm'}`}
                  >
                    <CreditCard size={16} className="text-accent-deep mb-1" />
                    <div className="text-xs text-ink font-bold leading-tight">Instant Card</div>
                    <div className="text-[10px] text-ink-muted">Visa / Mastercard</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('cash'); setPaymentError(''); }}
                    className={`p-3 rounded-xl border text-left transition-all ${paymentMethod === 'cash' ? 'border-accent bg-accent/20 font-bold shadow-sm' : 'border-ink/15 hover:bg-paper-warm'}`}
                  >
                    <Banknote size={16} className="text-accent-deep mb-1" />
                    <div className="text-xs text-ink font-bold leading-tight">Cash on Hand</div>
                    <div className="text-[10px] text-ink-muted">Exact or change</div>
                  </button>
                </div>

                {/* Instant Card Form */}
                {paymentMethod === 'instant_card' && (
                  <div className="bg-paper-warm p-3.5 rounded-xl border border-ink/10 space-y-2.5 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="•••• •••• •••• 4242"
                        maxLength="19"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        className="w-full bg-paper border border-ink/15 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="12/28"
                          maxLength="5"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          className="w-full bg-paper border border-ink/15 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-soft uppercase mb-1">CVV</label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength="3"
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value)}
                          className="w-full bg-paper border border-ink/15 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    {paymentError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0 text-red-600" />
                        <span>{paymentError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cash Change Calculator */}
                {paymentMethod === 'cash' && (
                  <div className="bg-paper-warm p-3.5 rounded-xl border border-ink/10 space-y-2 animate-in fade-in">
                    <label className="block text-[10px] font-bold text-ink-soft uppercase">
                      What note will you pay with? (for exact driver change)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">R</span>
                      <input
                        type="number"
                        placeholder={`e.g. ${Math.ceil(total / 50) * 50 || 100}`}
                        value={cashTendered}
                        onChange={e => setCashTendered(e.target.value)}
                        className="w-32 bg-paper border border-ink/15 rounded-lg px-3 py-1.5 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      />
                      {cashTendered && Number(cashTendered) >= total && (
                        <span className="text-xs text-success font-semibold">
                          Change: <strong>R{Number(cashTendered) - total}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Promo Code Input & Active Promo Display */}
              <div className="p-3.5 bg-paper-warm rounded-2xl border border-ink/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={13} className="text-accent-deep" />
                    <span>Have a Promo Code?</span>
                  </span>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="text-[10px] font-bold text-danger hover:underline"
                    >
                      Remove Code
                    </button>
                  )}
                </div>

                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-success/10 border border-success/30 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs bg-paper px-2 py-0.5 rounded-md text-ink">
                        {appliedPromo.promotion?.code}
                      </span>
                      <span className="font-bold text-success">
                        Save R{appliedPromo.discountAmount}
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-muted">Code Applied</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code (e.g. SAVE10)"
                        value={promoInput}
                        onChange={e => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError('');
                        }}
                        className="flex-1 bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-mono font-bold text-ink uppercase focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={!promoInput.trim() || isApplyingPromo}
                        className="px-4 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft disabled:opacity-40 shadow-sm"
                      >
                        {isApplyingPromo ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && (
                      <div className="text-[11px] text-danger font-medium flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{promoError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Escrow Badge */}
              <div className="p-3 bg-paper-warm rounded-xl border border-ink/10 flex items-center gap-2.5 text-xs text-ink-soft">
                <ShieldCheck size={16} className="text-success shrink-0" />
                <span>Buyer Escrow active. Funds held securely until item is handed over to you.</span>
              </div>

              {/* Order Summary & Submit Button */}
              <div className="pt-2 border-t border-ink/10 space-y-3">
                <div className="space-y-1 text-xs text-ink-soft">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span>R{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{deliveryType === 'delivery' ? 'Local Delivery:' : 'Store Collection:'}</span>
                    <span>{deliveryType === 'delivery' ? `R${deliveryFee}` : 'FREE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform & Escrow Protection:</span>
                    <span>R{platformFee}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between font-bold text-success">
                      <span>Promotion Discount:</span>
                      <span>-R{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-ink pt-1 border-t border-ink/10">
                    <span className="font-bold">Total Due:</span>
                    <span className="font-display font-extrabold text-xl text-ink">R{total}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? 'Confirming with Seller...' : `Place Order · R${total}`}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

