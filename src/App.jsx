import React, { lazy, Suspense } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import Footer from './components/Footer';
import MobileNav from './components/MobileNav';
import LoadingState from './components/common/LoadingState';

// Core Consumer Views (Immediate)
import MarketplaceHome from './consumer/MarketplaceHome';
import StorefrontView from './consumer/StorefrontView';
import CategoriesPage from './consumer/CategoriesPage';
import SearchPage from './consumer/SearchPage';
import BusinessListingsPage from './consumer/BusinessListingsPage';

// Lazy-loaded Consumer Views (On-demand)
const BrandsChannel = lazy(() => import('./consumer/BrandsChannel'));
const OrdersPage = lazy(() => import('./consumer/OrdersPage'));
const BookingsPage = lazy(() => import('./consumer/BookingsPage'));
const FavouritesPage = lazy(() => import('./consumer/FavouritesPage'));
const ProfilePage = lazy(() => import('./consumer/ProfilePage'));

// Core Consumer Modals & Drawers
import ProductModal from './consumer/ProductModal';
import ServiceModal from './consumer/ServiceModal';
import OrderDetailModal from './consumer/OrderDetailModal';
import BookingDetailModal from './consumer/BookingDetailModal';
import EditProfileModal from './consumer/EditProfileModal';
import CartDrawer from './consumer/CartDrawer';
import ChatDrawer from './consumer/ChatDrawer';
import BookingModal from './consumer/BookingModal';
import ReviewModal from './consumer/ReviewModal';

// Lazy-loaded Heavy Modals
const CheckoutModal = lazy(() => import('./consumer/CheckoutModal'));
const RegisterBusinessModal = lazy(() => import('./consumer/RegisterBusinessModal'));
const SplashOnboardingModal = lazy(() => import('./consumer/SplashOnboardingModal'));

// Global Components
import AuthModal from './components/AuthModal';
import NotificationsDrawer from './components/NotificationsDrawer';
import LocationSelectorModal from './components/common/LocationSelectorModal';

// Lazy-loaded Portals
const MerchantHub = lazy(() => import('./merchant/MerchantHub'));
const AdvertiserHub = lazy(() => import('./advertiser/AdvertiserHub'));
const AdminHub = lazy(() => import('./admin/AdminHub'));

export default function App() {
  const { 
    portal, 
    consumerTab, 
    selectedMerchant, 
    toasts,
    isLocationModalOpen,
    setIsLocationModalOpen
  } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-page overflow-x-hidden w-full max-w-full relative">
      <Header />

      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8 flex-1">
        <Suspense fallback={<LoadingState type="spinner" message="Loading..." />}>
          {/* CONSUMER MARKETPLACE */}
          {portal === 'consumer' && (
            <>
              {selectedMerchant ? (
                <StorefrontView />
              ) : consumerTab === 'marketplace' ? (
                <MarketplaceHome />
              ) : consumerTab === 'search' ? (
                <SearchPage />
              ) : consumerTab === 'categories' ? (
                <CategoriesPage />
              ) : consumerTab === 'businesses' ? (
                <BusinessListingsPage />
              ) : consumerTab === 'orders' ? (
                <OrdersPage />
              ) : consumerTab === 'bookings' ? (
                <BookingsPage />
              ) : consumerTab === 'favourites' ? (
                <FavouritesPage />
              ) : consumerTab === 'profile' ? (
                <ProfilePage />
              ) : consumerTab === 'brands' ? (
                <BrandsChannel />
              ) : (
                <MarketplaceHome />
              )}
            </>
          )}

          {/* MERCHANT HUB */}
          {portal === 'merchant' && <MerchantHub />}

          {/* ADVERTISER HUB */}
          {portal === 'advertiser' && <AdvertiserHub />}

          {/* SUPER ADMIN CONSOLE */}
          {portal === 'admin' && <AdminHub />}
        </Suspense>
      </main>

      <Footer />

      {/* Sticky Mobile Bottom Navigation for Consumer */}
      {portal === 'consumer' && <MobileNav />}

      {/* Global Drawers & Modals */}
      <ProductModal />
      <ServiceModal />
      <OrderDetailModal />
      <BookingDetailModal />
      <EditProfileModal />
      <CartDrawer />
      <ChatDrawer />
      <BookingModal />
      <ReviewModal />
      <AuthModal />
      <NotificationsDrawer />
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {/* Lazy Modals */}
      <Suspense fallback={null}>
        <SplashOnboardingModal />
        <CheckoutModal />
        <RegisterBusinessModal />
      </Suspense>

      {/* Toast Notifications - responsive offset to avoid mobile navigation overlap */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-2xl shadow-raised border text-xs font-bold pointer-events-auto animate-in slide-in-from-bottom-2 flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-success text-white border-success' :
              toast.type === 'error' ? 'bg-warning text-white border-warning' :
              'bg-ink text-paper border-ink'
            }`}
          >
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
