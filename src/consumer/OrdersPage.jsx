import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Package, Clock, CheckCircle, Truck, Store, ArrowRight, MessageCircle, Phone, Star, RefreshCw } from 'lucide-react';

const ORDER_STAGES = ['Pending', 'Preparing', 'Out for delivery', 'Delivered'];

export default function OrdersPage() {
  const { 
    orders, 
    setActiveChatMerchant, 
    merchants, 
    setConsumerTab, 
    setReviewMerchant, 
    setReviewTransaction,
    setIsReviewModalOpen,
    addToCart, 
    products, 
    addToast,
    setSelectedOrder
  } = useApp();
  
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'completed'

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'active') return order.status !== 'Delivered';
    if (filterStatus === 'completed') return order.status === 'Delivered';
    return true;
  });

  const getStageIndex = (status) => {
    const idx = ORDER_STAGES.indexOf(status);
    return idx !== -1 ? idx : 0;
  };

  const handleReorder = (order) => {
    let count = 0;
    (order.lines || []).forEach(line => {
      const prod = products.find(p => p.name === line.name) || {
        id: `p-legacy-${Date.now()}-${Math.random()}`,
        name: line.name,
        price: line.price,
        merchantId: order.merchantId,
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=70'
      };
      addToCart(prod, line.qty);
      count += line.qty;
    });
    addToast(`Added ${count} items back to your cart!`, 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Your Orders</h1>
          <p className="text-xs text-ink-muted">Track deliveries, communicate with local sellers, and confirm receipt</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConsumerTab('marketplace')}
            className="text-xs font-bold text-accent-deep hover:underline flex items-center gap-1"
          >
            <span>Continue Shopping</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
        {[
          { id: 'all', label: 'All Orders', count: orders.length },
          { id: 'active', label: 'In Progress', count: orders.filter(o => o.status !== 'Delivered').length },
          { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'Delivered').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              filterStatus === tab.id
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper text-ink-soft hover:text-ink hover:bg-paper-warm border border-ink/10'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              filterStatus === tab.id ? 'bg-accent text-ink' : 'bg-ink/10 text-ink'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-paper rounded-3xl border border-ink/15 space-y-3">
          <Package size={36} className="mx-auto text-ink-muted" />
          <h3 className="font-display font-bold text-lg text-ink">No orders found</h3>
          <p className="text-xs text-ink-muted">
            {filterStatus === 'active' 
              ? 'You have no active deliveries in transit.' 
              : 'Your active and past neighbourhood orders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map(order => {
            const normStatus = (order.status || '').toUpperCase();
            const isDelivered = normStatus === 'DELIVERED' || normStatus === 'COMPLETED';
            const isOut = order.status === 'Out for delivery' || normStatus === 'OUT_FOR_DELIVERY';
            const currentStageIdx = getStageIndex(order.status);
            const merchant = merchants.find(m => m.id === order.merchantId);

            return (
              <div
                key={order.id}
                className="bg-paper rounded-3xl border border-ink/15 p-6 shadow-card space-y-5 hover:border-ink/25 transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink/10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-accent/20 border border-accent flex items-center justify-center font-bold text-sm text-ink shadow-sm">
                      LBZ
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-extrabold text-base text-ink">
                          {order.businessName}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-paper-warm border border-ink/10 text-ink-muted">
                          #{order.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {order.placedAt} · {order.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                      isDelivered 
                        ? 'bg-success-tint text-success border border-success/30' 
                        : isOut 
                        ? 'bg-warning-tint text-warning border border-warning/30' 
                        : 'bg-paper-warm text-ink border border-ink/15'
                    }`}>
                      {isDelivered ? <CheckCircle size={13} /> : <Truck size={13} />}
                      <span>{order.status}</span>
                    </span>

                    {/* Chat or WhatsApp Shortcut */}
                    {merchant && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveChatMerchant(merchant)}
                          className="p-2 rounded-xl bg-paper-warm hover:bg-paper border border-ink/15 text-ink text-xs font-bold transition-colors"
                          title="Message via Platform Chat"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <a
                          href={`https://wa.me/${(merchant.phone || '27821194432').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${merchant.name}, checking on my LocalBiz Order #${order.id}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-success-tint hover:bg-success/20 text-success border border-success/30 text-xs font-bold transition-colors"
                          title="WhatsApp Seller"
                        >
                          <Phone size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Tracking Stepper */}
                <div className="py-2">
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-paper-warm w-full -z-0 rounded-full" />
                    <div 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-accent -z-0 rounded-full transition-all duration-500"
                      style={{ width: `${(currentStageIdx / (ORDER_STAGES.length - 1)) * 100}%` }}
                    />

                    {ORDER_STAGES.map((stage, idx) => {
                      const isPassed = idx <= currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <div key={stage} className="flex flex-col items-center z-10">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                            isCurrent
                              ? 'bg-accent border-ink text-ink scale-110 shadow-sm'
                              : isPassed
                              ? 'bg-accent border-accent text-ink'
                              : 'bg-paper border-ink/20 text-ink-muted'
                          }`}>
                            {isPassed ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] font-bold mt-1.5 text-center whitespace-nowrap ${
                            isCurrent ? 'text-ink' : isPassed ? 'text-ink-soft' : 'text-ink-muted'
                          }`}>
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Line Items */}
                <div className="bg-paper-warm/40 p-4 rounded-2xl border border-ink/10 space-y-2">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                    Ordered Items
                  </div>
                  <div className="space-y-1.5">
                    {order.lines.map((line, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-ink-soft">
                        <span className="font-medium text-ink">{line.qty}x {line.name}</span>
                        <span className="font-bold text-ink">R{line.price * line.qty}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="pt-2 text-[11px] text-ink-muted border-t border-ink/10">
                      <strong>Delivery Instructions:</strong> {order.notes}
                    </div>
                  )}
                </div>

                {/* Order Footer & Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-ink-muted mr-2">Payment:</span>
                    <span className="capitalize font-semibold text-ink">
                      {order.paymentMethod ? order.paymentMethod.replace('_', ' ') : 'Card on Delivery'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-ink-muted font-bold uppercase">Total Amount</div>
                      <div className="font-display text-xl text-ink font-extrabold">R{order.total}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-2 rounded-xl bg-paper border border-ink/20 hover:bg-paper-warm text-ink font-bold text-xs transition-colors shadow-sm"
                      >
                        View Details
                      </button>

                      {isDelivered ? (
                        <button
                          onClick={() => {
                            const targetMerchant = merchant || { id: order.merchantId, name: order.businessName || 'Local Merchant' };
                            setReviewMerchant(targetMerchant);
                            setReviewTransaction({
                              orderId: order.id,
                              type: 'order',
                              total: order.total,
                              date: order.placedAt || order.createdAt
                            });
                            setIsReviewModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Star size={13} className="fill-ink" />
                          <span>Leave Review</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReorder(order)}
                          className="px-3.5 py-2 rounded-xl bg-paper-warm hover:bg-paper border border-ink/15 text-ink font-bold text-xs transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw size={13} />
                          <span>Reorder</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

