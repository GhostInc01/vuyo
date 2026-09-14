import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Portal & Tab Routing
  const [portal, setPortal] = useState('consumer'); // 'consumer' | 'merchant' | 'advertiser' | 'admin'
  const [consumerTab, setConsumerTab] = useState('marketplace'); // 'marketplace' | 'products' | 'brands' | 'services' | 'bookings' | 'orders' | 'favourites'

  // User & Authentication State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('localbiz_user');
    return saved ? JSON.parse(saved) : {
      id: 'u-consumer-1',
      name: 'Thandiwe Nkosi',
      email: 'thandiwe@gmail.com',
      role: 'consumer',
      phone: '+27 82 119 4432',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'
    };
  });
  const [token, setToken] = useState(() => localStorage.getItem('localbiz_token') || '');
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Search & Filter State
  const [activeLocation, setActiveLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('localbiz_active_location');
      return saved ? JSON.parse(saved) : {
        suburb: 'Alberton North',
        city: 'Alberton',
        province: 'Gauteng',
        latitude: -26.2625,
        longitude: 28.1250,
        label: 'Alberton North, Alberton',
        mode: 'DEFAULT'
      };
    } catch (e) {
      return {
        suburb: 'Alberton North',
        city: 'Alberton',
        province: 'Gauteng',
        latitude: -26.2625,
        longitude: 28.1250,
        label: 'Alberton North, Alberton',
        mode: 'DEFAULT'
      };
    }
  });
  const [suburb, setSuburb] = useState(() => activeLocation?.suburb || 'Alberton North');
  const [radius, setRadius] = useState(() => {
    try {
      const saved = localStorage.getItem('localbiz_radius');
      return saved !== null ? (saved === 'all' ? 'all' : Number(saved)) : 10;
    } catch (e) {
      return 10;
    }
  });
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'open' | 'top-rated' | 'verified' | 'fast'
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [savedLocations, setSavedLocations] = useState([]);

  // Data Collections
  const [merchants, setMerchants] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);

  // Modals & Drawers State
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bookingService, setBookingService] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [reviewMerchant, setReviewMerchant] = useState(null);
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRegisterBusinessOpen, setIsRegisterBusinessOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [activeChatMerchant, setActiveChatMerchant] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('localbiz_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [deliveryType, setDeliveryType] = useState('Delivery'); // 'Delivery' | 'Pickup'

  // Saved Profile for Checkout
  const [savedProfile, setSavedProfile] = useState(() => {
    const saved = localStorage.getItem('localbiz_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Thandiwe Nkosi',
      phone: '+27 82 119 4432',
      address: '14 Voortrekker Ave, Alberton North',
      notes: 'Please buzz unit 4B at the gate'
    };
  });

  // Sync Cart & Profile to localStorage
  useEffect(() => {
    localStorage.setItem('localbiz_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('localbiz_profile', JSON.stringify(savedProfile));
  }, [savedProfile]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('localbiz_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('localbiz_user');
    }
  }, [user]);

  // Sync Active Location & Radius to localStorage
  useEffect(() => {
    if (activeLocation) {
      try {
        localStorage.setItem('localbiz_active_location', JSON.stringify(activeLocation));
        if (activeLocation.suburb) {
          setSuburb(activeLocation.suburb);
        } else if (activeLocation.city) {
          setSuburb(activeLocation.city);
        }
      } catch (e) {}
    }
  }, [activeLocation]);

  useEffect(() => {
    try {
      localStorage.setItem('localbiz_radius', String(radius));
    } catch (e) {}
  }, [radius]);

  // Initial Onboarding check
  useEffect(() => {
    const onboarded = localStorage.getItem('localbiz_onboarded');
    if (!onboarded) {
      setIsOnboardingOpen(true);
    }
  }, []);

  // Toast Helper
  const addToast = (msg, type = 'default') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Location Operations
  const selectLocation = (loc, mode = 'MANUAL_LOCATION') => {
    if (!loc) return;
    const newLoc = {
      suburb: loc.suburb || loc.city,
      city: loc.city || 'Johannesburg',
      province: loc.province || 'Gauteng',
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      label: loc.label || loc.formattedAddress || `${loc.suburb ? loc.suburb + ', ' : ''}${loc.city}`,
      mode
    };
    setActiveLocation(newLoc);
    addToast(`Discovery area set to ${newLoc.label}`, 'success');
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      addToast('GPS location is not supported by your browser.', 'warning');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const rev = await api.reverseGeocode(lat, lng);
          const detected = {
            suburb: rev?.suburb || 'Current Location',
            city: rev?.city || 'South Africa',
            province: rev?.province || 'Gauteng',
            latitude: lat,
            longitude: lng,
            label: rev?.formattedAddress || rev?.label || `${rev?.suburb || 'Nearby'}, ${rev?.city || 'South Africa'}`,
            mode: 'GPS_CURRENT'
          };
          setActiveLocation(detected);
          addToast(`Detected location: ${detected.label}`, 'success');
        } catch (err) {
          console.warn('Reverse geocode error on GPS:', err);
          setActiveLocation({
            suburb: 'Current Location',
            city: 'Near You',
            province: 'South Africa',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: `GPS Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`,
            mode: 'GPS_CURRENT'
          });
          addToast('Using your current GPS coordinates.', 'info');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        let msg = 'Could not access GPS location. Continuing with chosen area.';
        if (err.code === 1) {
          msg = 'Location permission denied. Continuing with your selected discovery area.';
        } else if (err.code === 2) {
          msg = 'Location position unavailable. Continuing with your selected discovery area.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Continuing with your selected discovery area.';
        }
        addToast(msg, 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  const fetchSavedLocations = async () => {
    if (!user) {
      setSavedLocations([]);
      return;
    }
    try {
      const userToken = localStorage.getItem('localbiz_token');
      const data = await api.getSavedLocations(userToken);
      setSavedLocations(data || []);
    } catch (e) {
      console.warn('Could not load saved locations:', e.message);
    }
  };

  const saveUserLocation = async (locationData) => {
    try {
      const userToken = localStorage.getItem('localbiz_token');
      const saved = await api.saveLocation(locationData, userToken);
      setSavedLocations(prev => [saved, ...prev]);
      addToast('Location saved to your favourites', 'success');
      return saved;
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const removeUserLocation = async (id) => {
    try {
      const userToken = localStorage.getItem('localbiz_token');
      await api.deleteSavedLocation(id, userToken);
      setSavedLocations(prev => prev.filter(l => l.id !== id));
      addToast('Saved location removed', 'info');
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedLocations();
    }
  }, [user]);

  // Initial & Refresh Data Loading
  const refreshData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const userToken = localStorage.getItem('localbiz_token');
      const isAdmin = user?.role === 'admin';
      const [mRes, pRes, oRes, bRes, fRes, nRes, catRes, promRes, campRes, aRes] = await Promise.all([
        api.getMerchants({
          latitude: activeLocation?.latitude,
          longitude: activeLocation?.longitude,
          radius
        }),
        api.getProducts(),
        user ? api.getOrders() : Promise.resolve([]),
        user ? api.getBookings() : Promise.resolve([]),
        user ? api.getFavourites(user?.id, {}, userToken) : Promise.resolve([]),
        api.getNotifications({ userId: user?.id, role: user?.role || 'consumer' }),
        api.getCategories(),
        api.getPromotions(),
        api.getCampaigns(),
        isAdmin ? api.getAdminOverview(userToken) : Promise.resolve(null)
      ]);

      setMerchants(mRes.merchants || []);
      setProducts(pRes || []);
      setOrders(oRes || []);
      setBookings(bRes || []);
      setFavourites(fRes || []);
      setNotifications(nRes || []);
      setCategories(catRes || []);
      setPromotions(promRes || []);
      setCampaigns(campRes || []);
      setAdminOverview(aRes || null);
      if (user) {
        fetchConversations();
        fetchUnreadMessageCounts();
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setLoadError(err.message || 'Failed to connect to LocalBiz server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchUnreadMessageCounts();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setUnreadMessagesCount(0);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [user, activeLocation?.latitude, activeLocation?.longitude, radius]);

  // Auth Operations
  const login = async (email, password) => {
    try {
      const res = await api.login(email, password);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('localbiz_token', res.token);
      addToast(`Welcome back, ${res.user.name}!`, 'success');
      setIsAuthOpen(false);
      return true;
    } catch (err) {
      addToast(err.message, 'error');
      return false;
    }
  };

  const registerUser = async (data) => {
    try {
      const res = data.role === 'business' 
        ? await api.registerBusiness(data) 
        : await api.register(data);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('localbiz_token', res.token);
      if (res.user.role === 'business') {
        addToast(res.message || 'Business registered! Profile is pending admin verification.', 'info');
        setPortal('merchant');
      } else {
        addToast(`Welcome to LocalBiz, ${res.user.name}!`, 'success');
      }
      setIsAuthOpen(false);
      refreshData();
      return true;
    } catch (err) {
      addToast(err.message, 'error');
      return false;
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setToken('');
    localStorage.removeItem('localbiz_token');
    localStorage.removeItem('localbiz_user');
    setPortal('consumer');
    addToast('You have signed out', 'neutral');
  };

  // Ensure token exists on initial app load for seamless API authorization
  useEffect(() => {
    const initDemoToken = async () => {
      const savedToken = localStorage.getItem('localbiz_token');
      if (!savedToken) {
        try {
          const res = await api.login('thandiwe@gmail.com', 'customer123');
          setToken(res.token);
          localStorage.setItem('localbiz_token', res.token);
          setUser(res.user);
        } catch (e) {
          // Ignore if backend is warming up
        }
      }
    };
    initDemoToken();
  }, []);

  // Demo Switch Role (Consumer, Merchant, Admin)
  const switchDemoRole = async (role) => {
    let email = 'thandiwe@gmail.com';
    let pass = 'customer123';
    let targetPortal = 'consumer';
    let fallbackUser = {
      id: 'u-consumer-1',
      name: 'Thandiwe Nkosi',
      email: 'thandiwe@gmail.com',
      role: 'consumer',
      phone: '+27 82 119 4432',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'
    };

    if (role === 'admin') {
      email = 'admin@localbiz.co.za';
      pass = 'admin123';
      targetPortal = 'admin';
      fallbackUser = {
        id: 'u-admin-1',
        name: 'Vuyo Admin',
        email: 'admin@localbiz.co.za',
        role: 'admin',
        phone: '+27 11 907 5500',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      };
    } else if (role === 'business') {
      email = 'nomsa@avoncorner.co.za';
      pass = 'merchant123';
      targetPortal = 'merchant';
      fallbackUser = {
        id: 'u-merchant-1',
        name: 'Nomsa Dube',
        email: 'nomsa@avoncorner.co.za',
        role: 'business',
        phone: '+27 82 459 1102',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
      };
    }

    try {
      const res = await api.login(email, pass);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('localbiz_token', res.token);
      localStorage.setItem('localbiz_user', JSON.stringify(res.user));
      setPortal(targetPortal);
      addToast(`Switched to ${role === 'admin' ? 'Super Admin' : role === 'business' ? "Merchant (Nomsa's Avon)" : 'Consumer'} account`, 'success');
      refreshData();
    } catch (err) {
      setUser(fallbackUser);
      setPortal(targetPortal);
      addToast(`Switched to demo ${role} role`, 'neutral');
    }
  };

  // Cart Operations with Stock Validation
  const addToCart = (product, qty = 1) => {
    if (product.inStock === false || (product.stockCount !== undefined && product.stockCount <= 0)) {
      addToast(`"${product.name}" is currently out of stock.`, 'warning');
      return false;
    }

    const maxStock = product.stockCount !== undefined ? product.stockCount : 999;
    const existing = cart.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.qty : 0;

    if (currentQty + qty > maxStock) {
      addToast(`Cannot add more than available stock (${maxStock} available, ${currentQty} in cart).`, 'warning');
      return false;
    }

    const merchant = merchants.find(m => m.id === product.merchantId);
    setCart(prev => {
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { product, qty, merchant }];
    });
    addToast(`Added "${product.name}" (${qty}x) to cart!`, 'success');
    return true;
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const maxStock = item.product.stockCount !== undefined ? item.product.stockCount : 999;
        const newQty = item.qty + delta;
        if (delta > 0 && newQty > maxStock) {
          addToast(`Maximum available stock is ${maxStock} units.`, 'warning');
          return item;
        }
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    addToast('Item removed from cart', 'neutral');
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  const applyPromoCode = async (code, merchantId, cartItems, subtotal) => {
    try {
      const items = (cartItems || cart).map(item => ({
        productId: item.product?.id,
        qty: item.qty,
        price: item.product?.price
      }));
      const res = await api.validatePromotion(code, merchantId, { subtotal, items });
      if (res.valid) {
        setAppliedPromo(res);
        addToast(`Promotion "${code.toUpperCase()}" applied! Saved R${res.discountAmount}`, 'success');
        return res;
      }
    } catch (err) {
      setAppliedPromo(null);
      addToast(err.message || 'Invalid promotion code', 'error');
      throw err;
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    addToast('Promotion removed', 'neutral');
  };

  // Place Order with JWT Token and Error Feedback
  const placeOrder = async (orderDetails) => {
    try {
      const newOrder = await api.createOrder(orderDetails, token);
      setOrders(prev => [newOrder, ...prev]);
      clearCart();
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setConsumerTab('orders');
      addToast(`Order #${newOrder.id} placed successfully!`, 'success');
      refreshData();
      return newOrder;
    } catch (err) {
      addToast('Error placing order: ' + err.message, 'error');
      return null;
    }
  };

  // Update Order Status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus, undefined, token);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      addToast(`Order #${orderId} moved to "${newStatus}"`, 'success');
      refreshData();
      return updated;
    } catch (err) {
      addToast('Error updating order status: ' + err.message, 'error');
      throw err;
    }
  };

  // Cancel Order (Consumer cancellation)
  const cancelOrder = async (orderId) => {
    try {
      const updated = await api.cancelOrder(orderId, token);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      addToast(`Order #${orderId} has been CANCELLED`, 'success');
      refreshData();
      return updated;
    } catch (err) {
      addToast('Error cancelling order: ' + err.message, 'error');
      throw err;
    }
  };

  // Create Service Booking
  const createBooking = async (bookingData) => {
    try {
      const newBooking = await api.createBooking({
        ...bookingData,
        userId: user?.id
      }, token);
      setBookings(prev => [newBooking, ...prev]);
      setIsBookingModalOpen(false);
      setConsumerTab('bookings');
      addToast(`Service booking requested with ${newBooking.merchant.name}!`, 'success');
      refreshData();
      return true;
    } catch (err) {
      addToast('Failed to book service: ' + err.message, 'error');
      return false;
    }
  };

  // Update Booking Status
  const updateBookingStatus = async (bookingId, status, extraData = {}) => {
    try {
      const updated = await api.updateBookingStatus(bookingId, status, extraData, token);
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      addToast(`Booking marked as "${status}"`, 'success');
      refreshData();
      return updated;
    } catch (err) {
      addToast(err.message || 'Failed to update booking status', 'error');
      throw err;
    }
  };

  const cancelBooking = async (bookingId) => {
    return updateBookingStatus(bookingId, 'CANCELLED');
  };

  const rescheduleBooking = async (bookingId, newDate, newTimeSlot) => {
    return updateBookingStatus(bookingId, 'RESCHEDULED', { newDate, newTimeSlot });
  };

  // Toggle Favourite (Stage 13 — Multi-Entity Consumer Favorites)
  const toggleFavourite = async (target, type = 'business') => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const token = localStorage.getItem('localbiz_token');
      let payload;
      if (typeof target === 'string') {
        if (type === 'product' || type === 'service') {
          payload = { productId: target, type };
        } else {
          payload = { merchantId: target, type: 'business' };
        }
      } else {
        payload = target;
      }

      const res = await api.toggleFavourite(user.id, payload, token);
      if (res.action === 'added') {
        setFavourites(prev => [...prev, res.favourite]);
        const itemType = res.favourite?.entityType || type || 'item';
        addToast(`Saved ${itemType} to your favourites!`, 'success');
      } else {
        const removedId = res.id;
        setFavourites(prev => prev.filter(f => {
          if (f.id === removedId) return false;
          if (payload.productId && f.productId === payload.productId) return false;
          if (payload.merchantId && f.merchantId === payload.merchantId && !f.productId) return false;
          return true;
        }));
        addToast('Removed from favourites', 'neutral');
      }
    } catch (err) {
      addToast(err.message || 'Error updating favourite', 'error');
    }
  };

  const isFavourite = (targetId, type = null) => {
    if (!targetId) return false;
    return favourites.some(f => {
      if (type === 'product' || type === 'service') {
        return f.productId === targetId;
      }
      if (type === 'business') {
        return f.merchantId === targetId && (!f.productId || f.entityType === 'business');
      }
      return f.productId === targetId || (f.merchantId === targetId && (!f.productId || f.entityType === 'business'));
    });
  };

  // Submit Review (Stage 11 — Verified Reviews & Ratings)
  const submitReview = async (merchantId, reviewData) => {
    try {
      const token = localStorage.getItem('localbiz_token');
      const payload = {
        ...reviewData,
        orderId: reviewData.orderId || reviewTransaction?.orderId || null,
        bookingId: reviewData.bookingId || reviewTransaction?.bookingId || null,
        userId: user?.id,
        userName: user?.name || reviewData.userName
      };
      await api.addReview(merchantId, payload, token);
      setIsReviewModalOpen(false);
      setReviewTransaction(null);
      addToast('Thank you! Your verified review was published.', 'success');
      await refreshData();
      return true;
    } catch (err) {
      addToast('Failed to submit review: ' + (err.message || 'Error occurred'), 'error');
      return false;
    }
  };

  // Notification Actions
  const markNotificationRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      // silent
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead({ userId: user?.id, role: user?.role });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      addToast('All notifications marked as read', 'neutral');
    } catch (err) {
      addToast('Failed to mark all as read: ' + err.message, 'error');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      addToast('Notification removed', 'neutral');
    } catch (err) {
      addToast('Failed to delete notification: ' + err.message, 'error');
    }
  };

  // Update User Profile
  const updateUserProfile = async (profileData) => {
    try {
      const updated = await api.updateProfile(profileData);
      setUser(prev => ({ ...prev, ...updated }));
      setSavedProfile(prev => ({
        ...prev,
        name: updated.name || prev.name,
        phone: updated.phone || prev.phone,
        address: profileData.address || prev.address
      }));
      addToast('Profile updated successfully!', 'success');
      return updated;
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
      throw err;
    }
  };

  // Stage 14 — Messaging Actions
  const fetchConversations = async () => {
    const currentToken = localStorage.getItem('localbiz_token');
    if (!currentToken || !user) return [];
    try {
      const list = await api.getConversations({}, currentToken);
      setConversations(list || []);
      return list;
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      return [];
    }
  };

  const fetchUnreadMessageCounts = async () => {
    const currentToken = localStorage.getItem('localbiz_token');
    if (!currentToken || !user) {
      setUnreadMessagesCount(0);
      return { totalUnread: 0 };
    }
    try {
      const res = await api.getUnreadMessageCounts(currentToken);
      const count = res?.totalUnread || 0;
      setUnreadMessagesCount(count);
      return res;
    } catch (err) {
      console.error('Failed to fetch unread message counts:', err);
      return { totalUnread: 0 };
    }
  };

  const openChatWithMerchant = async (merchant) => {
    setActiveChatMerchant(merchant);
    const currentToken = localStorage.getItem('localbiz_token');
    if (!currentToken || !user) return;
    try {
      const conv = await api.startConversation({ merchantId: merchant.id }, currentToken);
      setActiveConversation(conv);
      if (conv?.id) {
        await api.markConversationRead(conv.id, currentToken).catch(() => {});
        fetchUnreadMessageCounts();
      }
    } catch (err) {
      console.error('Failed to open chat with merchant:', err);
    }
  };

  const sendMessageInActiveChat = async (text) => {
    if (!text || !text.trim()) return;
    const currentToken = localStorage.getItem('localbiz_token');
    if (!currentToken || !user) {
      addToast('Please sign in to message merchants', 'info');
      setIsAuthOpen(true);
      return;
    }
    try {
      let convId = activeConversation?.id;
      if (!convId && activeChatMerchant) {
        const conv = await api.startConversation({ merchantId: activeChatMerchant.id }, currentToken);
        setActiveConversation(conv);
        convId = conv.id;
      }
      if (!convId) return;

      const res = await api.sendConversationMessage(convId, { text: text.trim() }, currentToken);
      setActiveConversation(res.conversation);
      fetchConversations();
      return res.message;
    } catch (err) {
      addToast(err.message || 'Failed to send message', 'error');
      throw err;
    }
  };

  const markActiveConversationRead = async (convId) => {
    const id = convId || activeConversation?.id;
    if (!id) return;
    const currentToken = localStorage.getItem('localbiz_token');
    if (!currentToken) return;
    try {
      await api.markConversationRead(id, currentToken);
      fetchUnreadMessageCounts();
    } catch (err) {
      console.error('Failed to mark conversation read:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      // Auth & Role
      user, token, login, registerUser, logout, switchDemoRole,
      isAuthOpen, setIsAuthOpen,
      updateUserProfile,

      // Navigation & Routing
      portal, setPortal,
      consumerTab, setConsumerTab,

      // Location & Filtering
      suburb, setSuburb,
      radius, setRadius,
      activeLocation, setActiveLocation,
      isLocationModalOpen, setIsLocationModalOpen,
      isDetectingLocation,
      detectCurrentLocation,
      selectLocation,
      savedLocations,
      fetchSavedLocations,
      saveUserLocation,
      removeUserLocation,
      category, setCategory,
      searchQuery, setSearchQuery,
      quickFilter, setQuickFilter,

      // Data
      merchants, setMerchants,
      products, setProducts,
      orders, setOrders,
      bookings, setBookings,
      favourites, setFavourites,
      notifications, setNotifications,
      categories, setCategories,
      promotions, setPromotions,
      campaigns, setCampaigns,
      adminOverview, setAdminOverview,
      isLoading, setIsLoading,
      loadError, setLoadError,

      // Messaging (Stage 14)
      conversations, setConversations,
      activeConversation, setActiveConversation,
      unreadMessagesCount, setUnreadMessagesCount,
      fetchConversations, fetchUnreadMessageCounts,
      openChatWithMerchant, sendMessageInActiveChat, markActiveConversationRead,

      // Modals & Drawers
      selectedMerchant, setSelectedMerchant,
      selectedProduct, setSelectedProduct,
      selectedService, setSelectedService,
      bookingService, setBookingService,
      isBookingModalOpen, setIsBookingModalOpen,
      selectedOrder, setSelectedOrder,
      selectedBooking, setSelectedBooking,
      isEditProfileOpen, setIsEditProfileOpen,
      isOnboardingOpen, setIsOnboardingOpen,
      reviewMerchant, setReviewMerchant,
      reviewTransaction, setReviewTransaction,
      isReviewModalOpen, setIsReviewModalOpen,
      isRegisterBusinessOpen, setIsRegisterBusinessOpen,
      isNotificationsOpen, setIsNotificationsOpen,
      activeChatMerchant, setActiveChatMerchant,

      // Cart & Checkout
      cart, addToCart, updateCartQty, removeFromCart, clearCart,
      appliedPromo, applyPromoCode, removePromoCode,
      deliveryType, setDeliveryType,
      savedProfile, setSavedProfile,
      isCartOpen, setIsCartOpen,
      isCheckoutOpen, setIsCheckoutOpen,
      placeOrder, updateOrderStatus, cancelOrder,

      // Actions
      createBooking, updateBookingStatus, cancelBooking, rescheduleBooking,
      toggleFavourite, isFavourite,
      submitReview,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      toasts, addToast,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

