import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Search, ShoppingBag, Heart, User, Store } from 'lucide-react';

export default function MobileNav() {
  const {
    portal,
    consumerTab,
    setConsumerTab,
    setSelectedMerchant,
    orders,
    favourites,
    user,
    setIsAuthOpen
  } = useApp();

  // Only show for consumer portal on mobile devices
  if (portal !== 'consumer') return null;

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
  ).length;

  const favCount = favourites.length;

  const navItems = [
    {
      id: 'marketplace',
      label: 'Home',
      icon: Home,
      badge: null
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      badge: null
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null
    },
    {
      id: 'favourites',
      label: 'Favorites',
      icon: Heart,
      badge: favCount > 0 ? favCount : null
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      badge: null
    }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper/95 backdrop-blur border-t border-ink/15 shadow-raised px-2 py-1.5 flex items-center justify-around"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = consumerTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedMerchant(null);
              setConsumerTab(item.id);
              if (item.id === 'profile' && !user) {
                setIsAuthOpen(true);
              }
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              isActive
                ? 'text-ink font-extrabold scale-105'
                : 'text-ink-muted hover:text-ink font-medium'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition-colors ${isActive ? 'bg-accent/30' : ''}`}>
              <Icon size={20} className={isActive ? 'text-accent-deep stroke-[2.5]' : 'stroke-[1.75]'} />

              {/* Badge */}
              {item.badge !== null && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-accent text-ink font-extrabold text-[9px] flex items-center justify-center border border-ink shadow-sm">
                  {item.badge}
                </span>
              )}
            </div>

            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>

            {/* Active Indicator Dot */}
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-accent-deep mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
