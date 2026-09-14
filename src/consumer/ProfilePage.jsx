import React from 'react';
import { useApp } from '../context/AppContext';
import {
  User, Mail, Phone, MapPin, Package, Calendar, Heart, Bell, Edit3,
  LogOut, Shield, Store, ArrowRight, CheckCircle2, Award
} from 'lucide-react';

export default function ProfilePage() {
  const {
    user,
    orders,
    bookings,
    favourites,
    savedProfile,
    setIsEditProfileOpen,
    setIsAuthOpen,
    logout,
    switchDemoRole,
    setConsumerTab,
    setIsNotificationsOpen
  } = useApp();

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-accent/20 text-accent-deep flex items-center justify-center mx-auto">
          <User size={32} />
        </div>
        <h2 className="font-display font-black text-2xl text-ink">Sign In to Your Account</h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          Sign in or create an account to view your purchase history, manage booked appointments, and save favorite neighborhood merchants.
        </p>
        <button
          onClick={() => setIsAuthOpen(true)}
          className="w-full py-3 rounded-2xl bg-accent hover:bg-accent-hover text-ink font-bold text-xs transition-colors shadow-raised"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in">
      {/* Header Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-paper-warm border border-ink/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative">
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'}
              alt={user.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-accent shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent text-ink flex items-center justify-center font-bold text-[10px] shadow-sm">
              ★
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl sm:text-2xl text-ink">
                {user.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-accent/25 text-ink text-[10px] font-bold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <Mail size={13} className="text-accent-deep" />
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-accent-deep" />
                  {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditProfileOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-ink/20 bg-paper hover:bg-paper-warm text-ink text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          <Edit3 size={14} />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => setConsumerTab('orders')}
          className="p-4 rounded-2xl bg-paper border border-ink/10 hover:border-accent text-center transition-all shadow-sm hover:shadow"
        >
          <span className="font-display font-black text-2xl text-ink block">{orders.length}</span>
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mt-0.5">
            Orders Placed
          </span>
        </button>

        <button
          onClick={() => setConsumerTab('bookings')}
          className="p-4 rounded-2xl bg-paper border border-ink/10 hover:border-accent text-center transition-all shadow-sm hover:shadow"
        >
          <span className="font-display font-black text-2xl text-ink block">{bookings.length}</span>
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mt-0.5">
            Bookings
          </span>
        </button>

        <button
          onClick={() => setConsumerTab('favourites')}
          className="p-4 rounded-2xl bg-paper border border-ink/10 hover:border-accent text-center transition-all shadow-sm hover:shadow"
        >
          <span className="font-display font-black text-2xl text-ink block">{favourites.length}</span>
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mt-0.5">
            Saved Favourites
          </span>
        </button>
      </div>

      {/* Saved Delivery Address Card */}
      <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <MapPin size={15} className="text-accent-deep" /> Primary Delivery Location
          </h3>
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="text-[11px] font-bold text-accent-deep hover:underline"
          >
            Update
          </button>
        </div>
        <div className="p-3.5 rounded-xl bg-paper-warm border border-ink/10 text-xs">
          <p className="font-bold text-ink">{savedProfile.name || user.name}</p>
          <p className="text-ink-muted mt-0.5">{savedProfile.address || 'Voortrekker Ave, Alberton North'}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">Phone: {savedProfile.phone || user.phone}</p>
          {savedProfile.notes && (
            <p className="text-[11px] text-ink-soft italic mt-1">Delivery note: "{savedProfile.notes}"</p>
          )}
        </div>
      </div>

      {/* Quick Navigation Menu */}
      <div className="rounded-2xl border border-ink/10 bg-paper divide-y divide-ink/10 overflow-hidden shadow-sm">
        <button
          onClick={() => setConsumerTab('orders')}
          className="w-full p-4 flex items-center justify-between hover:bg-paper-warm transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent-deep flex items-center justify-center">
              <Package size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">Order History & Tracking</h4>
              <p className="text-[11px] text-ink-muted">View past deliveries and receipt invoices</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-muted" />
        </button>

        <button
          onClick={() => setConsumerTab('bookings')}
          className="w-full p-4 flex items-center justify-between hover:bg-paper-warm transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent-deep flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">My Service Bookings</h4>
              <p className="text-[11px] text-ink-muted">View upcoming appointment dates and time slots</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-muted" />
        </button>

        <button
          onClick={() => setConsumerTab('favourites')}
          className="w-full p-4 flex items-center justify-between hover:bg-paper-warm transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent-deep flex items-center justify-center">
              <Heart size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">Favourite Businesses</h4>
              <p className="text-[11px] text-ink-muted">Quick access to bookmarked neighbourhood shops</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-muted" />
        </button>

        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="w-full p-4 flex items-center justify-between hover:bg-paper-warm transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent-deep flex items-center justify-center">
              <Bell size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">Notifications & Alerts</h4>
              <p className="text-[11px] text-ink-muted">Order updates, promos, and system notices</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-muted" />
        </button>
      </div>

      {/* Demo Switcher & Sign Out */}
      <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
        <h4 className="text-[11px] font-bold uppercase text-ink-muted">Account Roles & Testing</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => switchDemoRole('consumer')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              user.role === 'consumer' ? 'bg-accent text-ink border-accent' : 'bg-paper text-ink border-ink/15 hover:bg-paper-warm'
            }`}
          >
            👤 Shopper
          </button>
          <button
            onClick={() => switchDemoRole('business')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              user.role === 'business' ? 'bg-accent text-ink border-accent' : 'bg-paper text-ink border-ink/15 hover:bg-paper-warm'
            }`}
          >
            🏪 Merchant
          </button>
          <button
            onClick={() => switchDemoRole('admin')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              user.role === 'admin' ? 'bg-accent text-ink border-accent' : 'bg-paper text-ink border-ink/15 hover:bg-paper-warm'
            }`}
          >
            🛡️ Admin
          </button>
        </div>

        <div className="pt-2 border-t border-ink/10">
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-xl border border-red-200 bg-paper text-red-700 hover:bg-red-50 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={15} />
            <span>Sign Out of LocalBiz</span>
          </button>
        </div>
      </div>
    </div>
  );
}
