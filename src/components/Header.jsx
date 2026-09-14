import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Store, ShoppingBag, MapPin, Search, ChevronDown, User, 
  ShieldCheck, Megaphone, LayoutDashboard, MessageCircle, 
  Menu, X, Sparkles, Bell, Heart, Calendar, PlusCircle, LogIn, LogOut
} from 'lucide-react';

export default function Header() {
  const {
    portal, setPortal,
    consumerTab, setConsumerTab,
    suburb, setSuburb,
    radius, setRadius,
    activeLocation,
    isLocationModalOpen, setIsLocationModalOpen,
    searchQuery, setSearchQuery,
    cart, setIsCartOpen,
    setSelectedMerchant,
    setSelectedProduct,
    user, logout, switchDemoRole, setIsAuthOpen,
    setIsRegisterBusinessOpen,
    setIsNotificationsOpen,
    notifications,
    bookings,
    orders,
    favourites,
    merchants,
    products,
    unreadMessagesCount,
    conversations,
    openChatWithMerchant
  } = useApp();

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const portalMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (portalMenuRef.current && !portalMenuRef.current.contains(e.target)) {
        setIsPortalOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLocationOpen(false);
        setIsPortalOpen(false);
        setIsUserMenuOpen(false);
        setMobileMenuOpen(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const suburbs = ['Alberton North', 'New Redruth', 'Alberton CBD', 'Meyersdal', 'Brackendowns', 'Raceview'];
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const portals = [
    { id: 'consumer', label: 'Consumer Marketplace', icon: ShoppingBag, desc: 'Shop local goods & services' },
    { id: 'merchant', label: 'Merchant Hub', icon: Store, desc: 'Manage catalog, orders & chats' },
    { id: 'advertiser', label: 'Advertiser Hub', icon: Megaphone, desc: 'Sponsor local neighborhood feeds' },
    { id: 'admin', label: 'Super Admin Console', icon: ShieldCheck, desc: 'KYC approvals, ledger & fees' }
  ];

  // Quick search preview results
  const searchResultsMerchants = searchQuery.trim().length > 1 ? merchants.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 3) : [];

  const searchResultsProducts = searchQuery.trim().length > 1 ? products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 4) : [];

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-ink/10 shadow-sm transition-all w-full">
      {/* Top Notification Banner */}
      <div className="bg-accent px-3 sm:px-4 py-1.5 text-xs font-semibold text-ink w-full overflow-hidden">
        <div className="container mx-auto flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-ink text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">LocalBiz SA</span>
            <span className="truncate text-[11px] sm:text-xs">Connecting 35,000+ local micro-enterprises & service pros with neighbors</span>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-ink-soft text-[11px] shrink-0">
            <button 
              onClick={() => setIsRegisterBusinessOpen(true)}
              className="hover:text-ink font-bold flex items-center gap-1 transition-colors"
            >
              <PlusCircle size={12} className="text-ink" />
              <span>Register Your Business</span>
            </button>
            <span>•</span>
            <span>Verified PIRB Pros</span>
            <span>•</span>
            <span>Direct Avon & Blossom Stock</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Logo & Suburb Selector */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          <button 
            onClick={() => { setPortal('consumer'); setConsumerTab('marketplace'); setSelectedMerchant(null); }}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent border-2 border-ink flex items-center justify-center shadow-raised group-hover:scale-105 transition-transform shrink-0">
              <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-6 sm:h-6">
                <rect width="32" height="32" rx="9" fill="#FFB020" />
                <path d="M10 22V11.5l6 6 6-6V22" stroke="#2A1E10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-ink block leading-none">LocalBiz</span>
              <span className="text-[10px] sm:text-[11px] font-medium text-ink-soft hidden sm:block truncate">Neighbourhood Marketplace</span>
            </div>
          </button>

          {/* Active Geographic Discovery Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-ink/15 hover:border-ink/40 bg-paper-warm text-xs font-semibold text-ink transition-all hover:bg-paper group shadow-sm"
              title="Change active discovery location & radius"
            >
              <MapPin size={14} className="text-accent-deep group-hover:scale-110 transition-transform" />
              <span className="max-w-[130px] truncate">{activeLocation?.suburb || activeLocation?.city || suburb}</span>
              <span className="text-[10px] text-ink-muted bg-paper px-1.5 py-0.5 rounded font-bold border border-ink/10">
                {radius === 'all' ? 'All SA' : `${radius}km`}
              </span>
              <span className="text-[10px] text-accent-deep font-bold hover:underline">Change</span>
            </button>
          </div>
        </div>

        {/* Global Search Bar (Only shown in Consumer portal) */}
        {portal === 'consumer' && (
          <div className="flex-1 max-w-md hidden lg:block relative">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search sellers, products, plumbing, Avon, fresh bread..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-paper-warm border border-ink/15 rounded-full pl-9 pr-8 py-2 text-xs font-medium text-ink placeholder-ink-muted focus:outline-none focus:border-accent focus:bg-paper focus:ring-2 focus:ring-accent/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Autocomplete Dropdown */}
            {isSearchFocused && searchQuery.trim().length > 1 && (
              <div className="absolute left-0 right-0 mt-2 bg-paper rounded-2xl border border-ink/15 shadow-modal p-3 z-50 animate-in fade-in slide-in-from-top-2">
                {searchResultsMerchants.length === 0 && searchResultsProducts.length === 0 ? (
                  <div className="text-xs text-ink-muted py-2 text-center">
                    No sellers or items found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResultsMerchants.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1 px-2">Local Sellers</div>
                        <div className="space-y-1">
                          {searchResultsMerchants.map(m => (
                            <div
                              key={m.id}
                              onClick={() => { setSelectedMerchant(m); setSearchQuery(''); }}
                              className="p-2 rounded-xl hover:bg-paper-warm flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <img src={m.cover} alt={m.name} className="w-7 h-7 rounded-lg object-cover" />
                                <div>
                                  <div className="text-xs font-bold text-ink">{m.name}</div>
                                  <div className="text-[10px] text-ink-muted">{m.category} · {m.suburb}</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-accent-deep">Visit →</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResultsProducts.length > 0 && (
                      <div className="border-t border-ink/10 pt-2">
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1 px-2">Products & Services</div>
                        <div className="space-y-1">
                          {searchResultsProducts.map(p => (
                            <div
                              key={p.id}
                              onClick={() => { setSelectedProduct(p); setSearchQuery(''); }}
                              className="p-2 rounded-xl hover:bg-paper-warm flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <img src={p.image} alt={p.name} className="w-7 h-7 rounded-lg object-cover" />
                                <div>
                                  <div className="text-xs font-bold text-ink">{p.name}</div>
                                  <div className="text-[10px] text-ink-muted">{p.category}</div>
                                </div>
                              </div>
                              <span className="text-xs font-extrabold text-ink">R{p.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Consumer Secondary Navigation Tabs */}
        {portal === 'consumer' && (
          <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold">
            {[
              { id: 'marketplace', label: 'Home' },
              { id: 'search', label: 'Search' },
              { id: 'categories', label: 'Categories' },
              { id: 'businesses', label: 'Businesses' },
              { id: 'orders', label: 'Orders', count: orders.length },
              { id: 'bookings', label: 'Bookings', count: bookings.length },
              { id: 'favourites', label: 'Favourites', count: favourites.length },
              { id: 'profile', label: 'Profile' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setConsumerTab(tab.id); setSelectedMerchant(null); }}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${consumerTab === tab.id ? 'bg-ink text-paper shadow-sm' : 'text-ink-soft hover:text-ink hover:bg-paper-warm'}`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${consumerTab === tab.id ? 'bg-accent text-ink' : 'bg-ink/10 text-ink'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}

        {/* Actions & Portal Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Messages Trigger */}
          <button
            onClick={() => {
              if (conversations.length > 0 && conversations[0].merchant) {
                openChatWithMerchant(conversations[0].merchant);
              } else if (merchants.length > 0) {
                openChatWithMerchant(merchants[0]);
              }
            }}
            className="relative p-2 rounded-xl bg-paper-warm hover:bg-accent/20 border border-ink/15 text-ink transition-colors shrink-0"
            title="Messages"
          >
            <MessageCircle size={17} />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-ink text-[9px] font-extrabold flex items-center justify-center border border-ink shadow-sm animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 rounded-xl bg-paper-warm hover:bg-accent/20 border border-ink/15 text-ink transition-colors shrink-0"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-ink text-[9px] font-extrabold flex items-center justify-center border border-ink shadow-sm animate-pulse">
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* Cart Trigger (Consumer) */}
          {portal === 'consumer' && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-paper-warm hover:bg-accent/20 border border-ink/15 text-ink text-xs font-bold transition-colors shrink-0"
            >
              <ShoppingBag size={17} />
              <span className="hidden md:inline">Cart</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-accent text-ink text-[11px] font-extrabold flex items-center justify-center border border-ink shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Portal Switcher Dropdown */}
          <div ref={portalMenuRef} className="relative shrink-0">
            <button
              onClick={() => {
                setIsPortalOpen(prev => !prev);
                setIsUserMenuOpen(false);
                setMobileMenuOpen(false);
              }}
              aria-expanded={isPortalOpen}
              aria-haspopup="menu"
              aria-label="Switch Web Portal"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-ink text-paper hover:bg-ink-soft text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <LayoutDashboard size={15} />
              <span className="hidden md:inline">
                {portal === 'consumer' ? 'Portals' : portals.find(p => p.id === portal)?.label}
              </span>
              <ChevronDown size={14} className="opacity-70" />
            </button>

            {isPortalOpen && (
              <div 
                role="menu"
                aria-label="Portals Menu"
                className="absolute right-0 mt-2 w-72 bg-paper rounded-2xl border border-ink/15 shadow-modal p-2 z-50 animate-in fade-in slide-in-from-top-2"
              >
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider px-3 py-1.5">Switch Web Portal</div>
                <div className="space-y-1">
                  {portals.map(p => {
                    const Icon = p.icon;
                    const isActive = portal === p.id;
                    return (
                      <button
                        key={p.id}
                        role="menuitem"
                        onClick={() => {
                          setPortal(p.id);
                          setIsPortalOpen(false);
                          setSelectedMerchant(null);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-colors ${isActive ? 'bg-accent/20 border border-accent-deep/30' : 'hover:bg-paper-warm'}`}
                      >
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-accent text-ink' : 'bg-paper-warm text-ink-soft'}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">{p.label}</div>
                          <div className="text-[10px] text-ink-muted leading-tight">{p.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Account Menu */}
          <div ref={userMenuRef} className="relative shrink-0">
            <button
              onClick={() => {
                setIsUserMenuOpen(prev => !prev);
                setIsPortalOpen(false);
                setMobileMenuOpen(false);
              }}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              aria-label="User Account and Persona Menu"
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-paper-warm transition-colors shrink-0"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-ink/20 shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent/30 border border-ink/20 flex items-center justify-center font-bold text-xs text-ink">
                  {user?.name?.slice(0, 2).toUpperCase() || 'TN'}
                </div>
              )}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-paper rounded-2xl border border-ink/15 shadow-modal p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="pb-3 border-b border-ink/10 mb-2 px-1">
                  <div className="font-bold text-xs text-ink">{user?.name || 'Guest User'}</div>
                  <div className="text-[11px] text-ink-muted truncate">{user?.email || 'Sign in to access your profile'}</div>
                  <span className="mt-1.5 inline-block bg-accent/20 text-ink font-bold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Role: {user?.role || 'Consumer'}
                  </span>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => { setPortal('consumer'); setConsumerTab('profile'); setSelectedMerchant(null); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-paper-warm text-ink flex items-center gap-2"
                  >
                    <User size={14} className="text-accent-deep" />
                    <span>My Profile & Preferences</span>
                  </button>
                  <button
                    onClick={() => { switchDemoRole('consumer'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-paper-warm text-ink flex items-center gap-2"
                  >
                    <span>👤 Test as Consumer (Thandiwe)</span>
                  </button>
                  <button
                    onClick={() => { switchDemoRole('business'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-paper-warm text-ink flex items-center gap-2"
                  >
                    <span>🏪 Test as Merchant (Nomsa)</span>
                  </button>
                  <button
                    onClick={() => { switchDemoRole('admin'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-paper-warm text-ink flex items-center gap-2"
                  >
                    <span>🛡️ Test as Super Admin (Vuyo)</span>
                  </button>
                </div>

                <div className="border-t border-ink/10 pt-2 mt-2">
                  <button
                    onClick={() => { setIsAuthOpen(true); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-accent-deep hover:bg-paper-warm flex items-center gap-2"
                  >
                    <LogIn size={14} />
                    <span>Sign In or Register</span>
                  </button>
                  {user && (
                    <button
                      onClick={() => { logout(); setIsUserMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-warning hover:bg-paper-warm flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl xl:hidden hover:bg-paper-warm text-ink shrink-0"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Slide Down */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-paper border-t border-ink/10 p-4 space-y-3 animate-in slide-in-from-top-2">
          {/* Mobile Location */}
          <div className="flex items-center justify-between pb-2 border-b border-ink/10">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <MapPin size={14} className="text-accent-deep" />
              <span>{suburb} ({radius}km radius)</span>
            </span>
            <button
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="text-xs font-bold text-accent-deep"
            >
              Change
            </button>
          </div>

          {/* Mobile Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search sellers, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink"
            />
          </div>

          {/* Mobile Tabs */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              onClick={() => { setIsLocationModalOpen(true); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl text-left bg-accent/20 border border-accent/40 text-ink font-bold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-accent-deep" />
                <span className="truncate">📍 {activeLocation?.suburb || activeLocation?.city || suburb} ({radius === 'all' ? 'All SA' : `${radius}km`})</span>
              </span>
              <span className="text-xs text-accent-deep font-bold shrink-0">Change</span>
            </button>
            <button
              onClick={() => { setConsumerTab('marketplace'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'marketplace' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              🛍️ Marketplace Home
            </button>
            <button
              onClick={() => { setConsumerTab('search'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'search' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              🔍 Search Listings
            </button>
            <button
              onClick={() => { setConsumerTab('categories'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'categories' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              🏷️ Categories
            </button>
            <button
              onClick={() => { setConsumerTab('businesses'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'businesses' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              🏪 Businesses
            </button>
            <button
              onClick={() => { setConsumerTab('orders'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'orders' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              📦 My Orders ({orders.length})
            </button>
            <button
              onClick={() => { setConsumerTab('bookings'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'bookings' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              📅 Bookings ({bookings.length})
            </button>
            <button
              onClick={() => { setConsumerTab('favourites'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'favourites' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              ❤️ Saved ({favourites.length})
            </button>
            <button
              onClick={() => { setConsumerTab('profile'); setSelectedMerchant(null); setMobileMenuOpen(false); }}
              className={`p-2 rounded-xl text-left ${consumerTab === 'profile' ? 'bg-ink text-paper' : 'bg-paper-warm text-ink'}`}
            >
              👤 My Profile
            </button>
            <button
              onClick={() => { setIsNotificationsOpen(true); setMobileMenuOpen(false); }}
              className="p-2 rounded-xl text-left bg-paper-warm text-ink flex items-center justify-between"
            >
              <span>🔔 Alerts</span>
              {unreadNotifications > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-extrabold bg-accent text-ink">
                  {unreadNotifications} new
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
