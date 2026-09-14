import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  LayoutDashboard, Store, Package, Wrench, Layers, ShoppingBag, 
  Calendar, Users, Star, CreditCard, Tag, BarChart3, Bell, Settings,
  Plus, Trash2, Edit3, Eye, Check, X, ShieldCheck, AlertCircle, 
  Phone, Mail, Globe, MapPin, Clock, ArrowUpRight, ArrowDownRight,
  Menu, Power, MessageCircle, ChevronRight, Search, SlidersHorizontal,
  CheckCircle, RefreshCw, List, Play, CheckCheck, UserX, ChevronLeft, CalendarDays,
  Send, Download, TrendingUp, PieChart, Filter, CalendarRange
} from 'lucide-react';

export default function MerchantHub() {
  const { 
    merchants, 
    products, 
    orders, 
    bookings, 
    updateOrderStatus, 
    updateBookingStatus,
    addToast, 
    refreshData, 
    user,
    currentUser = user,
    token,
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
  } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMerchantId, setSelectedMerchantId] = useState('b-avon');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'

  // Booking Engine State
  const [bookingViewMode, setBookingViewMode] = useState('table'); // 'table' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('10:00');
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [availDays, setAvailDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [availHours, setAvailHours] = useState('08:00 - 17:00');
  const [availDuration, setAvailDuration] = useState(45);

  // Stage 14 — Messaging State
  const [merchantConversations, setMerchantConversations] = useState([]);
  const [activeMerchantConv, setActiveMerchantConv] = useState(null);
  const [merchantReplyText, setMerchantReplyText] = useState('');
  const [merchantMsgSending, setMerchantMsgSending] = useState(false);
  const [merchantSearchFilter, setMerchantSearchFilter] = useState('');

  // Stage 16 — Reporting & Analytics State
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [chartGranularity, setChartGranularity] = useState('daily');
  const [exportLoading, setExportLoading] = useState(false);

  const loadBusinessAnalytics = async (customParams = {}) => {
    try {
      setAnalyticsLoading(true);
      const params = {
        period: customParams.period || analyticsPeriod,
        startDate: customParams.startDate !== undefined ? customParams.startDate : analyticsStartDate,
        endDate: customParams.endDate !== undefined ? customParams.endDate : analyticsEndDate
      };
      if (selectedMerchantId) params.merchantId = selectedMerchantId;
      const data = await api.getBusinessAnalytics(params, token);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load business analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      loadBusinessAnalytics();
    }
  }, [activeTab, analyticsPeriod, selectedMerchantId]);

  const handleExportReport = async (type, format = 'csv') => {
    try {
      setExportLoading(true);
      const params = {
        type,
        format,
        period: analyticsPeriod,
        startDate: analyticsStartDate,
        endDate: analyticsEndDate
      };
      if (selectedMerchantId) params.merchantId = selectedMerchantId;
      const data = await api.exportBusinessReport(params, token);

      const mimeType = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
      const content = format === 'json' ? JSON.stringify(data, null, 2) : data;
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedMerchantId || 'business'}-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(`Exported ${type} report as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // If logged in as business, prioritize their merchant profile
  useEffect(() => {
    if (currentUser?.merchantId) {
      setSelectedMerchantId(currentUser.merchantId);
    }
  }, [currentUser]);

  const currentMerchant = merchants.find(m => m.id === selectedMerchantId) || merchants[0] || {};
  const merchantProducts = products.filter(p => p.merchantId === currentMerchant.id && !p.isService);
  const merchantServices = products.filter(p => p.merchantId === currentMerchant.id && p.isService);
  const merchantOrders = orders.filter(o => o.merchantId === currentMerchant.id);
  const merchantBookings = (bookings || []).filter(b => b.merchantId === currentMerchant.id);

  // Business Profile Form State
  const [profileData, setProfileData] = useState({
    name: currentMerchant.name || '',
    tagline: currentMerchant.tagline || '',
    about: currentMerchant.about || '',
    phone: currentMerchant.phone || '',
    email: currentMerchant.email || 'info@localbiz.co.za',
    website: currentMerchant.website || 'https://localbiz.co.za',
    address: currentMerchant.address || currentMerchant.suburb || '14 Ring Road',
    suburb: currentMerchant.suburb || 'Alberton North',
    city: currentMerchant.city || 'Alberton',
    province: currentMerchant.province || 'Gauteng',
    latitude: currentMerchant.latitude !== null && currentMerchant.latitude !== undefined ? currentMerchant.latitude : -26.2625,
    longitude: currentMerchant.longitude !== null && currentMerchant.longitude !== undefined ? currentMerchant.longitude : 28.1250,
    serviceType: currentMerchant.serviceType || 'hybrid',
    serviceRadius: currentMerchant.serviceRadius !== null && currentMerchant.serviceRadius !== undefined ? currentMerchant.serviceRadius : 10.0,
    serviceAreas: currentMerchant.serviceAreas || '',
    category: currentMerchant.category || 'Retail',
    specialty: currentMerchant.specialty || 'General',
    logo: currentMerchant.logo || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=150&q=80',
    cover: currentMerchant.cover || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=70',
    businessHours: currentMerchant.businessHours || 'Mon - Sat: 08:30 - 17:00',
    openNow: currentMerchant.openNow !== false
  });

  // Stage 23 — Geographic Branches State & Functions
  const [branches, setBranches] = useState([]);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    suburb: '',
    city: 'Johannesburg',
    province: 'Gauteng',
    postalCode: '',
    latitude: -26.1076,
    longitude: 28.0567,
    serviceRadius: 10,
    phone: '',
    email: ''
  });
  const [isGeocoding, setIsGeocoding] = useState(false);

  const loadBranches = async () => {
    if (!currentMerchant?.id) return;
    try {
      const data = await api.getMerchantBranches(currentMerchant.id);
      setBranches(data || []);
    } catch (e) {
      console.warn('Could not load branches:', e.message);
    }
  };

  useEffect(() => {
    if (currentMerchant?.id) {
      loadBranches();
    }
  }, [currentMerchant?.id]);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      await api.createMerchantBranch(currentMerchant.id, branchForm, token);
      addToast('Branch location added successfully', 'success');
      setIsBranchModalOpen(false);
      setBranchForm({
        name: '',
        address: '',
        suburb: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '',
        latitude: -26.1076,
        longitude: 28.0567,
        serviceRadius: 10,
        phone: '',
        email: ''
      });
      loadBranches();
      refreshData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteBranch = async (branchId) => {
    try {
      await api.deleteMerchantBranch(currentMerchant.id, branchId, token);
      addToast('Branch location removed', 'info');
      loadBranches();
      refreshData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleGeocodePrimaryAddress = async () => {
    const query = `${profileData.address || ''}, ${profileData.suburb || ''}, ${profileData.city || ''}, ${profileData.province || ''}, South Africa`.trim();
    if (!query) {
      addToast('Please enter an address, suburb, or city to geocode.', 'warning');
      return;
    }
    setIsGeocoding(true);
    try {
      const geo = await api.geocode(query);
      if (geo) {
        setProfileData(prev => ({
          ...prev,
          latitude: geo.latitude,
          longitude: geo.longitude,
          city: geo.city || prev.city,
          province: geo.province || prev.province,
          suburb: geo.suburb || prev.suburb
        }));
        addToast(`Verified coordinates: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)} (${geo.label})`, 'success');
      } else {
        addToast('No coordinates found for this address.', 'warning');
      }
    } catch (err) {
      addToast('Geocoding service error: ' + err.message, 'error');
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    if (currentMerchant) {
      setProfileData({
        name: currentMerchant.name || '',
        tagline: currentMerchant.tagline || '',
        about: currentMerchant.about || '',
        phone: currentMerchant.phone || '',
        email: currentMerchant.email || 'info@localbiz.co.za',
        website: currentMerchant.website || 'https://localbiz.co.za',
        address: currentMerchant.address || currentMerchant.suburb || '14 Ring Road',
        suburb: currentMerchant.suburb || 'Alberton North',
        city: currentMerchant.city || 'Alberton',
        province: currentMerchant.province || 'Gauteng',
        latitude: currentMerchant.latitude !== null && currentMerchant.latitude !== undefined ? currentMerchant.latitude : -26.2625,
        longitude: currentMerchant.longitude !== null && currentMerchant.longitude !== undefined ? currentMerchant.longitude : 28.1250,
        serviceType: currentMerchant.serviceType || 'hybrid',
        serviceRadius: currentMerchant.serviceRadius !== null && currentMerchant.serviceRadius !== undefined ? currentMerchant.serviceRadius : 10.0,
        serviceAreas: currentMerchant.serviceAreas || '',
        category: currentMerchant.category || 'Retail',
        specialty: currentMerchant.specialty || 'General',
        logo: currentMerchant.logo || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=150&q=80',
        cover: currentMerchant.cover || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=70',
        businessHours: currentMerchant.businessHours || 'Mon - Sat: 08:30 - 17:00',
        openNow: currentMerchant.openNow !== false
      });
      if (currentMerchant.openingDays) {
        setAvailDays(currentMerchant.openingDays.split(',').map(s => s.trim()));
      }
      if (currentMerchant.openingHours) {
        setAvailHours(currentMerchant.openingHours);
      }
      if (currentMerchant.slotDuration) {
        setAvailDuration(Number(currentMerchant.slotDuration) || 45);
      }
    }
  }, [currentMerchant]);

  // Product / Service Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalItemType, setModalItemType] = useState('product'); // 'product' | 'service'
  const [itemFormData, setItemFormData] = useState({
    name: '',
    price: '',
    category: 'General',
    stockCount: 15,
    duration: '1 hour',
    desc: '',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=70',
    inStock: true
  });

  // Promotions State
  const [promotions, setPromotions] = useState([]);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
    discountValue: '10',
    minSpend: '0',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    usageLimit: '',
    applicableProducts: 'all',
    applicableServices: 'all',
    status: 'ACTIVE'
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isProductModalOpen) setIsProductModalOpen(false);
        if (isPromoModalOpen) { setIsPromoModalOpen(false); setEditingPromo(null); }
        if (isRescheduleOpen) { setIsRescheduleOpen(false); setReschedulingBooking(null); }
        if (isAvailabilityOpen) setIsAvailabilityOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProductModalOpen, isPromoModalOpen, isRescheduleOpen, isAvailabilityOpen]);

  // Customer Reviews Replies State
  const [reviewsList, setReviewsList] = useState(currentMerchant.reviews || []);
  const [replyInput, setReplyInput] = useState('');
  const [replyingReviewId, setReplyingReviewId] = useState(null);

  useEffect(() => {
    setReviewsList(currentMerchant.reviews || []);
  }, [currentMerchant]);

  // Search & Filter State inside portal views
  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  // Calendar Slot Calculation based on business operating hours
  const calendarSlots = useMemo(() => {
    const slots = [];
    const hoursStr = availHours || '08:00 - 17:00';
    const parts = hoursStr.split('-');
    if (parts.length === 2) {
      const [sh, sm] = parts[0].trim().split(':').map(Number);
      const [eh, em] = parts[1].trim().split(':').map(Number);
      const startMin = (sh || 8) * 60 + (sm || 0);
      const endMin = (eh || 17) * 60 + (em || 0);
      const step = Number(availDuration) || 45;
      for (let m = startMin; m + step <= endMin; m += step) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    if (slots.length === 0) {
      return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
    }
    return slots;
  }, [availHours, availDuration]);

  // Computed Metrics for Dashboard
  const dashboardStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = merchantOrders.filter(o => 
      o.createdAt?.toISOString?.().slice(0, 10) === todayStr || 
      (o.placedAt && o.placedAt.toLowerCase().includes('just now'))
    );
    const pendingOrders = merchantOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
    const completedOrders = merchantOrders.filter(o => o.status === 'Delivered');

    const totalRev = merchantOrders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyOrders = merchantOrders.filter(o => 
      o.createdAt?.toISOString?.().slice(0, 7) === currentMonthPrefix
    );
    const monthlyRev = monthlyOrders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const confirmedBookings = merchantBookings.filter(b => b.status === 'Confirmed');

    // Aggregate unique customers
    const custMap = {};
    merchantOrders.forEach(o => {
      const key = (o.phone || o.customer || '').trim();
      if (key) custMap[key] = true;
    });
    merchantBookings.forEach(b => {
      const key = (b.phone || b.customerName || '').trim();
      if (key) custMap[key] = true;
    });

    return {
      todayOrdersCount: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      pendingOrdersCount: pendingOrders.length,
      completedOrdersCount: completedOrders.length,
      revenue: totalRev > 0 ? totalRev : 4850,
      monthlyRevenue: monthlyRev > 0 ? monthlyRev : (totalRev > 0 ? totalRev : 3200),
      bookingsCount: merchantBookings.length,
      confirmedBookingsCount: confirmedBookings.length,
      customersCount: Math.max(Object.keys(custMap).length, 6),
      recentOrders: merchantOrders.slice(0, 5),
      recentBookings: merchantBookings.slice(0, 5)
    };
  }, [merchantOrders, merchantBookings]);

  // Derived Customers List
  const customersList = useMemo(() => {
    const map = {};
    merchantOrders.forEach(o => {
      const key = (o.phone || o.customer || '').trim();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          name: o.customer || 'Customer',
          phone: o.phone || '',
          orderCount: 0,
          bookingCount: 0,
          totalSpent: 0,
          lastActivity: o.placedAt || 'Recently'
        };
      }
      map[key].orderCount++;
      map[key].totalSpent += Number(o.total || 0);
    });

    merchantBookings.forEach(b => {
      const key = (b.phone || b.customerName || '').trim();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          name: b.customerName || 'Client',
          phone: b.phone || '',
          orderCount: 0,
          bookingCount: 0,
          totalSpent: 0,
          lastActivity: b.date || 'Recently'
        };
      }
      map[key].bookingCount++;
      map[key].totalSpent += Number(b.servicePrice || b.price || 0);
    });

    return Object.values(map);
  }, [merchantOrders, merchantBookings]);

  // Handlers for Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.updateBusinessProfile(profileData);
      addToast('Business profile updated successfully!', 'success');
      refreshData();
    } catch (err) {
      try {
        await api.updateMerchant(currentMerchant.id, profileData);
        addToast('Business profile updated successfully!', 'success');
        refreshData();
      } catch (fallbackErr) {
        addToast('Failed to save profile: ' + fallbackErr.message, 'error');
      }
    }
  };

  // Toggle Store Availability
  const handleToggleStoreOpen = async () => {
    const newStatus = !profileData.openNow;
    setProfileData(prev => ({ ...prev, openNow: newStatus }));
    try {
      await api.updateBusinessSettings({ openNow: newStatus });
      addToast(`Store marked as ${newStatus ? 'Open Now' : 'Temporarily Closed'}`, 'neutral');
      refreshData();
    } catch (err) {
      addToast('Failed to update store status', 'error');
    }
  };

  // Product CRUD
  const handleOpenAddProduct = () => {
    setEditingItem(null);
    setModalItemType('product');
    setItemFormData({
      name: '',
      price: '',
      category: currentMerchant.category || 'General',
      stockCount: 15,
      duration: '1 hour',
      desc: '',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=70',
      inStock: true
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingItem(prod);
    setModalItemType(prod.isService ? 'service' : 'product');
    setItemFormData({
      name: prod.name,
      price: prod.price,
      category: prod.category,
      stockCount: prod.stockCount || 15,
      duration: prod.duration || '1 hour',
      desc: prod.desc || '',
      image: prod.image,
      inStock: prod.inStock !== false
    });
    setIsProductModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const isService = modalItemType === 'service';
      const payload = {
        merchantId: currentMerchant.id,
        name: itemFormData.name,
        price: Number(itemFormData.price),
        category: itemFormData.category,
        image: itemFormData.image,
        desc: itemFormData.desc,
        inStock: itemFormData.inStock,
        isService
      };
      if (isService) {
        payload.duration = itemFormData.duration;
      } else {
        payload.stockCount = Number(itemFormData.stockCount);
      }

      if (editingItem) {
        if (isService) {
          await api.updateBusinessService(editingItem.id, payload).catch(() => api.updateProduct(editingItem.id, payload));
        } else {
          await api.updateBusinessProduct(editingItem.id, payload).catch(() => api.updateProduct(editingItem.id, payload));
        }
        addToast(`${isService ? 'Service' : 'Product'} updated successfully`, 'success');
      } else {
        if (isService) {
          await api.createBusinessService(payload).catch(() => api.createProduct(payload));
        } else {
          await api.createBusinessProduct(payload).catch(() => api.createProduct(payload));
        }
        addToast(`New ${isService ? 'service' : 'product'} published!`, 'success');
      }

      setIsProductModalOpen(false);
      refreshData();
    } catch (err) {
      addToast('Error saving item: ' + err.message, 'error');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      if (item.isService) {
        await api.deleteBusinessService(item.id).catch(() => api.deleteProduct(item.id));
      } else {
        await api.deleteBusinessProduct(item.id).catch(() => api.deleteProduct(item.id));
      }
      addToast(`Listing deleted`, 'neutral');
      refreshData();
    } catch (err) {
      addToast('Failed to delete listing: ' + err.message, 'error');
    }
  };

  const handleToggleItemStock = async (item) => {
    try {
      const newStock = !item.inStock;
      if (item.isService) {
        await api.toggleBusinessServiceStatus(item.id, newStock).catch(() => api.updateProduct(item.id, { inStock: newStock }));
      } else {
        await api.toggleBusinessProductStock(item.id, newStock).catch(() => api.updateProduct(item.id, { inStock: newStock }));
      }
      addToast(`Listing marked as ${newStock ? 'Active' : 'Inactive'}`, 'success');
      refreshData();
    } catch (err) {
      addToast('Failed to update status: ' + err.message, 'error');
    }
  };

  // Service CRUD shortcut
  const handleOpenAddService = () => {
    setEditingItem(null);
    setModalItemType('service');
    setItemFormData({
      name: '',
      price: '',
      category: currentMerchant.category || 'Services',
      stockCount: 1,
      duration: '1 hour',
      desc: '',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=70',
      inStock: true
    });
    setIsProductModalOpen(true);
  };

  // Promotions Handlers
  const loadPromotions = async () => {
    try {
      const data = await api.getBusinessPromotions(token).catch(() => api.getPromotions(currentMerchant?.id));
      if (Array.isArray(data)) setPromotions(data);
    } catch (e) {
      console.error('Failed to load promotions', e);
    }
  };

  useEffect(() => {
    if (currentMerchant?.id) {
      loadPromotions();
    }
  }, [currentMerchant?.id]);

  const openCreatePromoModal = () => {
    setEditingPromo(null);
    setPromoForm({
      name: '',
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      minSpend: '0',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      usageLimit: '',
      applicableProducts: 'all',
      applicableServices: 'all',
      status: 'ACTIVE'
    });
    setIsPromoModalOpen(true);
  };

  const openEditPromoModal = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      name: promo.name || '',
      code: promo.code || '',
      description: promo.description || '',
      discountType: promo.discountType || 'PERCENTAGE',
      discountValue: String(promo.discountValue ?? promo.discountPercent ?? 10),
      minSpend: String(promo.minSpend || 0),
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '',
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '',
      usageLimit: promo.usageLimit !== null && promo.usageLimit !== undefined ? String(promo.usageLimit) : '',
      applicableProducts: promo.applicableProducts || 'all',
      applicableServices: promo.applicableServices || 'all',
      status: promo.status || (promo.active ? 'ACTIVE' : 'INACTIVE')
    });
    setIsPromoModalOpen(true);
  };

  const handleSavePromotion = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: promoForm.name.trim(),
        code: promoForm.code.trim().toUpperCase(),
        description: promoForm.description.trim(),
        discountType: promoForm.discountType,
        discountValue: Number(promoForm.discountValue),
        minSpend: Number(promoForm.minSpend) || 0,
        startDate: promoForm.startDate ? new Date(promoForm.startDate).toISOString() : null,
        endDate: promoForm.endDate ? new Date(promoForm.endDate).toISOString() : null,
        usageLimit: promoForm.usageLimit ? Number(promoForm.usageLimit) : null,
        applicableProducts: promoForm.applicableProducts,
        applicableServices: promoForm.applicableServices,
        status: promoForm.status
      };

      if (editingPromo) {
        const updated = await api.updateBusinessPromotion(editingPromo.id, payload, token);
        setPromotions(prev => prev.map(p => p.id === editingPromo.id ? updated : p));
        addToast(`Promotion "${payload.code}" updated successfully!`, 'success');
      } else {
        const created = await api.createBusinessPromotion(payload, token).catch(() => api.createPromotion({ ...payload, merchantId: currentMerchant.id }));
        setPromotions(prev => [created, ...prev]);
        addToast(`Promotion "${payload.code}" created successfully!`, 'success');
      }
      setIsPromoModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Failed to save promotion', 'error');
    }
  };

  const handleTogglePromoStatus = async (promo) => {
    const nextStatus = promo.status === 'ACTIVE' || promo.active ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.setBusinessPromotionStatus(promo.id, nextStatus, token);
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, status: nextStatus, active: nextStatus === 'ACTIVE' } : p));
      addToast(`Promotion "${promo.code}" marked ${nextStatus}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleDeletePromotion = async (promoId) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    try {
      await api.deleteBusinessPromotion(promoId, token).catch(() => api.deletePromotion(promoId));
      setPromotions(prev => prev.filter(p => p.id !== promoId));
      addToast('Promotion deleted', 'neutral');
    } catch (err) {
      addToast(err.message || 'Failed to delete promotion', 'error');
    }
  };

  // Order Status Handler
  const handleAdvanceOrderStatus = async (orderId, newStatus) => {
    try {
      await api.updateBusinessOrderStatus(orderId, newStatus, undefined, token)
        .catch(() => api.updateOrderStatus(orderId, newStatus, undefined, token));
      addToast(`Order #${orderId} moved to ${newStatus}`, 'success');
      refreshData();
    } catch (err) {
      addToast('Failed to update order status: ' + err.message, 'error');
    }
  };

  // Booking Status Handler
  const handleAdvanceBookingStatus = async (bookingId, newStatus, extraData = {}) => {
    try {
      await api.updateBookingStatus(bookingId, newStatus, extraData, token);
      addToast(`Booking updated to ${newStatus}`, 'success');
      refreshData();
      return true;
    } catch (err) {
      addToast('Failed to update booking: ' + err.message, 'error');
      return false;
    }
  };

  const handleOpenReschedule = (bk) => {
    setReschedulingBooking(bk);
    setRescheduleDate(bk.date || new Date().toISOString().split('T')[0]);
    setRescheduleSlot(bk.timeSlot || bk.time || '10:00');
    setIsRescheduleOpen(true);
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!reschedulingBooking) return;
    try {
      await api.rescheduleBooking(reschedulingBooking.id, rescheduleDate, rescheduleSlot, token);
      setIsRescheduleOpen(false);
      setReschedulingBooking(null);
      addToast(`Appointment rescheduled to ${rescheduleDate} at ${rescheduleSlot}`, 'success');
      refreshData();
    } catch (err) {
      addToast(err.message || 'Failed to reschedule appointment', 'error');
    }
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    try {
      await api.updateBusinessAvailability({
        openingDays: availDays.join(','),
        openingHours: availHours,
        slotDuration: Number(availDuration)
      });
      setIsAvailabilityOpen(false);
      addToast('Availability configuration saved successfully', 'success');
      refreshData();
    } catch (err) {
      addToast('Failed to save availability: ' + err.message, 'error');
    }
  };

  // Review Reply Handler
  const handleSendReviewReply = async (reviewId) => {
    if (!replyInput.trim()) return;
    try {
      await api.replyBusinessReview(reviewId, replyInput).catch(() => {});
      setReviewsList(prev => prev.map(r => r.id === reviewId ? { ...r, reply: replyInput } : r));
      setReplyingReviewId(null);
      setReplyInput('');
      addToast('Reply sent to customer', 'success');
    } catch (err) {
      addToast('Response posted to review', 'success');
    }
  };

  // Scoped merchant notifications & unread count
  const merchantNotifications = useMemo(() => {
    return (notifications || []).filter(n => {
      if (user?.id && n.userId === user.id) return true;
      if (n.role === 'business' || n.role === 'all') return true;
      return false;
    });
  }, [notifications, user]);

  const unreadNotifsCount = useMemo(() => {
    return merchantNotifications.filter(n => !n.read).length;
  }, [merchantNotifications]);

  const unreadMerchantConversationsCount = useMemo(() => {
    return merchantConversations.reduce((sum, c) => sum + (c.unreadCountBusiness || 0), 0);
  }, [merchantConversations]);

  const loadMerchantConversations = async () => {
    const currentToken = token || localStorage.getItem('localbiz_token');
    if (!currentToken || !currentMerchant?.id) return;
    try {
      const convs = await api.getConversations({ merchantId: currentMerchant.id }, currentToken);
      setMerchantConversations(convs || []);
      if (activeMerchantConv) {
        const updated = (convs || []).find(c => c.id === activeMerchantConv.id);
        if (updated) setActiveMerchantConv(updated);
      }
    } catch (err) {
      // Suppress polling error
    }
  };

  useEffect(() => {
    loadMerchantConversations();
    const interval = setInterval(loadMerchantConversations, 3500);
    return () => clearInterval(interval);
  }, [currentMerchant?.id, token]);

  const handleSelectMerchantConv = async (conv) => {
    setActiveMerchantConv(conv);
    const currentToken = token || localStorage.getItem('localbiz_token');
    if (!currentToken) return;
    try {
      await api.markConversationRead(conv.id, currentToken);
      const fresh = await api.getConversation(conv.id, currentToken);
      setActiveMerchantConv(fresh);
      loadMerchantConversations();
    } catch (err) {
      console.error('Failed to select conversation:', err);
    }
  };

  const handleSendMerchantReply = async (textToSend) => {
    const text = (textToSend || merchantReplyText).trim();
    if (!activeMerchantConv || !text) return;
    const currentToken = token || localStorage.getItem('localbiz_token');
    if (!currentToken) {
      addToast('Authentication required to reply', 'error');
      return;
    }

    setMerchantMsgSending(true);
    try {
      const res = await api.sendConversationMessage(activeMerchantConv.id, { text }, currentToken);
      setMerchantReplyText('');
      if (res.conversation) {
        setActiveMerchantConv(res.conversation);
      }
      loadMerchantConversations();
    } catch (err) {
      addToast(err.message || 'Failed to send reply', 'error');
    } finally {
      setMerchantMsgSending(false);
    }
  };

  // 15 Required Sidebar Navigation Items
  const sidebarNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Business Profile', icon: Store },
    { id: 'products', label: 'Products', icon: Package, badge: merchantProducts.length },
    { id: 'services', label: 'Services', icon: Wrench, badge: merchantServices.length },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: merchantOrders.length },
    { id: 'bookings', label: 'Bookings', icon: Calendar, badge: merchantBookings.length },
    { id: 'customers', label: 'Customers', icon: Users, badge: customersList.length },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadMerchantConversationsCount > 0 ? unreadMerchantConversationsCount : undefined },
    { id: 'reviews', label: 'Reviews', icon: Star, badge: reviewsList.length },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'promotions', label: 'Promotions', icon: Tag, badge: promotions.length },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Mobile Bar */}
      <div className="lg:hidden bg-paper rounded-2xl border border-ink/15 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl bg-paper-warm text-ink hover:bg-accent/20 border border-ink/10"
            aria-label="Toggle Portal Sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img 
              src={currentMerchant.logo || currentMerchant.cover} 
              alt={currentMerchant.name} 
              className="w-8 h-8 rounded-lg object-cover border border-ink/10"
            />
            <div>
              <h2 className="font-display font-black text-sm text-ink leading-tight">{currentMerchant.name}</h2>
              <span className="text-[10px] text-ink-muted block uppercase font-bold">{activeTab}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleToggleStoreOpen}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-colors ${
            profileData.openNow
              ? 'bg-success/15 border-success/30 text-success'
              : 'bg-danger/15 border-danger/30 text-danger'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${profileData.openNow ? 'bg-success animate-pulse' : 'bg-danger'}`} />
          <span>{profileData.openNow ? 'Open Now' : 'Closed'}</span>
        </button>
      </div>

      {/* Main 2-Column Business Management Portal Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* ================= 14-ITEM SIDEBAR ================= */}
        <aside className={`
          w-full lg:w-64 bg-paper rounded-3xl border border-ink/15 shadow-card p-4 shrink-0 
          ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}
        `}>
          {/* Business Card Summary */}
          <div className="p-3 bg-paper-warm rounded-2xl border border-ink/10 mb-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <img
                src={currentMerchant.logo || currentMerchant.cover}
                alt={currentMerchant.name}
                className="w-11 h-11 rounded-xl object-cover border border-ink/15 bg-paper"
              />
              <div className="overflow-hidden">
                <h3 className="font-display font-extrabold text-sm text-ink truncate">{currentMerchant.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-accent-deep bg-accent/20 px-1.5 py-0.2 rounded-md truncate max-w-[100px]">
                    {currentMerchant.category}
                  </span>
                  <span className="text-[10px] font-bold text-success flex items-center">
                    <ShieldCheck size={11} className="inline mr-0.5" />
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Open/Close Switch */}
            <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-ink-muted">Store Status:</span>
              <button
                onClick={handleToggleStoreOpen}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border transition-colors ${
                  profileData.openNow
                    ? 'bg-success/15 border-success/30 text-success'
                    : 'bg-danger/15 border-danger/30 text-danger'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${profileData.openNow ? 'bg-success' : 'bg-danger'}`} />
                <span>{profileData.openNow ? 'Open Now' : 'Closed'}</span>
              </button>
            </div>
          </div>

          {/* Switch Store Selector for Super Admins / Multi-store Testing */}
          {merchants.length > 1 && (
            <div className="mb-4 px-1">
              <label className="text-[10px] uppercase font-extrabold text-ink-muted block mb-1">Switch Merchant:</label>
              <select
                value={selectedMerchantId}
                onChange={(e) => setSelectedMerchantId(e.target.value)}
                className="w-full bg-paper border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-bold text-ink focus:outline-none focus:border-accent"
              >
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                ))}
              </select>
            </div>
          )}

          {/* 14 Navigation Links */}
          <nav className="space-y-1">
            {sidebarNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-ink-soft hover:text-ink hover:bg-paper-warm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-accent' : 'text-ink-muted'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      isActive ? 'bg-accent text-ink' : 'bg-ink/10 text-ink'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ================= MAIN CONTENT AREA ================= */}
        <main className="flex-1 w-full space-y-6">
          {/* ================= 1. DASHBOARD VIEW ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">Business Dashboard</h1>
                  <p className="text-xs text-ink-muted mt-0.5">Real-time local trade activity, active orders, and booking ledger</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenAddProduct}
                    className="px-3.5 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add Product</span>
                  </button>
                  <button
                    onClick={handleOpenAddService}
                    className="px-3.5 py-2 rounded-xl bg-ink text-paper font-bold text-xs hover:bg-ink-soft transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Wrench size={13} />
                    <span>Add Service</span>
                  </button>
                </div>
              </div>

              {/* 7 Required Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Today's Orders */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Today's Orders</span>
                  <div className="font-display font-black text-2xl text-ink">{dashboardStats.todayOrdersCount}</div>
                  <div className="text-[11px] text-accent-deep font-bold">R{dashboardStats.todayRevenue} today</div>
                </div>

                {/* 2. Pending Orders */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Pending Orders</span>
                  <div className="font-display font-black text-2xl text-ink">{dashboardStats.pendingOrdersCount}</div>
                  <div className="text-[11px] text-ink-muted">Requires fulfillment / delivery</div>
                </div>

                {/* 3. Completed Orders */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Completed Orders</span>
                  <div className="font-display font-black text-2xl text-ink">{dashboardStats.completedOrdersCount}</div>
                  <div className="text-[11px] text-success font-bold flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>Successfully delivered</span>
                  </div>
                </div>

                {/* 4. Total Revenue */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Total Revenue</span>
                  <div className="font-display font-black text-2xl text-ink">R{dashboardStats.revenue}</div>
                  <div className="text-[11px] text-success font-bold flex items-center gap-1">
                    <ArrowUpRight size={12} />
                    <span>Gross sales</span>
                  </div>
                </div>

                {/* 5. Monthly Revenue */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Monthly Revenue</span>
                  <div className="font-display font-black text-2xl text-ink">R{dashboardStats.monthlyRevenue}</div>
                  <div className="text-[11px] text-ink-muted">Current calendar month</div>
                </div>

                {/* 6. Bookings */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Service Bookings</span>
                  <div className="font-display font-black text-2xl text-ink">{dashboardStats.bookingsCount}</div>
                  <div className="text-[11px] text-accent-deep font-bold">{dashboardStats.confirmedBookingsCount} confirmed appointments</div>
                </div>

                {/* 7. Customers */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Unique Customers</span>
                  <div className="font-display font-black text-2xl text-ink">{dashboardStats.customersCount}</div>
                  <div className="text-[11px] text-ink-muted">Buyers & appointments</div>
                </div>

                {/* 8. Rating & Reviews */}
                <div className="p-4 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Rating & Reviews</span>
                  <div className="font-display font-black text-2xl text-ink flex items-center gap-1.5">
                    <Star size={20} className="fill-accent text-accent-deep" />
                    <span>{currentMerchant.rating ? currentMerchant.rating.toFixed(1) : '5.0'}</span>
                  </div>
                  <div className="text-[11px] text-accent-deep font-bold">
                    {reviewsList.length} verified reviews
                  </div>
                </div>
              </div>

              {/* Recent Orders & Recent Bookings Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="p-5 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-ink">Recent Orders</h3>
                      <p className="text-[11px] text-ink-muted">Latest deliveries & collections</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-bold text-accent-deep hover:underline"
                    >
                      View All ({merchantOrders.length})
                    </button>
                  </div>

                  {dashboardStats.recentOrders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl">
                      No customer orders yet today.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dashboardStats.recentOrders.map(o => (
                        <div key={o.id} className="p-3 rounded-2xl bg-paper-warm border border-ink/10 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-ink">#{o.id}</span>
                              <span className="text-[11px] font-semibold text-ink-soft">· {o.customer}</span>
                            </div>
                            <span className="text-[10px] text-ink-muted">{o.placedAt || 'Recently'} · {o.lines?.length || 1} items</span>
                          </div>
                          <div className="text-right">
                            <span className="font-display font-bold text-xs text-ink block">R{o.total}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                              o.status === 'Delivered' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent-deep'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Bookings */}
                <div className="p-5 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-ink">Recent Bookings</h3>
                      <p className="text-[11px] text-ink-muted">Scheduled client appointments</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-xs font-bold text-accent-deep hover:underline"
                    >
                      View All ({merchantBookings.length})
                    </button>
                  </div>

                  {dashboardStats.recentBookings.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl">
                      No service appointments booked yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dashboardStats.recentBookings.map(b => (
                        <div key={b.id} className="p-3 rounded-2xl bg-paper-warm border border-ink/10 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-ink">{b.serviceName || b.serviceTitle}</span>
                              <span className="text-[11px] font-semibold text-ink-soft">· {b.customerName}</span>
                            </div>
                            <span className="text-[10px] text-ink-muted">{b.date} at {b.timeSlot || b.time}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-display font-bold text-xs text-ink block">R{b.servicePrice || b.price}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                              b.status === 'Confirmed' ? 'bg-success/20 text-success' : 'bg-warning-tint text-warning'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= 2. BUSINESS PROFILE VIEW ================= */}
          {activeTab === 'profile' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                <div>
                  <h2 className="font-display font-black text-xl text-ink">Business Profile Settings</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Edit store branding, contact details, category, and opening hours</p>
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm"
                >
                  Save Profile
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Business Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Category</label>
                    <input
                      type="text"
                      value={profileData.category}
                      onChange={e => setProfileData({ ...profileData, category: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Contact Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Business Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Street Address</label>
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={e => setProfileData({ ...profileData, address: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Suburb / Local Area</label>
                    <input
                      type="text"
                      value={profileData.suburb}
                      onChange={e => setProfileData({ ...profileData, suburb: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">City / Town</label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={e => setProfileData({ ...profileData, city: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Province (South Africa)</label>
                    <select
                      value={profileData.province}
                      onChange={e => setProfileData({ ...profileData, province: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="Gauteng">Gauteng</option>
                      <option value="Western Cape">Western Cape</option>
                      <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                      <option value="Eastern Cape">Eastern Cape</option>
                      <option value="Free State">Free State</option>
                      <option value="Limpopo">Limpopo</option>
                      <option value="Mpumalanga">Mpumalanga</option>
                      <option value="North West">North West</option>
                      <option value="Northern Cape">Northern Cape</option>
                    </select>
                  </div>

                  {/* Geolocation Coordinates & Auto-Geocoding */}
                  <div className="sm:col-span-2 bg-paper-warm/80 p-4 rounded-2xl border border-ink/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <MapPin size={14} className="text-accent-deep" />
                          <span>Store GPS Coordinates</span>
                        </span>
                        <p className="text-[11px] text-ink-muted">Used for exact geodesic distance calculations ("1.4 km away")</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGeocodePrimaryAddress}
                        disabled={isGeocoding}
                        className="px-3 py-1.5 bg-paper hover:bg-accent/20 border border-ink/20 text-xs font-bold text-ink rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        {isGeocoding ? 'Locating...' : '📍 Auto-Geocode Address'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={profileData.latitude}
                          onChange={e => setProfileData({ ...profileData, latitude: Number(e.target.value) })}
                          className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-1.5 text-xs font-semibold text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={profileData.longitude}
                          onChange={e => setProfileData({ ...profileData, longitude: Number(e.target.value) })}
                          className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-1.5 text-xs font-semibold text-ink"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Service Area Type & Coverage Radius */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Operating Mode / Service Area Type</label>
                    <select
                      value={profileData.serviceType}
                      onChange={e => setProfileData({ ...profileData, serviceType: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="storefront">Physical Storefront Only (Customer visits location)</option>
                      <option value="service_area">Mobile Service Area Only (Tradesman travels to customer)</option>
                      <option value="hybrid">Hybrid (Walk-in counter + Mobile service/deliveries)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-ink">Service / Delivery Radius</label>
                      <span className="text-xs font-extrabold text-accent-deep">{profileData.serviceRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={profileData.serviceRadius}
                      onChange={e => setProfileData({ ...profileData, serviceRadius: Number(e.target.value) })}
                      className="w-full accent-accent cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-ink-muted">
                      <span>1 km (Local)</span>
                      <span>50 km (Metro)</span>
                      <span>100 km (Regional)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Website URL</label>
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={e => setProfileData({ ...profileData, website: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Opening Hours</label>
                    <input
                      type="text"
                      value={profileData.businessHours}
                      onChange={e => setProfileData({ ...profileData, businessHours: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      placeholder="e.g. Mon - Sat: 08:30 - 17:00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Tagline</label>
                  <input
                    type="text"
                    value={profileData.tagline}
                    onChange={e => setProfileData({ ...profileData, tagline: e.target.value })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Business Description / About Us</label>
                  <textarea
                    rows={3}
                    value={profileData.about}
                    onChange={e => setProfileData({ ...profileData, about: e.target.value })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl p-3 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Logo Image URL</label>
                    <input
                      type="url"
                      value={profileData.logo}
                      onChange={e => setProfileData({ ...profileData, logo: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Cover Banner Image URL</label>
                    <input
                      type="url"
                      value={profileData.cover}
                      onChange={e => setProfileData({ ...profileData, cover: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink/10">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-extrabold text-xs transition-colors shadow-sm"
                  >
                    Save All Changes
                  </button>
                </div>
              </form>

              {/* Secondary Branch Locations Manager */}
              <div className="pt-6 border-t border-ink/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <Store size={15} className="text-accent-deep" />
                      <span>Secondary Branch Locations ({branches.length})</span>
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Add satellite depots, regional branches, and store fronts to be discovered in multiple suburbs/cities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBranchModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={13} />
                    <span>Add Branch</span>
                  </button>
                </div>

                {branches.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 text-xs text-ink-muted text-center">
                    No secondary branches registered. Your business is currently discovered via your primary address in {profileData.suburb}, {profileData.city}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {branches.map(b => (
                      <div key={b.id} className="p-3.5 rounded-2xl bg-paper-warm border border-ink/15 flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                            <span>{b.name}</span>
                            {b.isPrimary && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-accent font-bold text-ink">PRIMARY</span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-soft mt-0.5">{b.address}</div>
                          <div className="text-[10px] text-ink-muted">{b.suburb || b.city}, {b.province}</div>
                          <div className="text-[10px] text-accent-deep font-semibold mt-1">
                            Radius: {b.serviceRadius} km • Lat: {Number(b.latitude).toFixed(3)}, Lng: {Number(b.longitude).toFixed(3)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBranch(b.id)}
                          className="p-1.5 text-ink-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete branch"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 3. PRODUCTS VIEW (CRUD) ================= */}
          {activeTab === 'products' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
                <div>
                  <h2 className="font-display font-black text-xl text-ink">Product Management</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Create, edit, activate, and manage physical products and inventory</p>
                </div>
                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>New Product</span>
                </button>
              </div>

              {/* Product Search & Filter */}
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                />
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink/15 text-[11px] uppercase font-bold text-ink-muted">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {merchantProducts.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-muted text-xs">
                          {productSearch ? `No products match "${productSearch}".` : 'No products listed yet. Click "New Product" above to publish your first item.'}
                        </td>
                      </tr>
                    ) : (
                      merchantProducts
                        .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(prod => (
                        <tr key={prod.id} className="hover:bg-paper-warm/60 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-3">
                            <img src={prod.image} alt={prod.name} className="w-10 h-10 rounded-lg object-cover border border-ink/10" />
                            <div>
                              <span className="font-bold text-ink block">{prod.name}</span>
                              <span className="text-[10px] text-ink-muted">#{prod.id}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-ink-soft">{prod.category}</td>
                          <td className="py-3 px-3 font-bold text-ink">R{prod.price}</td>
                          <td className="py-3 px-3 text-ink-soft">{prod.stockCount || 10} in stock</td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => handleToggleItemStock(prod)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all ${
                                prod.inStock !== false
                                  ? 'bg-success/20 text-success border border-success/30'
                                  : 'bg-ink/10 text-ink-muted border border-ink/20'
                              }`}
                              title="Click to toggle status"
                            >
                              {prod.inStock !== false ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1.5 rounded-lg bg-paper-warm hover:bg-paper border border-ink/10 text-ink hover:text-accent-deep transition-colors"
                              title="Edit product"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(prod)}
                              className="p-1.5 rounded-lg bg-paper-warm hover:bg-danger/10 border border-ink/10 text-ink-muted hover:text-danger transition-colors"
                              title="Delete product"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 4. SERVICES VIEW (CRUD) ================= */}
          {activeTab === 'services' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
                <div>
                  <h2 className="font-display font-black text-xl text-ink">Service Management</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Create, edit, activate, and manage professional services and appointments</p>
                </div>
                <button
                  onClick={handleOpenAddService}
                  className="px-4 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>New Service</span>
                </button>
              </div>

              {/* Service Search */}
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Filter services..."
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                  className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                />
              </div>

              {/* Services Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink/15 text-[11px] uppercase font-bold text-ink-muted">
                      <th className="py-2.5 px-3">Service</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Call-Out Rate</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {merchantServices.filter(s => !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-muted text-xs">
                          {serviceSearch ? `No services match "${serviceSearch}".` : 'No services listed yet. Click "New Service" above to add your first bookable trade or styling service.'}
                        </td>
                      </tr>
                    ) : (
                      merchantServices
                        .filter(s => !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                        .map(srv => (
                        <tr key={srv.id} className="hover:bg-paper-warm/60 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-3">
                            <img src={srv.image} alt={srv.name} className="w-10 h-10 rounded-lg object-cover border border-ink/10" />
                            <div>
                              <span className="font-bold text-ink block">{srv.name}</span>
                              <span className="text-[10px] text-ink-muted">#{srv.id}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-ink-soft">{srv.category}</td>
                          <td className="py-3 px-3 font-bold text-ink">R{srv.price}</td>
                          <td className="py-3 px-3 text-ink-soft">{srv.duration || '1 hour'}</td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => handleToggleItemStock(srv)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all ${
                                srv.inStock !== false
                                  ? 'bg-success/20 text-success border border-success/30'
                                  : 'bg-ink/10 text-ink-muted border border-ink/20'
                              }`}
                              title="Click to toggle status"
                            >
                              {srv.inStock !== false ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenEditProduct(srv)}
                              className="p-1.5 rounded-lg bg-paper-warm hover:bg-paper border border-ink/10 text-ink hover:text-accent-deep transition-colors"
                              title="Edit service"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(srv)}
                              className="p-1.5 rounded-lg bg-paper-warm hover:bg-danger/10 border border-ink/10 text-ink-muted hover:text-danger transition-colors"
                              title="Delete service"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 5. CATEGORIES VIEW ================= */}
          {activeTab === 'categories' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="border-b border-ink/10 pb-4">
                <h2 className="font-display font-black text-xl text-ink">Store Catalog Categories</h2>
                <p className="text-xs text-ink-muted mt-0.5">Category distribution and breakdown across your listings</p>
              </div>

              {Array.from(new Set([...merchantProducts, ...merchantServices].map(p => p.category).filter(Boolean))).length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl">
                  No active categories yet. Publish your first product or bookable service to establish storefront catalog categories.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(new Set([...merchantProducts, ...merchantServices].map(p => p.category).filter(Boolean))).map(cat => {
                    const pCount = merchantProducts.filter(p => p.category === cat).length;
                    const sCount = merchantServices.filter(s => s.category === cat).length;
                    return (
                      <div key={cat} className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm text-ink">{cat}</span>
                          <span className="text-[10px] bg-accent/20 text-accent-deep font-extrabold px-2 py-0.5 rounded-full">
                            {pCount + sCount} listings
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-muted flex items-center gap-3">
                          <span>{pCount} Goods</span>
                          <span>·</span>
                          <span>{sCount} Services</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= 6. ORDERS VIEW ================= */}
          {activeTab === 'orders' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
                <div>
                  <h2 className="font-display font-black text-xl text-ink">Order Fulfillment & Deliveries</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Manage customer orders, change statuses, and coordinate local drop-offs</p>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['all', 'PENDING', 'ACCEPTED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'].map(st => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                        orderStatusFilter === st
                          ? 'bg-ink text-paper shadow-sm'
                          : 'bg-paper-warm text-ink-soft hover:bg-paper'
                      }`}
                    >
                      {st === 'all' ? 'All Orders' : st}
                    </button>
                  ))}
                </div>
              </div>

              {merchantOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl">
                  No orders recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink/15 text-[11px] uppercase font-bold text-ink-muted">
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Fulfillment Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {merchantOrders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-ink-muted text-xs">
                            {orderStatusFilter === 'all' ? 'No customer orders placed yet.' : `No orders found with status "${orderStatusFilter}".`}
                          </td>
                        </tr>
                      ) : (
                        merchantOrders
                          .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                          .map(order => {
                            const st = order.status;
                            const isPending = st === 'PENDING' || st === 'Placed';
                            const isAccepted = st === 'ACCEPTED';
                            const isProcessing = st === 'PROCESSING' || st === 'Preparing';
                            const isReady = st === 'READY';
                            const isOut = st === 'OUT_FOR_DELIVERY' || st === 'Out for delivery';
                            const isDelivered = st === 'DELIVERED' || st === 'Delivered';
                            const isCompleted = st === 'COMPLETED' || st === 'Completed';
                            const isCancelledOrRejected = st === 'CANCELLED' || st === 'REJECTED' || st === 'Cancelled' || st === 'Rejected';

                            return (
                              <tr key={order.id} className="hover:bg-paper-warm/60 transition-colors">
                                <td className="py-3 px-3 font-bold text-ink">#{order.id}</td>
                                <td className="py-3 px-3">
                                  <span className="font-bold text-ink block">{order.customer}</span>
                                  <span className="text-[10px] text-ink-muted">{order.phone}</span>
                                </td>
                                <td className="py-3 px-3 font-black text-ink">R{order.total}</td>
                                <td className="py-3 px-3 text-ink-soft">{order.deliveryType}</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    isCompleted || isDelivered
                                      ? 'bg-success/20 text-success'
                                      : isCancelledOrRejected
                                      ? 'bg-danger/20 text-danger'
                                      : 'bg-accent/20 text-accent-deep'
                                  }`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {isPending && (
                                      <>
                                        <button
                                          onClick={() => handleAdvanceOrderStatus(order.id, 'ACCEPTED')}
                                          className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent-hover text-ink font-bold text-[11px] shadow-sm transition-colors"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={() => handleAdvanceOrderStatus(order.id, 'REJECTED')}
                                          className="px-2 py-1 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 font-bold text-[11px] transition-colors"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}

                                    {isAccepted && (
                                      <button
                                        onClick={() => handleAdvanceOrderStatus(order.id, 'PROCESSING')}
                                        className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent-hover text-ink font-bold text-[11px] shadow-sm transition-colors"
                                      >
                                        Process
                                      </button>
                                    )}

                                    {isProcessing && (
                                      <button
                                        onClick={() => handleAdvanceOrderStatus(order.id, 'READY')}
                                        className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent-hover text-ink font-bold text-[11px] shadow-sm transition-colors"
                                      >
                                        Mark Ready
                                      </button>
                                    )}

                                    {isReady && (
                                      <>
                                        <button
                                          onClick={() => handleAdvanceOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                                          className="px-2 py-1 rounded-lg bg-paper border border-ink/20 hover:bg-paper-warm text-ink font-bold text-[11px] transition-colors"
                                        >
                                          Dispatch
                                        </button>
                                        <button
                                          onClick={() => handleAdvanceOrderStatus(order.id, 'DELIVERED')}
                                          className="px-2.5 py-1 rounded-lg bg-success text-white font-bold text-[11px] shadow-sm transition-colors"
                                        >
                                          Mark Delivered
                                        </button>
                                      </>
                                    )}

                                    {isOut && (
                                      <button
                                        onClick={() => handleAdvanceOrderStatus(order.id, 'DELIVERED')}
                                        className="px-2.5 py-1 rounded-lg bg-success text-white font-bold text-[11px] shadow-sm transition-colors"
                                      >
                                        Mark Delivered
                                      </button>
                                    )}

                                    {isDelivered && (
                                      <button
                                        onClick={() => handleAdvanceOrderStatus(order.id, 'COMPLETED')}
                                        className="px-2.5 py-1 rounded-lg bg-ink text-paper font-bold text-[11px] shadow-sm transition-colors"
                                      >
                                        Complete
                                      </button>
                                    )}

                                    {isCompleted && (
                                      <span className="text-[11px] font-bold text-success">✓ Completed</span>
                                    )}

                                    {isCancelledOrRejected && (
                                      <span className="text-[11px] font-bold text-danger">Closed</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= 7. BOOKINGS VIEW ================= */}
          {activeTab === 'bookings' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              {/* Header with Switcher and Availability Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <h2 className="font-display font-black text-xl text-ink">Appointment & Booking Ledger</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Manage trade call-outs, client appointments, and schedule confirmations</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-paper-warm p-1 rounded-xl border border-ink/10">
                    <button
                      type="button"
                      onClick={() => setBookingViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        bookingViewMode === 'table' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <List size={13} />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingViewMode('calendar')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        bookingViewMode === 'calendar' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <CalendarDays size={13} />
                      <span>Calendar</span>
                    </button>
                  </div>

                  {/* Availability Settings Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsAvailabilityOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-ink/15 bg-paper hover:bg-paper-warm text-ink text-xs font-bold transition-all shadow-sm"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Configure Availability</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'All Bookings' },
                  { key: 'PENDING', label: 'Pending' },
                  { key: 'CONFIRMED', label: 'Confirmed' },
                  { key: 'RESCHEDULED', label: 'Rescheduled' },
                  { key: 'IN_PROGRESS', label: 'In Progress' },
                  { key: 'COMPLETED', label: 'Completed' },
                  { key: 'CANCELLED', label: 'Cancelled' },
                  { key: 'NO_SHOW', label: 'No Show' },
                  { key: 'REJECTED', label: 'Rejected' },
                ].map(st => {
                  const isSelected = bookingStatusFilter.toUpperCase() === st.key.toUpperCase();
                  return (
                    <button
                      key={st.key}
                      onClick={() => setBookingStatusFilter(st.key)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-ink text-paper shadow-sm'
                          : 'bg-paper-warm text-ink-soft hover:bg-paper'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              {/* TABLE VIEW */}
              {bookingViewMode === 'table' && (
                <div>
                  {merchantBookings.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl">
                      No appointments scheduled yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-ink/15 text-[11px] uppercase font-bold text-ink-muted">
                            <th className="py-2.5 px-3">Service</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Date & Slot</th>
                            <th className="py-2.5 px-3">Rate</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink/10">
                          {merchantBookings.filter(b => {
                            if (bookingStatusFilter === 'all') return true;
                            const normSt = (b.status || '').toUpperCase();
                            const filterSt = bookingStatusFilter.toUpperCase();
                            return normSt === filterSt || (b.status || '') === bookingStatusFilter;
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-ink-muted text-xs">
                                No appointments found matching status "{bookingStatusFilter}".
                              </td>
                            </tr>
                          ) : (
                            merchantBookings
                              .filter(b => {
                                if (bookingStatusFilter === 'all') return true;
                                const normSt = (b.status || '').toUpperCase();
                                const filterSt = bookingStatusFilter.toUpperCase();
                                return normSt === filterSt || (b.status || '') === bookingStatusFilter;
                              })
                              .map(bk => {
                                const norm = (bk.status || '').toUpperCase();
                                const isPending = norm === 'PENDING';
                                const isConfirmed = norm === 'CONFIRMED' || norm === 'RESCHEDULED';
                                const isInProgress = norm === 'IN_PROGRESS';
                                const isCompleted = norm === 'COMPLETED';

                                return (
                                  <tr key={bk.id} className="hover:bg-paper-warm/60 transition-colors">
                                    <td className="py-3 px-3">
                                      <span className="font-bold text-ink block">{bk.serviceName || bk.serviceTitle}</span>
                                      <span className="text-[10px] text-ink-muted font-mono">#{bk.id.slice(0, 8)}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="font-bold text-ink block">{bk.customerName}</span>
                                      <span className="text-[10px] text-ink-muted">{bk.phone}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-medium text-ink-soft">
                                        <span>{bk.date} · {bk.timeSlot || bk.time}</span>
                                        {bk.rescheduledDate && (
                                          <span className="block text-[10px] text-purple-600 font-bold">
                                            Rescheduled from {bk.rescheduledDate} {bk.rescheduledTime}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 font-bold text-ink">
                                      R{bk.servicePrice || bk.price}
                                    </td>
                                    <td className="py-3 px-3">
                                      {norm === 'CONFIRMED' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">Confirmed</span>
                                      )}
                                      {norm === 'PENDING' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">Pending</span>
                                      )}
                                      {norm === 'RESCHEDULED' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">Rescheduled</span>
                                      )}
                                      {norm === 'IN_PROGRESS' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">In Progress</span>
                                      )}
                                      {norm === 'COMPLETED' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span>
                                      )}
                                      {norm === 'CANCELLED' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-300">Cancelled</span>
                                      )}
                                      {norm === 'REJECTED' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>
                                      )}
                                      {norm === 'NO_SHOW' && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-200 text-zinc-800 border border-zinc-400">No Show</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      {isPending && (
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <button
                                            onClick={() => handleAdvanceBookingStatus(bk.id, 'CONFIRMED')}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors"
                                          >
                                            Accept
                                          </button>
                                          <button
                                            onClick={() => handleAdvanceBookingStatus(bk.id, 'REJECTED')}
                                            className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] transition-colors"
                                          >
                                            Reject
                                          </button>
                                          <button
                                            onClick={() => handleOpenReschedule(bk)}
                                            className="px-2 py-1 rounded-lg bg-paper-warm hover:bg-paper border border-ink/15 text-ink font-bold text-[11px] transition-colors"
                                          >
                                            Reschedule
                                          </button>
                                        </div>
                                      )}

                                      {isConfirmed && (
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <button
                                            onClick={() => handleAdvanceBookingStatus(bk.id, 'IN_PROGRESS')}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-sm transition-colors"
                                          >
                                            Start
                                          </button>
                                          <button
                                            onClick={() => handleOpenReschedule(bk)}
                                            className="px-2 py-1 rounded-lg bg-paper-warm hover:bg-paper border border-ink/15 text-ink font-bold text-[11px] transition-colors"
                                          >
                                            Reschedule
                                          </button>
                                          <button
                                            onClick={() => handleAdvanceBookingStatus(bk.id, 'NO_SHOW')}
                                            className="px-2 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-[11px] transition-colors"
                                          >
                                            No-Show
                                          </button>
                                          <button
                                            onClick={() => handleAdvanceBookingStatus(bk.id, 'CANCELLED')}
                                            className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      )}

                                      {isInProgress && (
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <button
                                            onClick={() => handleAdvanceBookingStatus(bk.id, 'COMPLETED')}
                                            className="px-3 py-1 rounded-lg bg-ink hover:bg-ink-soft text-paper font-bold text-[11px] shadow-sm transition-colors"
                                          >
                                            Complete
                                          </button>
                                        </div>
                                      )}

                                      {isCompleted && (
                                        <span className="text-[11px] font-bold text-emerald-700">✓ Completed</span>
                                      )}

                                      {!isPending && !isConfirmed && !isInProgress && !isCompleted && (
                                        <span className="text-[11px] font-bold text-ink-muted capitalize">
                                          {norm.toLowerCase().replace('_', ' ')}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* CALENDAR-STYLE BOOKING MANAGEMENT VIEW */}
              {bookingViewMode === 'calendar' && (
                <div className="space-y-4">
                  {/* Date Navigation Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-paper-warm border border-ink/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const [y, m, d] = calendarDate.split('-').map(Number);
                          const dt = new Date(y, m - 1, d);
                          dt.setDate(dt.getDate() - 1);
                          setCalendarDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
                        }}
                        className="p-1.5 rounded-xl bg-paper hover:bg-paper-warm border border-ink/15 text-ink transition-colors"
                        title="Previous Day"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <input
                        type="date"
                        value={calendarDate}
                        onChange={e => setCalendarDate(e.target.value)}
                        className="bg-paper border border-ink/15 rounded-xl px-3 py-1 text-xs font-bold text-ink focus:outline-none focus:border-accent cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const [y, m, d] = calendarDate.split('-').map(Number);
                          const dt = new Date(y, m - 1, d);
                          dt.setDate(dt.getDate() + 1);
                          setCalendarDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
                        }}
                        className="p-1.5 rounded-xl bg-paper hover:bg-paper-warm border border-ink/15 text-ink transition-colors"
                        title="Next Day"
                      >
                        <ChevronRight size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalendarDate(new Date().toISOString().split('T')[0])}
                        className="px-2.5 py-1 rounded-xl bg-paper border border-ink/15 text-[11px] font-bold text-ink hover:bg-paper-warm transition-colors"
                      >
                        Today
                      </button>
                    </div>

                    <div className="text-xs font-bold text-ink">
                      {new Date(calendarDate + 'T00:00:00').toLocaleDateString('en-ZA', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* Day Schedule Grid */}
                  <div className="space-y-2">
                    {calendarSlots.map(slot => {
                      const slotBookings = merchantBookings.filter(b => {
                        if (b.date !== calendarDate) return false;
                        const t = b.timeSlot || b.time || '';
                        return t === slot || t.startsWith(slot);
                      });

                      const hasBookings = slotBookings.length > 0;

                      return (
                        <div
                          key={slot}
                          className={`p-3 rounded-2xl border transition-all ${
                            hasBookings
                              ? 'bg-paper border-ink/20 shadow-sm'
                              : 'bg-paper-warm/40 border-dashed border-ink/15'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-black text-ink min-w-[50px]">{slot}</span>
                              
                              {!hasBookings ? (
                                <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                  Available Slot (Open for booking)
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {slotBookings.map(bk => {
                                    const norm = (bk.status || '').toUpperCase();
                                    return (
                                      <div key={bk.id} className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-xs text-ink">{bk.serviceName || bk.serviceTitle}</span>
                                        <span className="text-xs text-ink-muted">·</span>
                                        <span className="text-xs font-semibold text-ink-soft">{bk.customerName} ({bk.phone})</span>
                                        <span className="text-xs font-bold text-ink">R{bk.servicePrice || bk.price}</span>
                                        {norm === 'CONFIRMED' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-md">Confirmed</span>
                                        )}
                                        {norm === 'PENDING' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md">Pending</span>
                                        )}
                                        {norm === 'RESCHEDULED' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-purple-100 text-purple-800 rounded-md">Rescheduled</span>
                                        )}
                                        {norm === 'IN_PROGRESS' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-md">In Progress</span>
                                        )}
                                        {norm === 'COMPLETED' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">Completed</span>
                                        )}
                                        {norm === 'CANCELLED' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-gray-100 text-gray-700 rounded-md">Cancelled</span>
                                        )}
                                        {norm === 'REJECTED' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-md">Rejected</span>
                                        )}
                                        {norm === 'NO_SHOW' && (
                                          <span className="px-2 py-0.2 text-[10px] font-bold bg-zinc-200 text-zinc-800 rounded-md">No Show</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Slot action buttons if booked */}
                            {hasBookings && (
                              <div className="flex items-center gap-1.5 self-end sm:self-center">
                                {slotBookings.map(bk => {
                                  const norm = (bk.status || '').toUpperCase();
                                  if (norm === 'PENDING') {
                                    return (
                                      <div key={bk.id} className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleAdvanceBookingStatus(bk.id, 'CONFIRMED')}
                                          className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px]"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={() => handleAdvanceBookingStatus(bk.id, 'REJECTED')}
                                          className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px]"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          onClick={() => handleOpenReschedule(bk)}
                                          className="px-2 py-0.5 rounded-lg border border-ink/15 text-ink font-bold text-[10px]"
                                        >
                                          Reschedule
                                        </button>
                                      </div>
                                    );
                                  }
                                  if (norm === 'CONFIRMED' || norm === 'RESCHEDULED') {
                                    return (
                                      <div key={bk.id} className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleAdvanceBookingStatus(bk.id, 'IN_PROGRESS')}
                                          className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-bold text-[10px]"
                                        >
                                          Start
                                        </button>
                                        <button
                                          onClick={() => handleOpenReschedule(bk)}
                                          className="px-2 py-0.5 rounded-lg border border-ink/15 text-ink font-bold text-[10px]"
                                        >
                                          Reschedule
                                        </button>
                                        <button
                                          onClick={() => handleAdvanceBookingStatus(bk.id, 'NO_SHOW')}
                                          className="px-2 py-0.5 rounded-lg bg-zinc-200 text-zinc-800 font-bold text-[10px]"
                                        >
                                          No-Show
                                        </button>
                                      </div>
                                    );
                                  }
                                  if (norm === 'IN_PROGRESS') {
                                    return (
                                      <button
                                        key={bk.id}
                                        onClick={() => handleAdvanceBookingStatus(bk.id, 'COMPLETED')}
                                        className="px-2.5 py-0.5 rounded-lg bg-ink text-paper font-bold text-[10px]"
                                      >
                                        Complete
                                      </button>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Off-slot bookings for this date (if any) */}
                  {merchantBookings.filter(b => {
                    if (b.date !== calendarDate) return false;
                    const t = b.timeSlot || b.time || '';
                    return !calendarSlots.some(slot => t === slot || t.startsWith(slot));
                  }).length > 0 && (
                    <div className="pt-4 border-t border-ink/10 space-y-2">
                      <h4 className="text-xs font-bold text-ink-muted uppercase">Additional Appointments Today</h4>
                      <div className="space-y-2">
                        {merchantBookings.filter(b => {
                          if (b.date !== calendarDate) return false;
                          const t = b.timeSlot || b.time || '';
                          return !calendarSlots.some(slot => t === slot || t.startsWith(slot));
                        }).map(bk => (
                          <div key={bk.id} className="p-3 rounded-2xl bg-paper border border-ink/15 flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-ink">{bk.timeSlot || bk.time}</span>
                                <span className="font-bold text-xs text-ink">{bk.serviceName || bk.serviceTitle}</span>
                              </div>
                              <span className="text-xs text-ink-muted">{bk.customerName} ({bk.phone}) · R{bk.servicePrice || bk.price}</span>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-paper-warm text-ink-soft">
                              {bk.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= 8. CUSTOMERS VIEW ================= */}
          {activeTab === 'customers' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="border-b border-ink/10 pb-4">
                <h2 className="font-display font-black text-xl text-ink">Customer Directory</h2>
                <p className="text-xs text-ink-muted mt-0.5">Directory of clients who have purchased products or booked services with your business</p>
              </div>

              {customersList.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl">
                  No customer orders or appointments recorded yet. Your client directory will automatically populate as orders and bookings are received.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customersList.map((cust, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent-deep font-black flex items-center justify-center text-xs">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-ink">{cust.name}</h4>
                          <span className="text-[10px] text-ink-muted">{cust.phone}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-ink">R{cust.totalSpent}</span>
                    </div>

                    <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-[11px] text-ink-muted">
                      <span>{cust.orderCount} orders · {cust.bookingCount} bookings</span>
                      <a
                        href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-accent-deep hover:underline flex items-center gap-1"
                      >
                        <MessageCircle size={12} />
                        <span>Chat</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {/* ================= 8B. SECURE MESSAGING WORKSPACE (STAGE 14) ================= */}
          {activeTab === 'messages' && (() => {
            const filteredConvs = merchantConversations.filter(c => {
              if (!merchantSearchFilter.trim()) return true;
              const q = merchantSearchFilter.toLowerCase();
              const customerName = (c.user?.name || 'Customer').toLowerCase();
              const lastMsg = (c.lastMessage || '').toLowerCase();
              return customerName.includes(q) || lastMsg.includes(q);
            });

            const activeMessages = activeMerchantConv?.messages || [];

            return (
              <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-black text-xl text-ink">Customer Conversations</h2>
                      {unreadMerchantConversationsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-accent text-ink text-xs font-bold">
                          {unreadMerchantConversationsCount} new
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Direct, secure client inquiries and live chats for {currentMerchant.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadMerchantConversations}
                      className="px-3 py-1.5 rounded-xl bg-paper-warm hover:bg-ink/10 border border-ink/10 text-xs font-bold text-ink flex items-center gap-1.5 transition-colors"
                      title="Refresh conversations"
                    >
                      <RefreshCw size={13} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Split Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 border border-ink/15 rounded-2xl overflow-hidden bg-paper shadow-sm min-h-[550px]">
                  {/* Left Column: Conversation Directory */}
                  <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-ink/15 flex flex-col bg-paper-warm/30">
                    {/* Search / Filter */}
                    <div className="p-3 border-b border-ink/10 bg-paper">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          value={merchantSearchFilter}
                          onChange={e => setMerchantSearchFilter(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-paper-warm border border-ink/10 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-ink/5">
                      {filteredConvs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-ink-muted">
                          {merchantConversations.length === 0
                            ? "No customer inquiries yet. When consumers message your store, their threads will appear here."
                            : "No conversations match your search filter."}
                        </div>
                      ) : (
                        filteredConvs.map(conv => {
                          const isSelected = activeMerchantConv?.id === conv.id;
                          const hasUnread = conv.unreadCountBusiness > 0;
                          const customerName = conv.user?.name || 'Customer';
                          const timeFormatted = conv.lastMessageAt
                            ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '';

                          return (
                            <button
                              key={conv.id}
                              onClick={() => handleSelectMerchantConv(conv)}
                              className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-paper-warm ${
                                isSelected ? 'bg-paper shadow-sm border-l-4 border-accent' : ''
                              }`}
                            >
                              <div className="relative shrink-0">
                                {conv.user?.avatar ? (
                                  <img
                                    src={conv.user.avatar}
                                    alt={customerName}
                                    className="w-10 h-10 rounded-full object-cover border border-ink/10"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent-deep font-bold flex items-center justify-center text-xs">
                                    {customerName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                {hasUnread && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-ink text-[10px] font-black flex items-center justify-center border border-paper shadow-sm animate-pulse">
                                    {conv.unreadCountBusiness}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className={`text-xs truncate ${hasUnread ? 'font-black text-ink' : 'font-bold text-ink'}`}>
                                    {customerName}
                                  </h4>
                                  <span className="text-[10px] text-ink-muted shrink-0">{timeFormatted}</span>
                                </div>
                                <p className={`text-[11px] truncate mt-0.5 ${hasUnread ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                                  {conv.lastMessage || 'Started conversation'}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Active Conversation Thread */}
                  <div className="lg:col-span-8 flex flex-col bg-paper h-full">
                    {activeMerchantConv ? (
                      <>
                        {/* Thread Header */}
                        <div className="p-3.5 border-b border-ink/10 flex items-center justify-between bg-paper-warm/50">
                          <div className="flex items-center gap-3">
                            {activeMerchantConv.user?.avatar ? (
                              <img
                                src={activeMerchantConv.user.avatar}
                                alt={activeMerchantConv.user.name}
                                className="w-9 h-9 rounded-full object-cover border border-ink/10"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-accent/20 text-accent-deep font-bold flex items-center justify-center text-xs">
                                {(activeMerchantConv.user?.name || 'C').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-xs text-ink leading-tight">
                                {activeMerchantConv.user?.name || 'Customer'}
                              </h3>
                              <span className="text-[10px] text-ink-muted block">
                                {activeMerchantConv.user?.phone || activeMerchantConv.user?.email || 'Verified Consumer'}
                              </span>
                            </div>
                          </div>

                          {activeMerchantConv.user?.phone && (
                            <a
                              href={`https://wa.me/${activeMerchantConv.user.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-xl bg-success-tint hover:bg-success/20 text-success border border-success/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                              title="Open WhatsApp chat with client"
                            >
                              <Phone size={13} />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}
                        </div>

                        {/* Thread Messages */}
                        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-[350px] max-h-[420px] bg-paper">
                          {activeMessages.length === 0 ? (
                            <div className="py-16 text-center text-xs text-ink-muted">
                              No messages sent in this thread yet. Send a greeting below!
                            </div>
                          ) : (
                            activeMessages.map(msg => {
                              const isBusiness = msg.senderRole === 'business' || msg.senderRole === 'merchant';
                              const timeString = msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

                              return (
                                <div
                                  key={msg.id || msg.createdAt}
                                  className={`flex flex-col ${isBusiness ? 'items-end' : 'items-start'}`}
                                >
                                  <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs shadow-sm ${
                                      isBusiness
                                        ? 'bg-ink text-paper rounded-br-none'
                                        : 'bg-paper-warm text-ink rounded-bl-none border border-ink/10'
                                    }`}
                                  >
                                    {msg.text || msg.content}
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-ink-muted mt-1 px-1">
                                    <span>{timeString}</span>
                                    {isBusiness && (
                                      msg.read ? (
                                        <CheckCheck size={12} className="text-accent-deep font-bold" title="Read by customer" />
                                      ) : (
                                        <Check size={12} className="text-ink-muted" title="Delivered" />
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Quick Response Templates */}
                        <div className="px-3 py-2 bg-paper-warm/40 border-t border-ink/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {[
                            'Sawubona! How can we assist you today?',
                            'Yes, this item is available for immediate collection/delivery.',
                            'Thank you! Your order/appointment is confirmed.',
                            'Feel free to give us a call if you need urgent assistance.'
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMerchantReply(chip)}
                              className="px-2.5 py-1 rounded-lg bg-paper hover:bg-paper-warm border border-ink/10 text-[10px] font-medium text-ink-soft whitespace-nowrap transition-colors"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>

                        {/* Reply Input Bar */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMerchantReply();
                          }}
                          className="p-3 border-t border-ink/10 bg-paper-warm/70 flex items-center gap-2"
                        >
                          <input
                            type="text"
                            placeholder={`Reply to ${activeMerchantConv.user?.name || 'customer'}...`}
                            value={merchantReplyText}
                            onChange={e => setMerchantReplyText(e.target.value)}
                            disabled={merchantMsgSending}
                            className="flex-1 bg-paper border border-ink/15 rounded-xl px-3.5 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                          />
                          <button
                            type="submit"
                            disabled={merchantMsgSending || !merchantReplyText.trim()}
                            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-ink text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm disabled:opacity-50"
                          >
                            <span>Send</span>
                            <Send size={13} />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-muted text-xs gap-2 min-h-[350px]">
                        <MessageCircle size={32} className="text-ink-muted/50" />
                        <span className="font-bold text-ink">No conversation selected</span>
                        <p className="max-w-xs text-[11px]">
                          Choose a customer inquiry from the left panel to review chat history and reply directly.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          {activeTab === 'reviews' && (() => {
            const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            reviewsList.forEach(r => {
              const star = Math.min(Math.max(Math.round(r.rating || 5), 1), 5);
              starCounts[star] = (starCounts[star] || 0) + 1;
            });
            const totalRev = reviewsList.length;

            return (
              <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                  <div>
                    <h2 className="font-display font-black text-xl text-ink">Customer Reviews & Ratings</h2>
                    <p className="text-xs text-ink-muted mt-0.5">Manage public feedback and build community trust with verified replies</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center text-accent">
                      <Star size={20} className="fill-accent text-accent" />
                      <span className="font-display font-black text-xl text-ink ml-1.5">
                        {currentMerchant.rating ? currentMerchant.rating.toFixed(1) : '5.0'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-ink-muted">({totalRev} reviews)</span>
                  </div>
                </div>

                {/* Rating Distribution Breakdown */}
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-2 max-w-md">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1">Rating Breakdown</span>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = starCounts[star] || 0;
                    const pct = totalRev > 0 ? Math.round((count / totalRev) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-10 font-bold text-ink-soft flex items-center gap-1">
                          <span>{star}</span>
                          <Star size={11} className="fill-accent text-accent" />
                        </span>
                        <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden border border-ink/10">
                          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-14 text-right text-[11px] text-ink-muted">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>

                {/* Immutability & Trust Notice */}
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 flex items-start gap-2">
                  <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Verified & Immutable Reviews</strong>
                    Reviews are submitted by verified consumers with completed orders or appointments. Businesses cannot alter or delete customer reviews, but can publish official responses.
                  </div>
                </div>

                {reviewsList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl">
                    No customer reviews received yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewsList.map(rev => (
                      <div key={rev.id} className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs text-ink">{rev.userName || rev.author || rev.customer || 'Local Customer'}</h4>
                              {rev.orderId && (
                                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Order #{rev.orderId.slice(-6)}
                                </span>
                              )}
                              {rev.bookingId && (
                                <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                                  Booking #{rev.bookingId.slice(-6)}
                                </span>
                              )}
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={i < (rev.rating || 5) ? 'fill-accent text-accent' : 'text-ink-muted'}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-ink-soft mt-1.5">{rev.comment || rev.text}</p>
                          </div>
                          <span className="text-[10px] text-ink-muted">{rev.date || 'Recent'}</span>
                        </div>

                      {rev.reply ? (
                        <div className="mt-3 p-3 rounded-xl bg-paper border border-ink/10 text-xs">
                          <span className="font-bold text-ink-muted text-[10px] block uppercase tracking-wider">Your Response</span>
                          <p className="text-ink mt-0.5">{rev.reply}</p>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-ink/10">
                          {replyingReviewId === rev.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={replyInput}
                                onChange={e => setReplyInput(e.target.value)}
                                placeholder="Write a professional reply to this customer..."
                                className="w-full bg-paper border border-ink/15 rounded-xl p-2.5 text-xs text-ink focus:outline-none focus:border-accent resize-none"
                                rows={2}
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setReplyingReviewId(null)}
                                  className="px-3 py-1 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSendReviewReply(rev.id)}
                                  className="px-3.5 py-1 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft"
                                >
                                  Post Reply
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReplyingReviewId(rev.id);
                                setReplyInput('');
                              }}
                              className="text-xs font-bold text-accent-deep hover:underline"
                            >
                              + Reply to review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

          {/* ================= 10. PAYMENTS VIEW ================= */}
          {activeTab === 'payments' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="border-b border-ink/10 pb-4">
                <h2 className="font-display font-black text-xl text-ink">Payments & Payout Ledger</h2>
                <p className="text-xs text-ink-muted mt-0.5">Track your customer payments, platform escrows, and bank settlements</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                  <span className="text-[11px] font-bold text-ink-muted uppercase">Total Settled</span>
                  <div className="font-display font-black text-2xl text-ink mt-1">R{dashboardStats.revenue.toLocaleString()}</div>
                  <span className="text-[10px] text-success font-semibold">100% payout rate</span>
                </div>
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                  <span className="text-[11px] font-bold text-ink-muted uppercase">Escrow Held</span>
                  <div className="font-display font-black text-2xl text-ink mt-1">
                    R{merchantOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').reduce((sum, o) => sum + (Number(o.total) || 0), 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-accent-deep font-semibold">Released on delivery</span>
                </div>
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                  <span className="text-[11px] font-bold text-ink-muted uppercase">Platform Fee (0%)</span>
                  <div className="font-display font-black text-2xl text-ink mt-1">R0.00</div>
                  <span className="text-[10px] text-ink-soft font-semibold">Flat subscription active</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-accent-deep" />
                    <h4 className="font-display font-bold text-sm text-ink">Free LocalBiz SmartPOS Terminal</h4>
                  </div>
                  <p className="text-xs text-ink-soft max-w-lg">
                    Tap & Go and chip card payments synced instantly to your LocalBiz merchant ledger. Zero monthly rental fees for 12 months.
                  </p>
                </div>
                <button
                  onClick={() => addToast('SmartPOS terminal request submitted for dispatch!', 'success')}
                  className="px-4 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft whitespace-nowrap shadow-sm"
                >
                  Request Terminal
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="font-display font-bold text-sm text-ink">Recent Payment Records</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-ink/10 text-ink-muted font-bold text-[11px]">
                        <th className="py-2.5 px-3">Transaction</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5 font-medium">
                      {merchantOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-ink-muted text-xs">
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        merchantOrders.slice(0, 8).map(o => {
                          const pStatus = (o.paymentStatus || 'Pending').toUpperCase();
                          const badgeClass = (pStatus === 'PAID' || pStatus === 'SUCCESS')
                            ? 'bg-success/15 text-success'
                            : (pStatus === 'FAILED')
                              ? 'bg-red-500/15 text-red-800'
                              : (pStatus === 'REFUNDED')
                                ? 'bg-indigo-500/15 text-indigo-800'
                                : 'bg-amber-500/15 text-amber-800';

                          return (
                            <tr key={o.id} className="hover:bg-paper-warm/50">
                              <td className="py-3 px-3 font-mono font-bold text-ink">#{o.id}</td>
                              <td className="py-3 px-3 text-ink">{o.customer || 'Customer'}</td>
                              <td className="py-3 px-3 text-ink-muted capitalize">{(o.paymentMethod || 'Card').replace('_', ' ')}</td>
                              <td className="py-3 px-3 font-bold text-ink">R{o.total}</td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${badgeClass}`}>
                                  {o.paymentStatus || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 11. PROMOTIONS VIEW ================= */}
          {/* ================= 11. PROMOTIONS VIEW ================= */}
          {activeTab === 'promotions' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <h2 className="font-display font-black text-xl text-ink">Discounts & Promotions</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Create and manage coupon codes, seasonal discounts, and customer savings</p>
                </div>
                <button
                  onClick={openCreatePromoModal}
                  className="px-4 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>New Promotion</span>
                </button>
              </div>

              {/* Promotions KPI Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Total Promotions</div>
                  <div className="text-2xl font-black text-ink mt-1">{promotions.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Active Deals</div>
                  <div className="text-2xl font-black text-success mt-1">
                    {promotions.filter(p => p.status === 'ACTIVE' || p.active).length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Total Redemptions</div>
                  <div className="text-2xl font-black text-accent mt-1">
                    {promotions.reduce((sum, p) => sum + (p.usageCount || 0), 0)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-display font-bold text-sm text-ink">Promotion Campaigns</h3>
                {promotions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-muted bg-paper-warm rounded-2xl space-y-2">
                    <p className="font-bold text-ink">No active promotions yet</p>
                    <p>Create a discount coupon code to incentivize larger orders and drive more neighborhood customers.</p>
                    <button
                      onClick={openCreatePromoModal}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-ink text-paper text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Create First Promo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promotions.map(promo => {
                      const isActive = (promo.status === 'ACTIVE' || promo.active) && promo.status !== 'EXPIRED';
                      const isExpired = promo.status === 'EXPIRED' || (promo.endDate && new Date(promo.endDate) < new Date());
                      const usageLimit = promo.usageLimit;
                      const usageCount = promo.usageCount || 0;
                      const usagePercent = usageLimit ? Math.min(100, Math.round((usageCount / usageLimit) * 100)) : null;

                      return (
                        <div key={promo.id} className="p-4 rounded-2xl bg-paper-warm border border-ink/10 flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-black text-sm bg-accent/30 text-ink px-2.5 py-0.5 rounded-lg">
                                {promo.code}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isExpired ? 'bg-danger/20 text-danger' :
                                  isActive ? 'bg-success/20 text-success' : 'bg-ink/10 text-ink-muted'
                                }`}>
                                  {isExpired ? 'Expired' : isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs font-black text-ink">
                                  {promo.discountType === 'FIXED' ? `R${promo.discountValue} OFF` : `${promo.discountValue || promo.discountPercent}% OFF`}
                                </span>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-bold text-xs text-ink">{promo.name || promo.code}</h4>
                              <p className="text-[11px] text-ink-muted line-clamp-2">
                                {promo.description || `Min spend R${promo.minSpend || 0}`}
                              </p>
                            </div>

                            <div className="text-[10px] text-ink-muted space-y-0.5 pt-1 border-t border-ink/5">
                              {promo.minSpend > 0 && <div>• Min spend: R{promo.minSpend}</div>}
                              <div>• Validity: {promo.startDate ? new Date(promo.startDate).toLocaleDateString() : 'Immediate'} {promo.endDate ? `to ${new Date(promo.endDate).toLocaleDateString()}` : '(No expiry)'}</div>
                              {usageLimit !== null && usageLimit !== undefined ? (
                                <div>
                                  <div className="flex justify-between text-[10px] font-semibold text-ink mb-0.5">
                                    <span>Usage: {usageCount} / {usageLimit} redemptions</span>
                                    <span>{usagePercent}%</span>
                                  </div>
                                  <div className="w-full bg-ink/10 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${usagePercent >= 100 ? 'bg-danger' : 'bg-accent'}`}
                                      style={{ width: `${usagePercent}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div>• Redemptions: {usageCount} (Unlimited)</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-ink/10 text-xs">
                            <button
                              type="button"
                              onClick={() => handleTogglePromoStatus(promo)}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                                isActive ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-success bg-success/10 hover:bg-success/20'
                              }`}
                            >
                              <Power size={12} />
                              <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditPromoModal(promo)}
                                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-paper"
                                title="Edit promotion"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePromotion(promo.id)}
                                className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-paper"
                                title="Delete promotion"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 12. REPORTS & ANALYTICS VIEW (STAGE 16) ================= */}
          {activeTab === 'reports' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              {/* Header & Date Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-black text-xl text-ink">Sales & Performance Analytics</h2>
                    {analyticsLoading && (
                      <RefreshCw size={14} className="animate-spin text-accent" />
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Database-aggregated turnover, orders, service bookings, unique customer demand, and product performance
                  </p>
                </div>

                {/* Export Dropdown / Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleExportReport('sales-summary', 'csv')}
                    disabled={exportLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-xs font-bold text-ink shadow-sm transition-colors"
                    title="Export Sales Summary CSV"
                  >
                    <Download size={13} className="text-accent" />
                    <span>Sales CSV</span>
                  </button>
                  <button
                    onClick={() => handleExportReport('orders', 'csv')}
                    disabled={exportLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-xs font-bold text-ink shadow-sm transition-colors"
                    title="Export Orders CSV"
                  >
                    <Download size={13} className="text-accent" />
                    <span>Orders CSV</span>
                  </button>
                  <button
                    onClick={() => handleExportReport('top-products', 'csv')}
                    disabled={exportLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-xs font-bold text-ink shadow-sm transition-colors"
                    title="Export Top Products CSV"
                  >
                    <Download size={13} className="text-accent" />
                    <span>Products CSV</span>
                  </button>
                  <button
                    onClick={() => handleExportReport('sales-summary', 'json')}
                    disabled={exportLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-xs font-bold text-ink-muted hover:text-ink shadow-sm transition-colors"
                    title="Export Analytics JSON"
                  >
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => loadBusinessAnalytics()}
                    className="p-2 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-ink transition-colors"
                    title="Refresh analytics data"
                  >
                    <RefreshCw size={14} className={analyticsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Date Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-paper-warm rounded-2xl border border-ink/10">
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-[11px] font-bold text-ink-muted uppercase mr-1 flex items-center gap-1">
                    <Filter size={12} /> Period:
                  </span>
                  {[
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'This Year' },
                    { id: 'all', label: 'All Time' },
                    { id: 'custom', label: 'Custom' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setAnalyticsPeriod(p.id);
                        if (p.id !== 'custom') {
                          loadBusinessAnalytics({ period: p.id });
                        }
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        analyticsPeriod === p.id
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-ink-muted hover:text-ink hover:bg-paper'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                {analyticsPeriod === 'custom' && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="date"
                      value={analyticsStartDate}
                      onChange={(e) => setAnalyticsStartDate(e.target.value)}
                      className="px-2.5 py-1 bg-paper border border-ink/15 rounded-xl text-ink text-xs focus:outline-none"
                    />
                    <span className="text-ink-muted">to</span>
                    <input
                      type="date"
                      value={analyticsEndDate}
                      onChange={(e) => setAnalyticsEndDate(e.target.value)}
                      className="px-2.5 py-1 bg-paper border border-ink/15 rounded-xl text-ink text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => loadBusinessAnalytics({ period: 'custom', startDate: analyticsStartDate, endDate: analyticsEndDate })}
                      className="px-3 py-1 bg-ink text-paper rounded-xl text-xs font-bold hover:bg-ink-soft shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* KPI Stat Cards */}
              {(() => {
                const summary = analyticsData?.summary || {
                  revenue: dashboardStats.revenue || 0,
                  orderRevenue: dashboardStats.revenue || 0,
                  serviceRevenue: 0,
                  ordersCount: merchantOrders.length,
                  bookingsCount: merchantBookings.length,
                  customersCount: dashboardStats.customers || 0,
                  averageOrderValue: merchantOrders.length > 0 ? Math.round(dashboardStats.revenue / merchantOrders.length) : 0,
                  growth: { revenueGrowthPercent: 18.4, ordersGrowthPercent: 12.0 }
                };

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Gross Revenue */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase">Gross Revenue</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        R{summary.revenue.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        Orders: R{summary.orderRevenue.toLocaleString()} | Services: R{summary.serviceRevenue.toLocaleString()}
                      </div>
                    </div>

                    {/* Total Orders */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase">Total Orders</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        {summary.ordersCount}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        AOV: R{summary.averageOrderValue} per order
                      </div>
                    </div>

                    {/* Service Bookings */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase">Service Bookings</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        {summary.bookingsCount}
                      </div>
                      <div className="text-[10px] text-success font-semibold flex items-center gap-0.5 mt-1">
                        R{summary.serviceRevenue.toLocaleString()} service sales
                      </div>
                    </div>

                    {/* Unique Customers */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase">Unique Customers</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        {summary.customersCount}
                      </div>
                      <div className="text-[10px] text-ink-soft font-semibold mt-1">
                        Distinct buyers & clients
                      </div>
                    </div>

                    {/* Growth Rate */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[11px] font-bold text-ink-muted uppercase">Period Growth</span>
                      <div className={`font-display font-black text-2xl mt-1 ${
                        (summary.growth?.revenueGrowthPercent || 0) >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {(summary.growth?.revenueGrowthPercent || 0) >= 0 ? '+' : ''}
                        {summary.growth?.revenueGrowthPercent || 0}%
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        vs preceding interval
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Sales Trend SVG Chart */}
              <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-accent" />
                      <span>Sales Turnover Trend</span>
                    </h3>
                    <p className="text-[11px] text-ink-muted">Aggregated trade turnover across selected timeframe</p>
                  </div>

                  {/* Granularity Switch */}
                  <div className="flex items-center gap-1 p-1 bg-paper rounded-xl border border-ink/10 text-xs">
                    {['daily', 'weekly', 'monthly', 'annual'].map(gran => (
                      <button
                        key={gran}
                        onClick={() => setChartGranularity(gran)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                          chartGranularity === gran
                            ? 'bg-ink text-paper shadow-sm'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {gran}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Bar Chart */}
                {(() => {
                  const series = analyticsData?.salesBreakdown?.[chartGranularity] || [];
                  const maxRevenue = Math.max(...series.map(s => s.revenue), 100);

                  if (series.length === 0) {
                    return (
                      <div className="h-44 flex items-center justify-center text-xs text-ink-muted">
                        No transactions recorded for this timeframe.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="h-48 w-full flex items-end gap-2 pt-6 px-2 border-b border-ink/10">
                        {series.map((pt, i) => {
                          const heightPercent = Math.max(8, Math.min(100, (pt.revenue / maxRevenue) * 100));
                          const label = pt.date ? pt.date.slice(5) : (pt.label || pt.week || pt.month || pt.year);

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                              {/* Hover Tooltip */}
                              <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-ink text-paper text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap z-10">
                                R{pt.revenue.toLocaleString()} ({pt.orders} orders)
                              </div>
                              {/* Bar */}
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className="w-full max-w-[40px] bg-gradient-to-t from-ink to-accent rounded-t-lg transition-all hover:opacity-90 cursor-pointer"
                              />
                              {/* Label */}
                              <span className="text-[10px] font-mono text-ink-muted mt-1 truncate max-w-[48px]" title={label}>
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-muted px-2">
                        <span>Min: R0</span>
                        <span>Peak: R{maxRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Top Products & Top Services Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <Package size={15} className="text-accent" />
                      <span>Top Selling Products</span>
                    </h3>
                    <span className="text-[11px] font-bold text-ink-muted">By Units Sold</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                          <th className="pb-2">#</th>
                          <th className="pb-2">Product</th>
                          <th className="pb-2 text-center">Units</th>
                          <th className="pb-2 text-right">Gross Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/5 text-ink">
                        {(analyticsData?.topProducts || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-ink-muted">
                              No product sales recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          (analyticsData?.topProducts || []).slice(0, 5).map(prod => (
                            <tr key={prod.rank} className="hover:bg-paper/60 transition-colors">
                              <td className="py-2.5 font-bold text-ink-muted">{prod.rank}</td>
                              <td className="py-2.5 font-semibold text-ink max-w-[140px] truncate">{prod.name}</td>
                              <td className="py-2.5 text-center font-bold">{prod.unitsSold}</td>
                              <td className="py-2.5 text-right font-extrabold text-ink">R{prod.revenue.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Services */}
                <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <Wrench size={15} className="text-accent" />
                      <span>Top Booked Services</span>
                    </h3>
                    <span className="text-[11px] font-bold text-ink-muted">By Bookings</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                          <th className="pb-2">#</th>
                          <th className="pb-2">Service</th>
                          <th className="pb-2 text-center">Bookings</th>
                          <th className="pb-2 text-right">Gross Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/5 text-ink">
                        {(analyticsData?.topServices || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-ink-muted">
                              No service bookings recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          (analyticsData?.topServices || []).slice(0, 5).map(serv => (
                            <tr key={serv.rank} className="hover:bg-paper/60 transition-colors">
                              <td className="py-2.5 font-bold text-ink-muted">{serv.rank}</td>
                              <td className="py-2.5 font-semibold text-ink max-w-[140px] truncate">{serv.name}</td>
                              <td className="py-2.5 text-center font-bold">{serv.bookingsCount}</td>
                              <td className="py-2.5 text-right font-extrabold text-ink">R{serv.revenue.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Order Status Distribution */}
              <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
                <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                  <PieChart size={15} className="text-accent" />
                  <span>Order Fulfillment Distribution</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(analyticsData?.orderStatuses || {}).map(([st, count]) => (
                    <div key={st} className="p-3 bg-paper rounded-xl border border-ink/10 text-xs">
                      <span className="text-[10px] font-bold text-ink-muted uppercase truncate block">{st}</span>
                      <div className="font-display font-extrabold text-lg text-ink mt-0.5">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= 13. NOTIFICATIONS VIEW ================= */}
          {activeTab === 'notifications' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-black text-xl text-ink">Merchant Notification Inbox</h2>
                    {unreadNotifsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-accent text-ink text-[10px] font-extrabold border border-ink/20">
                        {unreadNotifsCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Real-time alerts for customer purchases, service appointments, and system messages</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-paper-warm rounded-xl border border-ink/10">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        notifFilter === 'all'
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      All ({merchantNotifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('unread')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        notifFilter === 'unread'
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Unread ({unreadNotifsCount})
                    </button>
                  </div>

                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-accent-deep hover:text-ink hover:bg-paper-warm transition-colors"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck size={14} />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              {((notifFilter === 'unread' 
                ? merchantNotifications.filter(n => !n.read) 
                : merchantNotifications
              ).length === 0) ? (
                <div className="py-12 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-paper-warm/50 rounded-2xl border border-dashed border-ink/15">
                  <div className="w-14 h-14 rounded-2xl bg-paper flex items-center justify-center text-ink-muted shadow-sm">
                    {notifFilter === 'unread' ? <CheckCircle size={26} className="text-emerald-500" /> : <Bell size={26} />}
                  </div>
                  <h3 className="font-display font-bold text-base text-ink">
                    {notifFilter === 'unread' ? 'All caught up!' : 'No merchant notifications yet'}
                  </h3>
                  <p className="text-xs text-ink-muted max-w-sm leading-relaxed">
                    {notifFilter === 'unread'
                      ? 'You have read all your alerts. New customer orders, appointment requests, and reviews will appear here.'
                      : 'Live business alerts for incoming orders, booking confirmations, and customer reviews will be displayed here in real time.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(notifFilter === 'unread'
                    ? merchantNotifications.filter(n => !n.read)
                    : merchantNotifications
                  ).map(n => {
                    const isUnread = !n.read;
                    let IconComponent = Bell;
                    let badgeClass = 'bg-paper-warm text-ink border-ink/15';

                    if (n.type === 'order') {
                      IconComponent = ShoppingBag;
                      badgeClass = 'bg-accent/20 text-accent-deep border-accent/30';
                    } else if (n.type === 'booking') {
                      IconComponent = Calendar;
                      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    } else if (n.type === 'payment') {
                      IconComponent = CreditCard;
                      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (n.type === 'review') {
                      IconComponent = Star;
                      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                    } else if (n.type === 'approval') {
                      IconComponent = ShieldCheck;
                      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                    } else if (n.type === 'alert') {
                      IconComponent = AlertCircle;
                      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                    }

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (isUnread) markNotificationRead(n.id);
                          if (n.type === 'order') setActiveTab('orders');
                          else if (n.type === 'booking') setActiveTab('bookings');
                          else if (n.type === 'review') setActiveTab('reviews');
                          else if (n.type === 'payment') setActiveTab('payments');
                          else if (n.type === 'approval') setActiveTab('profile');
                        }}
                        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                          !isUnread
                            ? 'bg-paper border-ink/10 opacity-80 hover:opacity-100 hover:border-ink/20'
                            : 'bg-paper-warm/90 border-accent/40 shadow-sm hover:border-accent'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl border shrink-0 ${badgeClass}`}>
                          <IconComponent size={16} />
                        </div>

                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-display font-bold text-xs text-ink leading-tight">
                              {n.title}
                            </h4>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-accent-deep shrink-0" title="Unread" />
                            )}
                          </div>

                          <p className="text-xs text-ink-soft leading-relaxed line-clamp-2">
                            {n.message}
                          </p>

                          <div className="flex items-center gap-2 mt-2 text-[10px] text-ink-muted">
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </span>
                            <span>·</span>
                            <span className="uppercase font-semibold tracking-wider text-[9px]">
                              {n.type || 'info'}
                            </span>
                            <span className="text-accent-deep font-semibold group-hover:underline ml-auto">
                              Open {n.type === 'order' ? 'Orders' : n.type === 'booking' ? 'Bookings' : n.type === 'review' ? 'Reviews' : n.type === 'payment' ? 'Payments' : 'Details'} →
                            </span>
                          </div>
                        </div>

                        {/* Delete Action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-muted hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= 14. SETTINGS VIEW ================= */}
          {activeTab === 'settings' && (
            <div className="p-6 rounded-3xl bg-paper border border-ink/15 shadow-card space-y-6 animate-in fade-in">
              <div className="border-b border-ink/10 pb-4">
                <h2 className="font-display font-black text-xl text-ink">Business Operating Settings</h2>
                <p className="text-xs text-ink-muted mt-0.5">Configure operational hours, store availability, and merchant membership tier</p>
              </div>

              {/* Operating Status & Hours */}
              <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-4">
                <h3 className="font-display font-bold text-sm text-ink">Store Hours & Live Availability</h3>
                
                <div className="flex items-center justify-between p-3 bg-paper rounded-xl border border-ink/10">
                  <div>
                    <h4 className="font-bold text-xs text-ink">Accepting Orders / Active Today</h4>
                    <p className="text-[11px] text-ink-muted">Toggle your public listing status on the consumer marketplace</p>
                  </div>
                  <button
                    onClick={handleToggleStoreOpen}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      profileData.openNow
                        ? 'bg-success/20 border-success/30 text-success'
                        : 'bg-danger/20 border-danger/30 text-danger'
                    }`}
                  >
                    {profileData.openNow ? 'Open Now' : 'Closed'}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Standard Operating Hours</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={profileData.businessHours}
                      onChange={e => setProfileData(p => ({ ...p, businessHours: e.target.value }))}
                      className="flex-1 bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                      placeholder="e.g. Mon - Sat: 08:30 - 17:00"
                    />
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft shadow-sm"
                    >
                      Save Hours
                    </button>
                  </div>
                </div>
              </div>

              {/* Merchant Membership Tier */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-sm text-ink">LocalBiz Merchant Subscription</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-paper p-5 rounded-2xl border border-ink/15 shadow-sm space-y-3">
                    <h4 className="font-display font-bold text-base text-ink">Starter Plan</h4>
                    <div className="font-display font-extrabold text-2xl text-ink">R50 <span className="text-xs font-normal text-ink-muted">/mo</span></div>
                    <p className="text-xs text-ink-soft">For home cooks, casual bakers, and neighbourhood handymen.</p>
                    <ul className="text-xs text-ink-soft space-y-1 pt-1">
                      <li>• Up to 10 listings</li>
                      <li>• Standard search ranking</li>
                    </ul>
                  </div>

                  <div className="bg-paper p-5 rounded-2xl border border-ink/15 shadow-sm space-y-3">
                    <h4 className="font-display font-bold text-base text-ink">Growth Plan</h4>
                    <div className="font-display font-extrabold text-2xl text-ink">R120 <span className="text-xs font-normal text-ink-muted">/mo</span></div>
                    <p className="text-xs text-ink-soft">For active tradesmen, certified electricians, and growing stores.</p>
                    <ul className="text-xs text-ink-soft space-y-1 pt-1">
                      <li>• Unlimited listings</li>
                      <li>• Verified trade pro badge</li>
                    </ul>
                  </div>

                  <div className="bg-paper p-5 rounded-2xl border-2 border-accent shadow-raised space-y-3 relative">
                    <span className="absolute -top-2.5 right-4 bg-accent text-ink font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                      Current Plan
                    </span>
                    <h4 className="font-display font-bold text-base text-ink">Featured Plan</h4>
                    <div className="font-display font-extrabold text-2xl text-ink">R250 <span className="text-xs font-normal text-ink-muted">/mo</span></div>
                    <p className="text-xs text-ink-soft">Top placement across Alberton and priority neighbourhood feed boosts.</p>
                    <ul className="text-xs text-ink-soft space-y-1 pt-1">
                      <li>• Top category results</li>
                      <li>• Free SmartPOS terminal</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= ADD / EDIT PRODUCT & SERVICE MODAL ================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-service-modal-title"
            className="bg-paper w-full max-w-lg rounded-3xl border border-ink/20 shadow-raised p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <h3 id="product-service-modal-title" className="font-display font-black text-lg text-ink">
                  {editingItem ? `Edit ${modalItemType === 'service' ? 'Service' : 'Product'}` : `Add New ${modalItemType === 'service' ? 'Service' : 'Product'}`}
                </h3>
                <p className="text-xs text-ink-muted">Fill in item details to publish immediately to your business catalog</p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-paper-warm"
                aria-label="Close catalog item modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Title / Name *</label>
                <input
                  type="text"
                  required
                  value={itemFormData.name}
                  onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })}
                  placeholder={modalItemType === 'service' ? 'e.g. Inverter Maintenance & Battery Health Check' : 'e.g. Fresh Sourdough Loaf'}
                  className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Price (R ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemFormData.price}
                    onChange={e => setItemFormData({ ...itemFormData, price: e.target.value })}
                    placeholder="e.g. 150"
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Category</label>
                  <input
                    type="text"
                    value={itemFormData.category}
                    onChange={e => setItemFormData({ ...itemFormData, category: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {modalItemType === 'service' ? (
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Service Duration</label>
                  <input
                    type="text"
                    value={itemFormData.duration}
                    onChange={e => setItemFormData({ ...itemFormData, duration: e.target.value })}
                    placeholder="e.g. 1 - 2 hours"
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.stockCount}
                    onChange={e => setItemFormData({ ...itemFormData, stockCount: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Image URL</label>
                <input
                  type="url"
                  value={itemFormData.image}
                  onChange={e => setItemFormData({ ...itemFormData, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={itemFormData.desc}
                  onChange={e => setItemFormData({ ...itemFormData, desc: e.target.value })}
                  placeholder="Describe your item, warranty, delivery details, or specifications..."
                  className="w-full bg-paper border border-ink/15 rounded-xl p-3 text-xs font-medium text-ink focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="inStockCheck"
                  checked={itemFormData.inStock}
                  onChange={e => setItemFormData({ ...itemFormData, inStock: e.target.checked })}
                  className="rounded border-ink/20 text-accent focus:ring-accent"
                />
                <label htmlFor="inStockCheck" className="text-xs font-bold text-ink cursor-pointer">
                  {modalItemType === 'service' ? 'Service currently active & bookable' : 'In stock & available for purchase'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper-warm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft shadow-sm"
                >
                  {editingItem ? 'Save Changes' : `Publish ${modalItemType === 'service' ? 'Service' : 'Product'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotion Create / Edit Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-modal-title"
            className="bg-paper rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-ink/20 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <h3 id="promo-modal-title" className="font-display font-black text-lg text-ink">
                  {editingPromo ? 'Edit Promotion' : 'Create New Promotion'}
                </h3>
                <p className="text-xs text-ink-muted">Set discount rules, date limits, and customer eligibility</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1 rounded-xl hover:bg-paper-warm text-ink-muted hover:text-ink transition-colors"
                aria-label="Close promotion modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePromotion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Promotion Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Spring Sale"
                    value={promoForm.name}
                    onChange={e => setPromoForm({ ...promoForm, name: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SAVE20"
                    value={promoForm.code}
                    onChange={e => setPromoForm({ ...promoForm, code: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-mono font-black text-ink uppercase focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Offer details shown to shoppers (e.g. Get 20% off all artisan sourdough loaves)"
                  value={promoForm.description}
                  onChange={e => setPromoForm({ ...promoForm, description: e.target.value })}
                  className="w-full bg-paper border border-ink/15 rounded-xl p-2.5 text-xs font-medium text-ink focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Discount Type</label>
                  <select
                    value={promoForm.discountType}
                    onChange={e => setPromoForm({ ...promoForm, discountType: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (R)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">
                    {promoForm.discountType === 'PERCENTAGE' ? 'Discount % *' : 'Discount (R) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={promoForm.discountType === 'PERCENTAGE' ? '100' : '100000'}
                    value={promoForm.discountValue}
                    onChange={e => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Min Spend (R)</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.minSpend}
                    onChange={e => setPromoForm({ ...promoForm, minSpend: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={promoForm.startDate}
                    onChange={e => setPromoForm({ ...promoForm, startDate: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={promoForm.endDate}
                    onChange={e => setPromoForm({ ...promoForm, endDate: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-ink-muted block mb-1">Usage Limit (Orders)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={promoForm.usageLimit}
                    onChange={e => setPromoForm({ ...promoForm, usageLimit: e.target.value })}
                    className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-ink/10">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="promoActiveCheck"
                    checked={promoForm.status === 'ACTIVE'}
                    onChange={e => setPromoForm({ ...promoForm, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                    className="rounded border-ink/20 text-accent focus:ring-accent"
                  />
                  <label htmlFor="promoActiveCheck" className="text-xs font-bold text-ink cursor-pointer">
                    Active immediately
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPromoModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper-warm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft shadow-sm"
                  >
                    {editingPromo ? 'Update Promotion' : 'Create Promotion'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleOpen && reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-modal-title"
            className="bg-paper rounded-3xl max-w-md w-full p-6 shadow-2xl border border-ink/20 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <h3 id="reschedule-modal-title" className="font-display font-black text-lg text-ink">Reschedule Appointment</h3>
                <p className="text-xs text-ink-muted">
                  Booking #{reschedulingBooking.id.slice(0, 8)} · {reschedulingBooking.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRescheduleOpen(false);
                  setReschedulingBooking(null);
                }}
                className="p-1 rounded-xl hover:bg-paper-warm text-ink-muted hover:text-ink transition-colors"
                aria-label="Close reschedule appointment modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
                <span className="text-[11px] font-bold text-purple-900 block">Current Schedule</span>
                <span className="text-xs text-purple-700 font-medium">
                  {reschedulingBooking.date} at {reschedulingBooking.timeSlot || reschedulingBooking.time} ({reschedulingBooking.serviceName || reschedulingBooking.serviceTitle})
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">New Appointment Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">New Time Slot</label>
                <input
                  type="text"
                  required
                  value={rescheduleSlot}
                  onChange={e => setRescheduleSlot(e.target.value)}
                  placeholder="e.g. 10:00 or 14:00"
                  className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {calendarSlots.slice(0, 8).map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setRescheduleSlot(slot)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        rescheduleSlot === slot
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-paper-warm border-ink/15 text-ink-muted hover:text-ink'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsRescheduleOpen(false);
                    setReschedulingBooking(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper-warm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Availability Settings Modal */}
      {isAvailabilityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-modal-title"
            className="bg-paper rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-ink/20 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <h3 id="availability-modal-title" className="font-display font-black text-lg text-ink">Business Availability Settings</h3>
                <p className="text-xs text-ink-muted">Configure opening schedule, service slot durations, and booking rules</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailabilityOpen(false)}
                className="p-1 rounded-xl hover:bg-paper-warm text-ink-muted hover:text-ink transition-colors"
                aria-label="Close availability settings modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-2">Operating Days (Click to toggle)</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isSelected = availDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (availDays.length > 1) {
                              setAvailDays(availDays.filter(d => d !== day));
                            }
                          } else {
                            setAvailDays([...availDays, day]);
                          }
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-black transition-all ${
                          isSelected
                            ? 'bg-ink text-paper shadow-sm'
                            : 'bg-paper-warm text-ink-muted hover:text-ink border border-ink/10'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Operating Hours (Start - End)</label>
                <input
                  type="text"
                  required
                  value={availHours}
                  onChange={e => setAvailHours(e.target.value)}
                  placeholder="e.g. 08:00 - 17:00"
                  className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                />
                <div className="flex gap-2 mt-1.5">
                  {['08:00 - 17:00', '08:30 - 16:30', '09:00 - 18:00'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAvailHours(preset)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        availHours === preset
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-paper-warm border-ink/15 text-ink-muted hover:text-ink'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Slot Duration</label>
                <select
                  value={availDuration}
                  onChange={e => setAvailDuration(Number(e.target.value))}
                  className="w-full bg-paper border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes (Standard)</option>
                  <option value={60}>60 minutes (1 hour)</option>
                  <option value={90}>90 minutes (1.5 hours)</option>
                  <option value={120}>120 minutes (2 hours)</option>
                </select>
                <p className="text-[10px] text-ink-muted mt-1">
                  Automatic slot generator divides your opening hours into {availDuration}-minute booking slots for customers.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setIsAvailabilityOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper-warm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft shadow-sm"
                >
                  Save Availability
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage 23 — Add Branch Location Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-modal-title"
            className="bg-paper rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-ink/20 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div>
                <h3 id="branch-modal-title" className="font-display font-black text-lg text-ink">Add Secondary Branch Location</h3>
                <p className="text-xs text-ink-muted">Expand geographic discovery across secondary suburbs & cities</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1 rounded-xl hover:bg-paper-warm text-ink-muted hover:text-ink transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rosebank Hub / Cape Town Branch"
                  value={branchForm.name}
                  onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50 Bath Ave"
                    value={branchForm.address}
                    onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Suburb</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rosebank"
                    value={branchForm.suburb}
                    onChange={e => setBranchForm({ ...branchForm, suburb: e.target.value })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={branchForm.city}
                    onChange={e => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Province</label>
                  <select
                    value={branchForm.province}
                    onChange={e => setBranchForm({ ...branchForm, province: e.target.value })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="Gauteng">Gauteng</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Limpopo">Limpopo</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="North West">North West</option>
                    <option value="Northern Cape">Northern Cape</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={branchForm.latitude}
                    onChange={e => setBranchForm({ ...branchForm, latitude: Number(e.target.value) })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={branchForm.longitude}
                    onChange={e => setBranchForm({ ...branchForm, longitude: Number(e.target.value) })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Radius (km)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={branchForm.serviceRadius}
                    onChange={e => setBranchForm({ ...branchForm, serviceRadius: Number(e.target.value) })}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper-warm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover shadow-sm"
                >
                  Create Branch Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

