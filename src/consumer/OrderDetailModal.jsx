import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Package, CheckCircle2, Clock, MapPin, Phone, MessageSquare, Store, Truck, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function OrderDetailModal() {
  const {
    selectedOrder,
    setSelectedOrder,
    setSelectedMerchant,
    merchants,
    setActiveChatMerchant,
    cancelOrder
  } = useApp();

  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!selectedOrder) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrder, setSelectedOrder]);

  if (!selectedOrder) return null;

  const order = selectedOrder;
  const merchant = merchants.find(m => m.id === order.merchantId) || order.merchant;

  // 7-step progressive timeline
  const stages = [
    { key: 'PENDING', label: 'Placed', desc: 'Received by merchant' },
    { key: 'ACCEPTED', label: 'Accepted', desc: 'Confirmed by store' },
    { key: 'PROCESSING', label: 'Processing', desc: 'Packing & preparing' },
    { key: 'READY', label: 'Ready', desc: 'Ready for handover' },
    { key: 'OUT_FOR_DELIVERY', label: 'In Transit', desc: 'On courier route' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Delivered to customer' },
    { key: 'COMPLETED', label: 'Completed', desc: 'Order finalized' }
  ];

  const getStageIndex = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'PLACED': return 0;
      case 'ACCEPTED': return 1;
      case 'PROCESSING':
      case 'PREPARING': return 2;
      case 'READY': return 3;
      case 'OUT_FOR_DELIVERY':
      case 'OUT FOR DELIVERY':
      case 'IN TRANSIT': return 4;
      case 'DELIVERED': return 5;
      case 'COMPLETED': return 6;
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(order.status);
  const isCancelled = order.status?.toUpperCase() === 'CANCELLED';
  const isRejected = order.status?.toUpperCase() === 'REJECTED';
  const isTerminalNegative = isCancelled || isRejected;
  const canCancel = ['PENDING', 'Placed'].includes(order.status);

  const handleOpenMerchant = () => {
    if (merchant) {
      setSelectedMerchant(merchant);
      setSelectedOrder(null);
    }
  };

  const handleOpenChat = () => {
    if (merchant) {
      setActiveChatMerchant(merchant);
      setSelectedOrder(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setIsCancelling(true);
    try {
      const updated = await cancelOrder(order.id);
      setSelectedOrder(updated);
    } catch (e) {
      // toast shown in context
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-lg w-full overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-ink/10 flex items-center justify-between bg-paper-warm shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="order-detail-title" className="font-display font-extrabold text-lg text-ink">
                Order #{order.id}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                order.status === 'DELIVERED' || order.status === 'Delivered' || order.status === 'COMPLETED'
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : isTerminalNegative
                  ? 'bg-red-500/15 text-red-700'
                  : 'bg-accent/25 text-ink'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Placed {order.placedAt || 'recently'}
            </p>
          </div>
          <button
            onClick={() => setSelectedOrder(null)}
            className="w-8 h-8 rounded-lg hover:bg-paper text-ink flex items-center justify-center transition-colors"
            aria-label="Close order details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Tracking Stepper / Status Timeline */}
          {isTerminalNegative ? (
            <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-xs text-danger flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-ink">Order {order.status}</strong>
                <span>This order was {order.status.toLowerCase()}. Any reserved items have been released back to store stock.</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Live Status Timeline</h3>
                <span className="text-[10px] font-bold text-accent-deep bg-accent/15 px-2 py-0.5 rounded-full">{order.status}</span>
              </div>
              <div className="grid grid-cols-7 gap-1 relative overflow-x-auto py-1">
                {stages.map((stage, idx) => {
                  const isDone = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <div key={stage.key} className="text-center min-w-[48px]">
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-[10px] transition-colors mb-1 ${
                        isCurrent
                          ? 'bg-accent text-ink ring-2 ring-accent/40 font-black shadow-sm'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-paper border border-ink/20 text-ink-muted'
                      }`}>
                        {isDone && !isCurrent ? <CheckCircle2 size={13} /> : idx + 1}
                      </div>
                      <span className={`text-[9px] block font-bold leading-tight truncate ${isCurrent ? 'text-ink font-black' : isDone ? 'text-emerald-700' : 'text-ink-muted'}`}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Merchant Contact Info */}
          <div className="p-4 rounded-2xl border border-ink/15 bg-paper flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-muted block">Sold & Fulfilled by</span>
              <h4 className="font-bold text-xs text-ink">{order.businessName || merchant?.name || 'Local Merchant'}</h4>
              {merchant?.phone && (
                <p className="text-[11px] text-ink-muted mt-0.5">{merchant.phone}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {merchant && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    className="p-2 rounded-xl bg-paper-warm hover:bg-accent/20 border border-ink/15 text-ink transition-colors"
                    title="Chat with Merchant"
                  >
                    <MessageSquare size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenMerchant}
                    className="px-3 py-1.5 rounded-xl border border-ink/20 hover:bg-paper-warm text-xs font-bold text-ink transition-colors"
                  >
                    Storefront
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Line Items List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Ordered Items</h3>
            <div className="divide-y divide-ink/10 rounded-2xl border border-ink/15 bg-paper overflow-hidden">
              {order.lines && order.lines.length > 0 ? (
                order.lines.map((line, idx) => (
                  <div key={line.id || idx} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-paper-warm border border-ink/10 flex items-center justify-center font-bold text-[11px] text-ink shrink-0">
                        {line.qty}×
                      </span>
                      <span className="font-semibold text-ink">{line.name}</span>
                    </div>
                    <span className="font-bold text-ink shrink-0">
                      R{(Number(line.price || 0) * Number(line.qty || 1)).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3.5 text-xs text-ink-muted">No line item details found.</div>
              )}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-2 text-xs">
            <div className="flex justify-between text-ink-muted">
              <span>Items Total</span>
              <span>
                R{order.lines
                  ? order.lines.reduce((s, l) => s + (l.price * l.qty), 0).toFixed(2)
                  : Number(order.total - 40).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Delivery Fee ({order.deliveryType || 'Standard'})</span>
              <span>R35.00</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Service & Bag Fee</span>
              <span>R5.00</span>
            </div>
            <div className="pt-2 border-t border-ink/10 flex justify-between font-black text-sm text-ink">
              <span>Grand Total</span>
              <span>R{Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery & Payment Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-paper border border-ink/10 space-y-1">
              <span className="text-[10px] font-bold uppercase text-ink-muted flex items-center gap-1">
                <MapPin size={12} /> Delivery Destination
              </span>
              <p className="font-semibold text-ink">{order.address || 'Address provided at checkout'}</p>
              <p className="text-ink-muted text-[11px]">Recipient: {order.customer} ({order.phone})</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-paper border border-ink/10 space-y-1">
              <span className="text-[10px] font-bold uppercase text-ink-muted flex items-center gap-1">
                <ShieldCheck size={12} /> Payment Method
              </span>
              <p className="font-semibold text-ink">{order.paymentMethod || 'Card on Delivery'}</p>
              <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                order.paymentStatus === 'Paid' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'
              }`}>
                {order.paymentStatus || 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink/10 bg-paper-warm flex items-center justify-between shrink-0">
          <div>
            {canCancel && !isTerminalNegative && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
          <button
            onClick={() => setSelectedOrder(null)}
            className="px-6 py-2.5 rounded-xl bg-ink text-paper font-bold text-xs hover:bg-ink/90 transition-colors"
          >
            Close Order
          </button>
        </div>
      </div>
    </div>
  );
}
