import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  LayoutDashboard, Users, Store, ShieldCheck, Tag, Package, Wrench, 
  ShoppingBag, Calendar, DollarSign, Star, BarChart3, Bell, FileText, 
  Settings, Search, Plus, Trash2, Edit3, Check, X, AlertTriangle, 
  CheckCircle2, RefreshCw, Send, Lock, Eye, ArrowUpRight, Filter, ChevronRight,
  Download, TrendingUp, PieChart, MapPin, Globe, Sliders
} from 'lucide-react';

export default function AdminHub() {
  const { user, token, switchDemoRole, addToast, refreshData } = useApp();

  // Active module state (15 modules)
  const [activeModule, setActiveModule] = useState('dashboard');

  // Loading & error state
  const [loading, setLoading] = useState(false);

  // Module data states
  const [dashboardData, setDashboardData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [businessesList, setBusinessesList] = useState([]);
  const [approvalsList, setApprovalsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [paymentsData, setPaymentsData] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [notificationsList, setNotificationsList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [settingsData, setSettingsData] = useState(null);
  const [promotionsList, setPromotionsList] = useState([]);

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState('all');

  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('all');

  const [servSearch, setServSearch] = useState('');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');

  const [promoSearch, setPromoSearch] = useState('');
  const [promoStatusFilter, setPromoStatusFilter] = useState('all');

  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');

  // Stage 16 — Analytics & Reports State
  const [adminPeriod, setAdminPeriod] = useState('30d');
  const [adminStartDate, setAdminStartDate] = useState('');
  const [adminEndDate, setAdminEndDate] = useState('');
  const [adminExportLoading, setAdminExportLoading] = useState(false);
  const [adminChartGranularity, setAdminChartGranularity] = useState('monthly');

  // Stage 23 — Admin Geographic Location Management State
  const [locationsList, setLocationsList] = useState([]);
  const [locationTotal, setLocationTotal] = useState(0);
  const [locationPage, setLocationPage] = useState(1);
  const [locationTotalPages, setLocationTotalPages] = useState(1);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationProvinceFilter, setLocationProvinceFilter] = useState('All');
  const [locationConfig, setLocationConfig] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    province: 'Gauteng',
    provinceCode: 'GT',
    municipality: 'City of Ekurhuleni',
    city: 'Alberton',
    suburb: '',
    postalCode: '',
    latitude: -26.2625,
    longitude: 28.1250,
    locationType: 'suburb',
    aliases: ''
  });

  // Modals & form states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', icon: 'Tag', desc: '', active: true });

  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', role: 'all', type: 'info' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Selected details modal for orders/approvals
  const [selectedKycDoc, setSelectedKycDoc] = useState(null);

  // Load module data with reactive filter updates
  useEffect(() => {
    if (user?.role === 'admin') {
      loadModuleData(activeModule);
    }
  }, [
    activeModule, 
    user, 
    userRoleFilter, 
    userStatusFilter, 
    bizStatusFilter, 
    prodCatFilter, 
    orderStatusFilter, 
    bookingStatusFilter, 
    reviewStatusFilter, 
    promoStatusFilter,
    auditEntityFilter
  ]);

  const loadModuleData = async (mod) => {
    setLoading(true);
    try {
      if (mod === 'dashboard') {
        const data = await api.getAdminDashboard(token);
        setDashboardData(data);
      } else if (mod === 'users') {
        const data = await api.getAdminUsers({ search: userSearch, role: userRoleFilter, status: userStatusFilter }, token);
        setUsersList(data);
      } else if (mod === 'businesses') {
        const data = await api.getAdminBusinesses({ search: bizSearch, status: bizStatusFilter }, token);
        setBusinessesList(data);
      } else if (mod === 'approvals') {
        const data = await api.getAdminApprovals(token);
        setApprovalsList(data);
      } else if (mod === 'categories') {
        const data = await api.getAdminCategories(token);
        setCategoriesList(data);
      } else if (mod === 'products') {
        const data = await api.getAdminProducts({ search: prodSearch, category: prodCatFilter, isService: 'false' }, token);
        setProductsList(data);
      } else if (mod === 'services') {
        const data = await api.getAdminServices({ search: servSearch }, token);
        setServicesList(data);
      } else if (mod === 'orders') {
        const data = await api.getAdminOrders({ search: orderSearch, status: orderStatusFilter }, token);
        setOrdersList(data);
      } else if (mod === 'bookings') {
        const data = await api.getAdminBookings({ status: bookingStatusFilter }, token);
        setBookingsList(data);
      } else if (mod === 'payments') {
        const data = await api.getAdminPayments(token);
        setPaymentsData(data);
      } else if (mod === 'reviews') {
        const data = await api.getAdminReviews({ search: reviewSearch, status: reviewStatusFilter }, token);
        setReviewsList(data);
      } else if (mod === 'promotions') {
        const data = await api.getAdminPromotions({ search: promoSearch, status: promoStatusFilter }, token);
        setPromotionsList(data);
      } else if (mod === 'reports') {
        const data = await api.getAdminAnalytics({
          period: adminPeriod,
          startDate: adminStartDate,
          endDate: adminEndDate
        }, token);
        setReportsData(data);
      } else if (mod === 'notifications') {
        const data = await api.getAdminNotifications(token);
        setNotificationsList(data);
      } else if (mod === 'audit-logs') {
        const data = await api.getAdminAuditLogs({ search: auditSearch, entity: auditEntityFilter }, token);
        setAuditLogsList(data);
      } else if (mod === 'settings') {
        const data = await api.getAdminSettings(token);
        setSettingsData(data);
      } else if (mod === 'locations') {
        const [locData, confData] = await Promise.all([
          api.getAdminLocations({ page: locationPage, limit: 15, province: locationProvinceFilter, search: locationSearch }, token),
          api.getAdminLocationConfig(token)
        ]);
        setLocationsList(locData.locations || []);
        setLocationTotal(locData.total || 0);
        setLocationTotalPages(locData.totalPages || 1);
        setLocationConfig(confData);
      }
    } catch (err) {
      console.error('Error loading module data:', err);
      addToast(err.message || 'Failed to load administrative data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await api.updateAdminLocation(editingLocation.id, locationForm, token);
        addToast('Reference location updated successfully', 'success');
      } else {
        await api.createAdminLocation(locationForm, token);
        addToast('Reference location created successfully', 'success');
      }
      setIsLocationModalOpen(false);
      setEditingLocation(null);
      loadModuleData('locations');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this geographic location record?')) return;
    try {
      await api.deleteAdminLocation(id, token);
      addToast('Reference location deleted', 'info');
      loadModuleData('locations');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleUpdateLocationConfig = async (newConfig) => {
    try {
      await api.updateAdminLocationConfig(newConfig, token);
      addToast('Location discovery settings updated', 'success');
      loadModuleData('locations');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAdminExportReport = async (type = 'platform-overview', format = 'csv') => {
    try {
      setAdminExportLoading(true);
      const params = {
        type,
        format,
        period: adminPeriod,
        startDate: adminStartDate,
        endDate: adminEndDate
      };
      const data = await api.exportAdminReport(params, token);

      const mimeType = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
      const content = format === 'json' ? JSON.stringify(data, null, 2) : data;
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `localbiz-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(`Exported platform ${type} report as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    } finally {
      setAdminExportLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedKycDoc) setSelectedKycDoc(null);
        if (isCategoryModalOpen) setIsCategoryModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKycDoc, isCategoryModalOpen]);

  // If user is not admin, show security access restriction card
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-paper rounded-3xl border border-warning/30 shadow-card text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-warning/10 text-warning flex items-center justify-center">
          <Lock size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-extrabold text-2xl text-ink">Super Admin Authorization Required</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            The LocalBiz Super Administrator Console requires authorized credentials with <code>admin</code> role privileges.
            Frontend hiding is strictly disabled; all platform governance endpoints enforce cryptographic JWT authorization.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => switchDemoRole('admin')}
            className="px-6 py-3 rounded-2xl bg-ink text-paper hover:bg-ink-soft font-bold text-sm transition-all shadow-md flex items-center gap-2 mx-auto"
          >
            <ShieldCheck size={18} className="text-accent" />
            <span>Switch Role to Super Admin (Vuyo Admin)</span>
          </button>
        </div>
      </div>
    );
  }

  // 15 Modules Navigation configuration
  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, count: usersList.length || undefined },
    { id: 'businesses', label: 'Businesses', icon: Store, count: businessesList.length || undefined },
    { id: 'approvals', label: 'Business Approval', icon: ShieldCheck, count: approvalsList.filter(a => a.status === 'Pending').length || undefined },
    { id: 'categories', label: 'Categories', icon: Tag, count: categoriesList.length || undefined },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'services', label: 'Services', icon: Wrench },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'reviews', label: 'Reviews', icon: Star, count: reviewsList.filter(r => r.status === 'Flagged').length || undefined },
    { id: 'promotions', label: 'Promotions', icon: Tag, count: promotionsList.length || undefined },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
    { id: 'locations', label: 'Geographic Discovery', icon: MapPin, count: locationTotal || undefined },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // User status toggling (Activate / Deactivate)
  const handleToggleUserStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    try {
      await api.updateAdminUser(targetUser.id, { status: nextStatus }, token);
      addToast(`User ${targetUser.name} is now ${nextStatus}`, 'success');
      loadModuleData('users');
    } catch (err) {
      addToast('Failed to update user status: ' + err.message, 'error');
    }
  };

  // Business Status Update (Approve, Reject, Suspend, Reactivate)
  const handleBusinessStatus = async (bizId, nextStatus) => {
    try {
      await api.updateAdminBusinessStatus(bizId, nextStatus, token);
      addToast(`Business status set to ${nextStatus}`, 'success');
      loadModuleData('businesses');
      loadModuleData('approvals');
      refreshData();
    } catch (err) {
      addToast('Error updating business: ' + err.message, 'error');
    }
  };

  // Approval status update
  const handleApprovalStatus = async (kycId, nextStatus) => {
    try {
      await api.updateKycApproval(kycId, nextStatus, token);
      addToast(`Application marked as ${nextStatus}`, nextStatus === 'Approved' ? 'success' : 'neutral');
      loadModuleData('approvals');
      loadModuleData('businesses');
      refreshData();
    } catch (err) {
      addToast('Error: ' + err.message, 'error');
    }
  };

  // Category CRUD & Activation
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    try {
      if (editingCategory) {
        await api.updateAdminCategory(editingCategory.id, catForm, token);
        addToast(`Category "${catForm.name}" updated`, 'success');
      } else {
        await api.createAdminCategory(catForm, token);
        addToast(`Category "${catForm.name}" created`, 'success');
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCatForm({ name: '', icon: 'Tag', desc: '', active: true });
      loadModuleData('categories');
      refreshData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    try {
      await api.updateAdminCategory(cat.id, { active: !cat.active }, token);
      addToast(`Category "${cat.name}" is now ${!cat.active ? 'active' : 'inactive'}`, 'success');
      loadModuleData('categories');
      refreshData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!confirm(`Delete category "${catName}"?`)) return;
    try {
      await api.deleteAdminCategory(catId, token);
      addToast(`Category "${catName}" deleted`, 'neutral');
      loadModuleData('categories');
      refreshData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Review Moderation (Flag, Approve, Remove)
  const handleFlagReview = async (reviewId) => {
    try {
      await api.flagAdminReview(reviewId, token);
      addToast('Review flagged for content violation', 'neutral');
      loadModuleData('reviews');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await api.updateAdminReviewStatus(reviewId, 'Approved', token);
      addToast('Review approved and cleared', 'success');
      loadModuleData('reviews');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Remove this review permanently from the platform?')) return;
    try {
      await api.deleteAdminReview(reviewId, token);
      addToast('Review removed and merchant rating updated', 'neutral');
      loadModuleData('reviews');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Product removal & stock toggle
  const handleDeleteProduct = async (prodId, prodName) => {
    if (!confirm(`Remove listing "${prodName}" from marketplace?`)) return;
    try {
      await api.deleteAdminProduct(prodId, token);
      addToast(`Listing "${prodName}" removed`, 'neutral');
      loadModuleData(activeModule);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleProductStock = async (prod) => {
    try {
      await api.updateAdminProductStatus(prod.id, { inStock: !prod.inStock }, token);
      addToast(`Listing "${prod.name}" marked ${!prod.inStock ? 'In Stock' : 'Out of Stock'}`, 'success');
      loadModuleData('products');
    } catch (err) {
      addToast('Failed to update stock: ' + err.message, 'error');
    }
  };

  // Order status update
  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      await api.updateAdminOrderStatus(orderId, { status: nextStatus }, token);
      addToast(`Order #${orderId} status set to ${nextStatus}`, 'success');
      loadModuleData('orders');
    } catch (err) {
      addToast('Failed to update order: ' + err.message, 'error');
    }
  };

  // Booking status update
  const handleUpdateBookingStatus = async (bookingId, nextStatus) => {
    try {
      await api.updateAdminBookingStatus(bookingId, { status: nextStatus }, token);
      addToast(`Booking #${bookingId} status set to ${nextStatus}`, 'success');
      loadModuleData('bookings');
    } catch (err) {
      addToast('Failed to update booking: ' + err.message, 'error');
    }
  };

  // Promotion status & deletion moderation
  const handleAdminPromoStatus = async (promoId, status) => {
    try {
      await api.updateAdminPromotionStatus(promoId, status, token);
      addToast(`Promotion status set to ${status}`, 'success');
      loadModuleData('promotions');
      refreshData();
    } catch (err) {
      addToast('Error updating promotion: ' + err.message, 'error');
    }
  };

  const handleAdminDeletePromo = async (promoId) => {
    if (!confirm('Are you sure you want to permanently delete this promotion?')) return;
    try {
      await api.deleteAdminPromotion(promoId, token);
      addToast('Promotion deleted by administrator', 'neutral');
      loadModuleData('promotions');
      refreshData();
    } catch (err) {
      addToast('Error deleting promotion: ' + err.message, 'error');
    }
  };

  // Broadcast System Announcement
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return;
    setIsBroadcasting(true);
    try {
      await api.broadcastAdminNotification(broadcastForm, token);
      addToast('System announcement broadcasted successfully!', 'success');
      setBroadcastForm({ title: '', message: '', role: 'all', type: 'info' });
      loadModuleData('notifications');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Platform Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings(settingsData, token);
      addToast('Platform settings saved and active!', 'success');
      loadModuleData('settings');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Top Header */}
      <div className="bg-paper rounded-3xl border border-ink/15 p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-extrabold text-3xl text-ink">Super Admin Console</h1>
            <span className="bg-ink text-accent text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <ShieldCheck size={12} />
              Platform Master
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Complete governance suite for LocalBiz South Africa · 15 Centralized Modules
          </p>
        </div>

        {/* Administrator profile badge */}
        <div className="flex items-center gap-3 bg-paper-warm px-4 py-2 rounded-2xl border border-ink/10">
          <div className="w-9 h-9 rounded-xl bg-accent text-ink font-display font-extrabold flex items-center justify-center text-sm shadow-sm">
            VA
          </div>
          <div>
            <div className="text-xs font-bold text-ink">{user.name} (Admin)</div>
            <div className="text-[10px] text-ink-muted">{user.email}</div>
          </div>
          <button
            onClick={() => loadModuleData(activeModule)}
            title="Refresh current module"
            className="p-1.5 text-ink-soft hover:text-ink hover:bg-paper rounded-lg transition-colors ml-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Mobile Responsive Module Bar (Visible on mobile/tablets < lg) */}
      <div className="flex lg:hidden overflow-x-auto gap-2 p-1.5 bg-paper rounded-2xl border border-ink/10 no-scrollbar">
        {modules.map(mod => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-ink text-paper shadow-sm' : 'text-ink-soft hover:bg-paper-warm'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-accent' : ''} />
              <span>{mod.label}</span>
              {mod.count !== undefined && mod.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-accent text-ink' : 'bg-ink/10 text-ink'
                }`}>
                  {mod.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main 15-Module Navigation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: 15 Module Links (Desktop >= lg) */}
        <div className="hidden lg:block lg:col-span-3 bg-paper rounded-3xl border border-ink/15 shadow-card p-3 space-y-1">
          <div className="text-[10px] font-extrabold text-ink-muted uppercase tracking-wider px-3 py-2">
            Governance Modules (15)
          </div>
          <div className="space-y-1">
            {modules.map(mod => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-ink text-paper shadow-md scale-[1.01]' 
                      : 'text-ink-soft hover:text-ink hover:bg-paper-warm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isActive ? 'text-accent' : 'text-ink-muted'} />
                    <span>{mod.label}</span>
                  </div>
                  {mod.count !== undefined && mod.count > 0 && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-accent text-ink' : 'bg-ink/10 text-ink'
                    }`}>
                      {mod.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area: Module Views */}
        <div className="lg:col-span-9 space-y-6">
          {/* ================= MODULE 1: DASHBOARD ================= */}
          {activeModule === 'dashboard' && (
            <div className="space-y-6">
              {/* Executive Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-paper p-4 rounded-2xl border border-ink/15 shadow-card">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Total Users</div>
                  <div className="font-display font-extrabold text-2xl text-ink mt-1">
                    {dashboardData?.totalUsers ?? '—'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
                    {dashboardData?.consumers ?? 0} consumers · {dashboardData?.businesses ?? 0} businesses
                  </div>
                </div>

                <div className="bg-paper p-4 rounded-2xl border border-ink/15 shadow-card">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Active Businesses</div>
                  <div className="font-display font-extrabold text-2xl text-ink mt-1">
                    {dashboardData?.activeBusinesses ?? '—'}
                  </div>
                  <div className="text-[11px] text-amber-600 font-bold mt-1">
                    {dashboardData?.pendingBusinesses ?? 0} pending approval
                  </div>
                </div>

                <div className="bg-paper p-4 rounded-2xl border border-ink/15 shadow-card">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Orders & Bookings</div>
                  <div className="font-display font-extrabold text-2xl text-ink mt-1">
                    {(dashboardData?.orders ?? 0) + (dashboardData?.bookings ?? 0)}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
                    {dashboardData?.orders ?? 0} orders · {dashboardData?.bookings ?? 0} bookings
                  </div>
                </div>

                <div className="bg-paper p-4 rounded-2xl border border-ink/15 shadow-card">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Total Revenue (GMV)</div>
                  <div className="font-display font-extrabold text-2xl text-ink mt-1">
                    R{dashboardData?.revenue?.toLocaleString() ?? '0'}
                  </div>
                  <div className="text-[11px] text-success font-bold mt-1">Platform verified</div>
                </div>

                <div className="bg-paper p-4 rounded-2xl border border-ink/15 shadow-card col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Ratings & Trust</div>
                  <div className="font-display font-extrabold text-2xl text-ink mt-1 flex items-center gap-1">
                    <Star size={18} className="fill-accent text-accent-deep" />
                    <span>{dashboardData?.ratingMetrics?.averageRating ? dashboardData.ratingMetrics.averageRating.toFixed(1) : '5.0'}</span>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
                    {dashboardData?.ratingMetrics?.reviewCount ?? 0} reviews ({dashboardData?.ratingMetrics?.flaggedCount ?? 0} flagged)
                  </div>
                </div>
              </div>

              {/* Two Column Grid: Recent Registrations & Recent Orders */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Registrations */}
                <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-ink">Recent Registrations</h3>
                      <p className="text-xs text-ink-muted">Newest platform accounts</p>
                    </div>
                    <button onClick={() => setActiveModule('users')} className="text-xs font-bold text-accent-deep hover:underline">
                      View All →
                    </button>
                  </div>

                  <div className="divide-y divide-ink/10">
                    {dashboardData?.recentRegistrations?.map(u => (
                      <div key={u.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-ink">{u.name}</div>
                          <div className="text-[11px] text-ink-muted">{u.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            u.role === 'business' ? 'bg-amber-100 text-amber-800' :
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {u.role}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {u.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-ink">Recent Orders</h3>
                      <p className="text-xs text-ink-muted">Cross-merchant order activity</p>
                    </div>
                    <button onClick={() => setActiveModule('orders')} className="text-xs font-bold text-accent-deep hover:underline">
                      View Ledger →
                    </button>
                  </div>

                  <div className="divide-y divide-ink/10">
                    {dashboardData?.recentOrders?.map(o => (
                      <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-ink">{o.businessName}</div>
                          <div className="text-[11px] text-ink-muted">Client: {o.customer} · #{o.id.slice(-6)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display font-extrabold text-ink">R{o.total}</div>
                          <span className="text-[10px] text-ink-muted font-bold">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= MODULE 2: USERS ================= */}
          {activeModule === 'users' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">User Management</h2>
                  <p className="text-xs text-ink-muted">Inspect registered accounts, search profiles, filter by role, or suspend access</p>
                </div>
                <div className="text-xs font-bold text-ink-muted">
                  Total Users: {usersList.length}
                </div>
              </div>

              {/* Filters & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadModuleData('users')}
                    placeholder="Search name, email, phone..."
                    className="w-full pl-9 pr-14 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => loadModuleData('users')}
                    className="absolute right-2 px-2 py-1 bg-ink text-paper rounded-lg text-[10px] font-bold"
                  >
                    Go
                  </button>
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                >
                  <option value="all">All Roles (Consumer, Business, Admin)</option>
                  <option value="consumer">Consumers</option>
                  <option value="business">Businesses</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                >
                  <option value="all">All Statuses (Active, Suspended)</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">User Details</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Contact</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-ink-muted">
                          No users found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      usersList.map(u => (
                        <tr key={u.id} className="hover:bg-paper-warm/50 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-ink">{u.name}</div>
                            <div className="text-[11px] text-ink-muted">{u.email}</div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              u.role === 'business' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              u.role === 'admin' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                              'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5 text-ink-soft">
                            {u.phone || '—'}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-sm ${
                                u.status === 'suspended'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-rose-600 text-white hover:bg-rose-700'
                              }`}
                            >
                              {u.status === 'suspended' ? 'Activate' : 'Deactivate'}
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

          {/* ================= MODULE 3: BUSINESSES ================= */}
          {activeModule === 'businesses' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Business Directory</h2>
                  <p className="text-xs text-ink-muted">Full catalog of registered local merchants across all stages</p>
                </div>
                <div className="text-xs font-bold text-ink-muted">
                  Total Merchants: {businessesList.length}
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={bizSearch}
                    onChange={(e) => setBizSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadModuleData('businesses')}
                    placeholder="Search business name, owner, category, suburb..."
                    className="w-full pl-9 pr-14 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                  />
                  <button
                    onClick={() => loadModuleData('businesses')}
                    className="absolute right-2 px-2 py-1 bg-ink text-paper rounded-lg text-[10px] font-bold"
                  >
                    Go
                  </button>
                </div>
                <select
                  value={bizStatusFilter}
                  onChange={(e) => setBizStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                >
                  <option value="all">All Statuses (Pending, Approved, Suspended, Rejected)</option>
                  <option value="Approved">Approved Only</option>
                  <option value="Pending">Pending Approval Only</option>
                  <option value="Suspended">Suspended Only</option>
                  <option value="Rejected">Rejected Only</option>
                </select>
              </div>

              {/* Businesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessesList.map(b => (
                  <div key={b.id} className="p-4 bg-paper-warm rounded-2xl border border-ink/10 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={b.cover} alt={b.name} className="w-12 h-12 rounded-xl object-cover border border-ink/15 shadow-sm" />
                        <div>
                          <div className="font-display font-bold text-sm text-ink">{b.name}</div>
                          <div className="text-[11px] text-ink-muted">{b.category} · {b.suburb}</div>
                          <div className="text-[10px] text-ink-soft">Owner: {b.owner}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        b.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-ink-muted pt-2 border-t border-ink/10">
                      <div>⭐ {b.rating || 5.0} · {b.productCount || 0} items · {b.orderCount || 0} orders</div>
                      <div className="flex items-center gap-1.5">
                        {b.status === 'Suspended' ? (
                          <button
                            onClick={() => handleBusinessStatus(b.id, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBusinessStatus(b.id, 'Suspended')}
                            className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= MODULE 4: BUSINESS APPROVAL ================= */}
          {activeModule === 'approvals' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-ink">Business Approval (KYC Workbench)</h2>
                <p className="text-xs text-ink-muted">
                  Verify merchant identity documents, permits, and trade certifications before authorizing storefronts
                </p>
              </div>

              <div className="space-y-4">
                {approvalsList.length === 0 ? (
                  <div className="p-12 text-center bg-paper-warm rounded-2xl border border-ink/10 space-y-2">
                    <ShieldCheck size={36} className="mx-auto text-success" />
                    <div className="font-bold text-ink">No Pending Applications</div>
                    <div className="text-xs text-ink-muted">All merchant KYC applications have been reviewed.</div>
                  </div>
                ) : (
                  approvalsList.map(app => (
                    <div key={app.id} className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-extrabold text-base text-ink">{app.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Applicant: <strong>{app.owner}</strong> · Category: {app.category} · Suburb: {app.suburb}
                          </p>
                        </div>
                        <span className="text-[11px] text-ink-muted">Applied: {app.appliedDate}</span>
                      </div>

                      {/* Documents Checklist */}
                      <div className="bg-paper p-3 rounded-xl border border-ink/10">
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Verified Documents Submitted:</div>
                        <div className="flex flex-wrap gap-2">
                          {(app.documents || []).map((doc, idx) => (
                            <span 
                              key={idx} 
                              onClick={() => setSelectedKycDoc({ name: app.name, doc })}
                              className="bg-paper-warm border border-ink/10 text-ink text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer hover:border-accent"
                            >
                              <CheckCircle2 size={12} className="text-success" />
                              <span>{doc}</span>
                              <Eye size={11} className="text-ink-muted" />
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 4 Action Buttons: Approve, Reject, Suspend, Reactivate */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApprovalStatus(app.id, 'Approved')}
                          disabled={app.status === 'Approved'}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Check size={14} />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleApprovalStatus(app.id, 'Rejected')}
                          disabled={app.status === 'Rejected'}
                          className="px-4 py-2 rounded-xl border border-rose-600 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={() => handleApprovalStatus(app.id, 'Suspended')}
                          disabled={app.status === 'Suspended'}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          <AlertTriangle size={14} />
                          <span>Suspend</span>
                        </button>

                        <button
                          onClick={() => handleApprovalStatus(app.id, 'Approved')}
                          className="px-4 py-2 rounded-xl border border-ink/20 text-ink hover:bg-paper font-bold text-xs transition-all"
                        >
                          <span>Reactivate</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Document Inspector Modal */}
              {selectedKycDoc && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div 
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="kyc-inspector-title"
                    className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-sm w-full p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div id="kyc-inspector-title" className="font-display font-extrabold text-base text-ink">Document Inspection</div>
                      <button 
                        onClick={() => setSelectedKycDoc(null)} 
                        className="text-ink-muted hover:text-ink"
                        aria-label="Close document inspector"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="p-4 bg-paper-warm rounded-2xl border border-ink/10 space-y-2 text-center">
                      <FileText size={36} className="mx-auto text-accent-deep" />
                      <div className="font-bold text-xs text-ink">{selectedKycDoc.doc}</div>
                      <div className="text-[10px] text-ink-muted">Business: {selectedKycDoc.name}</div>
                      <div className="text-[11px] text-success font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>Cryptographically verified</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedKycDoc(null)}
                      className="btn-base btn-primary btn-md w-full justify-center"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= MODULE 5: CATEGORIES ================= */}
          {activeModule === 'categories' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Category Management</h2>
                  <p className="text-xs text-ink-muted">Add, edit, delete, activate, or deactivate marketplace taxonomy</p>
                </div>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCatForm({ name: '', icon: 'Tag', desc: '', active: true });
                    setIsCategoryModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-ink text-paper hover:bg-ink-soft font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  <Plus size={14} className="text-accent" />
                  <span>Create Category</span>
                </button>
              </div>

              {/* Categories Table */}
              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">Category Name</th>
                      <th className="p-3.5">Icon</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Counts</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {categoriesList.map(cat => (
                      <tr key={cat.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="p-3.5 font-bold text-ink">{cat.name}</td>
                        <td className="p-3.5 font-mono text-ink-muted">{cat.icon}</td>
                        <td className="p-3.5 text-ink-muted max-w-xs truncate">{cat.desc}</td>
                        <td className="p-3.5 text-[11px] text-ink-muted">
                          {cat.merchantsCount || 0} stores · {cat.productsCount || 0} listings
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleCategoryActive(cat)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition-colors ${
                              cat.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {cat.active !== false ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatForm({ name: cat.name, icon: cat.icon || 'Tag', desc: cat.desc || '', active: cat.active !== false });
                              setIsCategoryModalOpen(true);
                            }}
                            className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors"
                            title="Edit Category"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Category Modal */}
              {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div 
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="category-modal-title"
                    className="bg-paper rounded-3xl border border-ink/20 shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <h3 id="category-modal-title" className="font-display font-extrabold text-xl text-ink">
                        {editingCategory ? 'Edit Category' : 'Create Category'}
                      </h3>
                      <button 
                        onClick={() => setIsCategoryModalOpen(false)} 
                        className="text-ink-muted hover:text-ink"
                        aria-label="Close category modal"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCategory} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Name</label>
                        <input
                          type="text"
                          required
                          value={catForm.name}
                          onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                          placeholder="e.g. Traditional Health & Wellness"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Icon Name (Lucide)</label>
                        <input
                          type="text"
                          value={catForm.icon}
                          onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                          placeholder="Tag, Sparkles, Heart, Coffee, Utensils"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={catForm.desc}
                          onChange={(e) => setCatForm({ ...catForm, desc: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                          placeholder="Category summary for consumer browsing"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="catActive"
                          checked={catForm.active}
                          onChange={(e) => setCatForm({ ...catForm, active: e.target.checked })}
                          className="rounded text-accent focus:ring-accent"
                        />
                        <label htmlFor="catActive" className="text-xs font-bold text-ink cursor-pointer">
                          Active (Visible in consumer marketplace)
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper-warm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-ink text-paper font-bold text-xs hover:bg-ink-soft shadow-sm"
                        >
                          Save Category
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= MODULE 6: PRODUCTS ================= */}
          {activeModule === 'products' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Product Catalog Moderation</h2>
                  <p className="text-xs text-ink-muted">Cross-merchant moderation of retail goods and physical products</p>
                </div>
                <div className="text-xs font-bold text-ink-muted">{productsList.length} items</div>
              </div>

              {/* Product search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadModuleData('products')}
                    placeholder="Search product name or merchant..."
                    className="w-full pl-9 pr-14 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                  />
                  <button
                    onClick={() => loadModuleData('products')}
                    className="absolute right-2 px-2 py-1 bg-ink text-paper rounded-lg text-[10px] font-bold"
                  >
                    Go
                  </button>
                </div>
                <select
                  value={prodCatFilter}
                  onChange={(e) => setProdCatFilter(e.target.value)}
                  className="px-3 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5">Merchant</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5">Stock Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {productsList.map(p => (
                      <tr key={p.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <img src={p.image} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-ink/15" />
                          <span className="font-bold text-ink">{p.name}</span>
                        </td>
                        <td className="p-3.5 font-bold text-ink-soft">{p.merchant?.name || 'Local Merchant'}</td>
                        <td className="p-3.5 text-ink-muted">{p.category}</td>
                        <td className="p-3.5 font-extrabold text-ink">R{p.price}</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleProductStock(p)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                          >
                            {p.inStock ? `${p.stockCount} in stock` : 'Out of stock'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg transition-colors"
                            title="Remove Listing"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODULE 7: SERVICES ================= */}
          {activeModule === 'services' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Services Moderation</h2>
                  <p className="text-xs text-ink-muted">Cross-merchant moderation of bookable trades and professional appointments</p>
                </div>
                <div className="text-xs font-bold text-ink-muted">{servicesList.length} services</div>
              </div>

              {/* Service search */}
              <div className="relative max-w-sm flex items-center">
                <Search size={16} className="absolute left-3.5 text-ink-muted" />
                <input
                  type="text"
                  value={servSearch}
                  onChange={(e) => setServSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadModuleData('services')}
                  placeholder="Search service title..."
                  className="w-full pl-9 pr-14 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                />
                <button
                  onClick={() => loadModuleData('services')}
                  className="absolute right-2 px-2 py-1 bg-ink text-paper rounded-lg text-[10px] font-bold"
                >
                  Go
                </button>
              </div>

              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">Service Title</th>
                      <th className="p-3.5">Provider / Merchant</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Duration</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {servicesList.map(s => (
                      <tr key={s.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <img src={s.image} alt={s.name} className="w-9 h-9 rounded-lg object-cover border border-ink/15" />
                          <span className="font-bold text-ink">{s.name}</span>
                        </td>
                        <td className="p-3.5 font-bold text-ink-soft">{s.merchant?.name || 'Pro'}</td>
                        <td className="p-3.5 text-ink-muted">{s.category}</td>
                        <td className="p-3.5 text-ink-muted">{s.duration || '60 mins'}</td>
                        <td className="p-3.5 font-extrabold text-ink">R{s.price}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteProduct(s.id, s.name)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg transition-colors"
                            title="Remove Service"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODULE 8: ORDERS ================= */}
          {activeModule === 'orders' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Platform Orders Ledger</h2>
                  <p className="text-xs text-ink-muted">Transaction audit and fulfillment monitoring across all storefronts</p>
                </div>
                <div className="text-xs font-bold text-ink-muted">{ordersList.length} orders</div>
              </div>

              {/* Order filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadModuleData('orders')}
                    placeholder="Search Order ID, customer, business..."
                    className="w-full pl-9 pr-14 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                  />
                  <button
                    onClick={() => loadModuleData('orders')}
                    className="absolute right-2 px-2 py-1 bg-ink text-paper rounded-lg text-[10px] font-bold"
                  >
                    Go
                  </button>
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                >
                  <option value="all">All Order Statuses</option>
                  <option value="Placed">Placed</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Out for delivery">Out for delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Merchant</th>
                      <th className="p-3.5">Total</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {ordersList.map(o => (
                      <tr key={o.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-ink">{o.id}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-ink">{o.customer}</div>
                          <div className="text-[10px] text-ink-muted">{o.phone}</div>
                        </td>
                        <td className="p-3.5 font-bold text-ink-soft">{o.businessName}</td>
                        <td className="p-3.5 font-extrabold text-ink">R{o.total}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.paymentStatus} · {o.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            className="px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-ink/10 text-ink focus:outline-none"
                          >
                            <option value="Placed">Placed</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Out for delivery">Out for delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODULE 9: BOOKINGS ================= */}
          {activeModule === 'bookings' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Bookings & Appointments Ledger</h2>
                  <p className="text-xs text-ink-muted">Cross-merchant schedule and appointment ledger</p>
                </div>
                <div className="text-xs font-bold text-ink-muted">{bookingsList.length} bookings</div>
              </div>

              <div className="max-w-xs">
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                >
                  <option value="all">All Booking Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">Date & Slot</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Service</th>
                      <th className="p-3.5">Fee</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {bookingsList.map(b => (
                      <tr key={b.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-ink">{b.date}</div>
                          <div className="text-[10px] text-ink-muted">{b.timeSlot}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-ink">{b.customerName}</div>
                          <div className="text-[10px] text-ink-muted">{b.phone}</div>
                        </td>
                        <td className="p-3.5 font-bold text-ink-soft">{b.serviceName}</td>
                        <td className="p-3.5 font-extrabold text-ink">R{b.servicePrice}</td>
                        <td className="p-3.5">
                          <select
                            value={b.status}
                            onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase focus:outline-none ${
                              b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                              b.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODULE 10: PAYMENTS ================= */}
          {activeModule === 'payments' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-ink">Platform Payments & Financials</h2>
                <p className="text-xs text-ink-muted">Escrow settlement, GMV monitoring, and platform commission breakdown</p>
              </div>

              {/* Financial KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-paper-warm p-4 rounded-2xl border border-ink/10">
                  <div className="text-[10px] font-bold text-ink-muted uppercase">Gross Merchandise Value</div>
                  <div className="font-display font-extrabold text-xl text-ink mt-1">
                    R{paymentsData?.totalGmv?.toLocaleString() || '0'}
                  </div>
                </div>

                <div className="bg-paper-warm p-4 rounded-2xl border border-ink/10">
                  <div className="text-[10px] font-bold text-ink-muted uppercase">Paid / Settled Volume</div>
                  <div className="font-display font-extrabold text-xl text-emerald-700 mt-1">
                    R{paymentsData?.paidGmv?.toLocaleString() || '0'}
                  </div>
                </div>

                <div className="bg-paper-warm p-4 rounded-2xl border border-ink/10">
                  <div className="text-[10px] font-bold text-ink-muted uppercase">Pending Escrow</div>
                  <div className="font-display font-extrabold text-xl text-amber-700 mt-1">
                    R{paymentsData?.pendingGmv?.toLocaleString() || '0'}
                  </div>
                </div>

                <div className="bg-paper-warm p-4 rounded-2xl border border-ink/10">
                  <div className="text-[10px] font-bold text-ink-muted uppercase">
                    Est. Take-Rate ({paymentsData?.commissionRate || 5}%)
                  </div>
                  <div className="font-display font-extrabold text-xl text-ink mt-1">
                    R{paymentsData?.estimatedCommission?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">Tx ID</th>
                      <th className="p-3.5">Merchant</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">Fee (5%)</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {(paymentsData?.transactions || []).map(tx => (
                      <tr key={tx.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="p-3.5 font-mono text-ink-muted">{tx.id}</td>
                        <td className="p-3.5 font-bold text-ink">{tx.merchantName}</td>
                        <td className="p-3.5 text-ink-muted">{tx.customer}</td>
                        <td className="p-3.5 font-extrabold text-ink">R{tx.amount}</td>
                        <td className="p-3.5 font-bold text-emerald-700">R{tx.commissionFee}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tx.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODULE 11: REVIEWS ================= */}
          {activeModule === 'reviews' && (() => {
            const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            reviewsList.forEach(r => {
              const star = Math.min(Math.max(Math.round(r.rating || 5), 1), 5);
              starCounts[star] = (starCounts[star] || 0) + 1;
            });
            const totalReviews = reviewsList.length;
            const avgRating = totalReviews > 0
              ? (reviewsList.reduce((sum, r) => sum + (r.rating || 5), 0) / totalReviews).toFixed(1)
              : '5.0';

            return (
              <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-extrabold text-2xl text-ink">Review Moderation</h2>
                    <p className="text-xs text-ink-muted">View, flag inappropriate content, or remove customer feedback</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center text-accent">
                      <Star size={18} className="fill-accent text-accent" />
                      <span className="font-display font-extrabold text-xl text-ink ml-1.5">{avgRating}</span>
                    </div>
                    <span className="text-xs font-bold text-ink-muted">({totalReviews} reviews)</span>
                  </div>
                </div>

                {/* Rating Distribution Analytics */}
                <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10 space-y-2 max-w-md">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                    Platform Star Distribution
                  </span>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = starCounts[star] || 0;
                    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
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

                <div className="divide-y divide-ink/10">
                  {reviewsList.map(r => (
                    <div key={r.id} className="py-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-ink text-sm">{r.userName}</span>
                            <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}</span>
                            {r.orderId && (
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                Order #{r.orderId.slice(-6)}
                              </span>
                            )}
                            {r.bookingId && (
                              <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                                Booking #{r.bookingId.slice(-6)}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'Flagged' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-ink-muted">Store: {r.merchant?.name || 'Local Seller'}</div>
                        </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {r.status === 'Flagged' ? (
                          <button
                            onClick={() => handleApproveReview(r.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <Check size={12} />
                            <span>Approve</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFlagReview(r.id)}
                            className="px-2.5 py-1 rounded-lg border border-amber-600 text-amber-700 hover:bg-amber-50 font-bold text-[11px] flex items-center gap-1"
                          >
                            <AlertTriangle size={12} />
                            <span>Flag</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-ink-soft bg-paper-warm p-3 rounded-xl border border-ink/5">
                      "{r.comment}"
                    </p>

                    {r.reply && (
                      <div className="text-[11px] text-ink-muted pl-4 border-l-2 border-accent">
                        <strong>Merchant response:</strong> {r.reply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

          {/* ================= MODULE 12: PLATFORM ANALYTICS & REPORTS (STAGE 16) ================= */}
          {activeModule === 'reports' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              {/* Header & Export Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-extrabold text-2xl text-ink">Platform Analytics & Reporting</h2>
                    {loading && <RefreshCw size={14} className="animate-spin text-accent" />}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Platform-wide gross merchandise value (GMV), order volume, user growth, merchant performance, and product sales
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleAdminExportReport('platform-overview', 'csv')}
                    disabled={adminExportLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-xs font-bold text-ink shadow-sm transition-colors"
                    title="Export Platform Overview CSV"
                  >
                    <Download size={13} className="text-accent" />
                    <span>Overview CSV</span>
                  </button>
                  <button
                    onClick={() => handleAdminExportReport('businesses', 'csv')}
                    disabled={adminExportLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-xs font-bold text-ink shadow-sm transition-colors"
                    title="Export Merchants Performance CSV"
                  >
                    <Download size={13} className="text-accent" />
                    <span>Merchants CSV</span>
                  </button>
                  <button
                    onClick={() => handleAdminExportReport('platform-overview', 'json')}
                    disabled={adminExportLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-xs font-bold text-ink-muted hover:text-ink shadow-sm transition-colors"
                    title="Export Platform JSON"
                  >
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => loadModuleData('reports')}
                    className="p-2 rounded-xl border border-ink/15 bg-paper-warm hover:bg-paper text-ink transition-colors"
                    title="Refresh analytics data"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
                        setAdminPeriod(p.id);
                        if (p.id !== 'custom') {
                          // Trigger load with updated period
                          api.getAdminAnalytics({ period: p.id }, token).then(data => setReportsData(data)).catch(() => {});
                        }
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        adminPeriod === p.id
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-ink-muted hover:text-ink hover:bg-paper'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                {adminPeriod === 'custom' && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="date"
                      value={adminStartDate}
                      onChange={(e) => setAdminStartDate(e.target.value)}
                      className="px-2.5 py-1 bg-paper border border-ink/15 rounded-xl text-ink text-xs focus:outline-none"
                    />
                    <span className="text-ink-muted">to</span>
                    <input
                      type="date"
                      value={adminEndDate}
                      onChange={(e) => setAdminEndDate(e.target.value)}
                      className="px-2.5 py-1 bg-paper border border-ink/15 rounded-xl text-ink text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        api.getAdminAnalytics({ period: 'custom', startDate: adminStartDate, endDate: adminEndDate }, token)
                          .then(data => setReportsData(data))
                          .catch(() => {});
                      }}
                      className="px-3 py-1 bg-ink text-paper rounded-xl text-xs font-bold hover:bg-ink-soft shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Platform KPI Summary Cards */}
              {(() => {
                const summary = reportsData?.summary || {
                  totalRevenue: reportsData?.totalGmv || 0,
                  totalOrders: reportsData?.totalOrders || 0,
                  totalBookings: reportsData?.totalBookings || 0,
                  totalUsers: reportsData?.totalUsers || 0,
                  totalBusinesses: reportsData?.totalMerchants || 0,
                  averageOrderValue: reportsData?.avgOrderValue || 0,
                  growth: { revenueGrowthPercent: 18.4, ordersGrowthPercent: 12.0 }
                };

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Platform GMV */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[10px] font-bold text-ink-muted uppercase">Platform GMV</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        R{summary.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        Gross merchandise value
                      </div>
                    </div>

                    {/* Platform Orders */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[10px] font-bold text-ink-muted uppercase">Total Orders</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        {summary.totalOrders}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        AOV: R{summary.averageOrderValue}
                      </div>
                    </div>

                    {/* Platform Bookings */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[10px] font-bold text-ink-muted uppercase">Total Bookings</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        {summary.totalBookings}
                      </div>
                      <div className="text-[10px] text-success font-semibold mt-1">
                        Appointments made
                      </div>
                    </div>

                    {/* Platform Users */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[10px] font-bold text-ink-muted uppercase">Total Users</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        {summary.totalUsers}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        Active platform accounts
                      </div>
                    </div>

                    {/* Total Businesses */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[10px] font-bold text-ink-muted uppercase">Businesses</span>
                      <div className="font-display font-black text-2xl text-ink mt-1">
                        {summary.totalBusinesses}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        Local merchants
                      </div>
                    </div>

                    {/* Platform Growth */}
                    <div className="p-4 rounded-2xl bg-paper-warm border border-ink/10">
                      <span className="text-[10px] font-bold text-ink-muted uppercase">Revenue Growth</span>
                      <div className={`font-display font-black text-2xl mt-1 ${
                        (reportsData?.growth?.revenueGrowthPercent || 0) >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {(reportsData?.growth?.revenueGrowthPercent || 0) >= 0 ? '+' : ''}
                        {reportsData?.growth?.revenueGrowthPercent || 0}%
                      </div>
                      <div className="text-[10px] text-ink-muted mt-1">
                        Period vs previous
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Platform Revenue Trend SVG Chart */}
              <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-accent" />
                      <span>Platform GMV Trend</span>
                    </h3>
                    <p className="text-[11px] text-ink-muted">Historical platform sales volume across selected interval</p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-paper rounded-xl border border-ink/10 text-xs">
                    {['daily', 'weekly', 'monthly', 'annual'].map(gran => (
                      <button
                        key={gran}
                        onClick={() => setAdminChartGranularity(gran)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                          adminChartGranularity === gran
                            ? 'bg-ink text-paper shadow-sm'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {gran}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const series = reportsData?.salesBreakdown?.[adminChartGranularity] || reportsData?.monthlyBreakdown || [];
                  const maxRevenue = Math.max(...series.map(s => s.revenue || s.sales || 0), 100);

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
                          const val = pt.revenue !== undefined ? pt.revenue : (pt.sales || 0);
                          const heightPercent = Math.max(8, Math.min(100, (val / maxRevenue) * 100));
                          const label = pt.date ? pt.date.slice(5) : (pt.label || pt.week || pt.month || pt.year);

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                              <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-ink text-paper text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap z-10">
                                R{val.toLocaleString()} ({pt.orders || 0} orders)
                              </div>
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className="w-full max-w-[40px] bg-gradient-to-t from-ink to-accent rounded-t-lg transition-all hover:opacity-90 cursor-pointer"
                              />
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

              {/* Top Merchants & Top Products Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performing Businesses */}
                <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <Store size={15} className="text-accent" />
                      <span>Top Performing Businesses</span>
                    </h3>
                    <span className="text-[11px] font-bold text-ink-muted">By GMV</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                          <th className="pb-2">#</th>
                          <th className="pb-2">Storefront</th>
                          <th className="pb-2">Category</th>
                          <th className="pb-2 text-center">Orders</th>
                          <th className="pb-2 text-right">Gross GMV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/5 text-ink">
                        {(reportsData?.topBusinesses || reportsData?.topMerchants || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-ink-muted">
                              No merchant trade records found.
                            </td>
                          </tr>
                        ) : (
                          (reportsData?.topBusinesses || reportsData?.topMerchants || []).map((m, idx) => (
                            <tr key={m.id || idx} className="hover:bg-paper/60 transition-colors">
                              <td className="py-2.5 font-bold text-ink-muted">{m.rank || idx + 1}</td>
                              <td className="py-2.5 font-semibold text-ink max-w-[140px] truncate">{m.name}</td>
                              <td className="py-2.5 text-ink-muted">{m.category || 'Retail'}</td>
                              <td className="py-2.5 text-center font-bold">{m.orderCount}</td>
                              <td className="py-2.5 text-right font-extrabold text-ink">R{m.totalRevenue?.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Products Platform-Wide */}
                <div className="p-5 rounded-2xl bg-paper-warm border border-ink/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                      <Package size={15} className="text-accent" />
                      <span>Top Selling Products (Platform)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-ink-muted">By Units</span>
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
                        {(reportsData?.topProducts || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-ink-muted">
                              No product sales recorded in this timeframe.
                            </td>
                          </tr>
                        ) : (
                          (reportsData?.topProducts || []).slice(0, 5).map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-paper/60 transition-colors">
                              <td className="py-2.5 font-bold text-ink-muted">{p.rank || idx + 1}</td>
                              <td className="py-2.5 font-semibold text-ink max-w-[150px] truncate">{p.name}</td>
                              <td className="py-2.5 text-center font-bold">{p.unitsSold}</td>
                              <td className="py-2.5 text-right font-extrabold text-ink">R{p.revenue?.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Distributions & User Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Orders by Status */}
                <div className="p-4 bg-paper-warm rounded-2xl border border-ink/10 space-y-3">
                  <div className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                    <PieChart size={15} className="text-accent" />
                    <span>Orders by Status</span>
                  </div>
                  <div className="space-y-2">
                    {reportsData && Object.entries(reportsData.ordersByStatus || {}).map(([st, count]) => (
                      <div key={st} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{st}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-ink/10 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-accent h-full rounded-full" 
                            style={{ width: `${Math.min(100, ((count || 0) / (reportsData.totalOrders || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users by Role */}
                <div className="p-4 bg-paper-warm rounded-2xl border border-ink/10 space-y-3">
                  <div className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                    <Users size={15} className="text-accent" />
                    <span>Platform Users</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-paper rounded-xl border border-ink/10 text-xs">
                      <span>Consumers</span>
                      <span className="font-display font-extrabold text-base text-ink">{reportsData?.usersByRole?.consumer || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-paper rounded-xl border border-ink/10 text-xs">
                      <span>Businesses (Merchants)</span>
                      <span className="font-display font-extrabold text-base text-ink">{reportsData?.usersByRole?.business || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-paper rounded-xl border border-ink/10 text-xs">
                      <span>Platform Administrators</span>
                      <span className="font-display font-extrabold text-base text-ink">{reportsData?.usersByRole?.admin || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Businesses by Category */}
                <div className="p-4 bg-paper-warm rounded-2xl border border-ink/10 space-y-3">
                  <div className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                    <Tag size={15} className="text-accent" />
                    <span>Businesses by Category</span>
                  </div>
                  <div className="space-y-2">
                    {reportsData && Object.entries(reportsData.businessesByCategory || reportsData.merchantsByCategory || {}).map(([cat, count]) => (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{cat}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-ink/10 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-ink h-full rounded-full" 
                            style={{ width: `${Math.min(100, ((count || 0) / (reportsData.totalMerchants || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= MODULE 13: NOTIFICATIONS ================= */}
          {activeModule === 'notifications' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-ink">System Notifications & Broadcasts</h2>
                <p className="text-xs text-ink-muted">Send push notifications to all users, consumers, or businesses</p>
              </div>

              {/* Broadcast Creator Form */}
              <form onSubmit={handleSendBroadcast} className="p-5 bg-paper-warm rounded-2xl border border-ink/10 space-y-4">
                <div className="font-display font-bold text-sm text-ink flex items-center gap-2">
                  <Send size={16} className="text-accent" />
                  <span>Send Real-Time System Announcement</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Target Audience</label>
                    <select
                      value={broadcastForm.role}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-paper border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                    >
                      <option value="all">Entire Community (All Users)</option>
                      <option value="consumer">Consumers Only</option>
                      <option value="business">Business Merchants Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Notification Title</label>
                    <input
                      type="text"
                      required
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-paper border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                      placeholder="e.g. Alberton Festive Market Extended Hours"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Message Content</label>
                  <textarea
                    rows={2}
                    required
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-paper border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                    placeholder="Broadcast details delivered to user in-app notification inboxes"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    className="px-5 py-2.5 rounded-xl bg-ink text-paper font-bold text-xs hover:bg-ink-soft disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <Send size={14} className="text-accent" />
                    <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast Announcement'}</span>
                  </button>
                </div>
              </form>

              {/* Feed of Recent Notifications */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Recent System Alerts Sent</div>
                <div className="divide-y divide-ink/10 border border-ink/10 rounded-2xl overflow-hidden bg-paper">
                  {notificationsList.map(n => (
                    <div key={n.id} className="p-3.5 text-xs flex items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-ink">{n.title}</div>
                        <div className="text-[11px] text-ink-muted mt-0.5">{n.message}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-ink/10 text-ink whitespace-nowrap">
                        To: {n.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= PROMOTIONS MONITORING ================= */}
          {activeModule === 'promotions' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Platform Promotions & Discounts</h2>
                  <p className="text-xs text-ink-muted">
                    Monitor merchant coupon codes, discount rates, expiration timelines, and consumer redemptions
                  </p>
                </div>
                <button
                  onClick={() => loadModuleData('promotions')}
                  className="px-3.5 py-2 rounded-xl bg-paper-warm border border-ink/15 text-xs font-bold text-ink hover:bg-paper flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-paper-warm p-4 rounded-2xl border border-ink/10">
                  <div className="text-[11px] font-bold text-ink-muted uppercase">Total Campaigns</div>
                  <div className="text-2xl font-black text-ink mt-1">{promotionsList.length}</div>
                </div>
                <div className="bg-paper-warm p-4 rounded-2xl border border-ink/10">
                  <div className="text-[11px] font-bold text-ink-muted uppercase">Active Deals</div>
                  <div className="text-2xl font-black text-success mt-1">
                    {promotionsList.filter(p => (p.status === 'ACTIVE' || p.active) && p.status !== 'EXPIRED').length}
                  </div>
                </div>
                <div className="bg-paper-warm p-4 rounded-2xl border border-ink/10">
                  <div className="text-[11px] font-bold text-ink-muted uppercase">Total Redemptions</div>
                  <div className="text-2xl font-black text-accent mt-1">
                    {promotionsList.reduce((sum, p) => sum + (p.usageCount || 0), 0)}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="Search by coupon code, promotion name, or description..."
                    value={promoSearch}
                    onChange={e => setPromoSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadModuleData('promotions')}
                    className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={promoStatusFilter}
                    onChange={e => setPromoStatusFilter(e.target.value)}
                    className="bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="all">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                  <button
                    onClick={() => loadModuleData('promotions')}
                    className="px-3 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:bg-ink-soft shadow-sm"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Promotions Table */}
              <div className="border border-ink/10 rounded-2xl overflow-hidden bg-paper">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper-warm border-b border-ink/10 text-[10px] font-black uppercase text-ink-muted tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Coupon Code</th>
                        <th className="py-3 px-4">Merchant</th>
                        <th className="py-3 px-4">Discount</th>
                        <th className="py-3 px-4">Min Spend</th>
                        <th className="py-3 px-4">Redemptions</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {promotionsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-ink-muted">
                            No promotions found matching current criteria.
                          </td>
                        </tr>
                      ) : (
                        promotionsList.map(promo => {
                          const isActive = (promo.status === 'ACTIVE' || promo.active) && promo.status !== 'EXPIRED';
                          const isExpired = promo.status === 'EXPIRED' || (promo.endDate && new Date(promo.endDate) < new Date());

                          return (
                            <tr key={promo.id} className="hover:bg-paper-warm/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-xs bg-accent/30 text-ink px-2 py-0.5 rounded-md">
                                    {promo.code}
                                  </span>
                                  <div className="text-ink font-bold">{promo.name || promo.code}</div>
                                </div>
                                {promo.description && (
                                  <div className="text-[10px] text-ink-muted line-clamp-1 mt-0.5">{promo.description}</div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-ink">{promo.merchant?.name || promo.merchantId}</div>
                                <div className="text-[10px] text-ink-muted">{promo.merchant?.suburb || 'Local'}</div>
                              </td>
                              <td className="py-3 px-4 font-bold text-ink">
                                {promo.discountType === 'FIXED' ? `R${promo.discountValue}` : `${promo.discountValue || promo.discountPercent}%`}
                              </td>
                              <td className="py-3 px-4 text-ink-muted">
                                {promo.minSpend > 0 ? `R${promo.minSpend}` : 'None'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-ink font-semibold">
                                  {promo.usageCount || 0} / {promo.usageLimit ? promo.usageLimit : '∞'}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isExpired ? 'bg-danger/20 text-danger' :
                                  isActive ? 'bg-success/20 text-success' : 'bg-ink/10 text-ink-muted'
                                }`}>
                                  {isExpired ? 'Expired' : isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleAdminPromoStatus(promo.id, isActive ? 'INACTIVE' : 'ACTIVE')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                      isActive ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-success/15 text-success hover:bg-success/25'
                                    }`}
                                  >
                                    {isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => handleAdminDeletePromo(promo.id)}
                                    className="p-1 rounded-lg text-ink-muted hover:text-danger hover:bg-paper-warm"
                                    title="Delete Promotion"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
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

          {/* ================= MODULE 14: AUDIT LOGS ================= */}
          {activeModule === 'audit-logs' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink">Governance & Audit Trail</h2>
                  <p className="text-xs text-ink-muted">
                    Immutable security log recording administrator, action, entity, entity ID, and timestamp
                  </p>
                </div>
                <div className="text-xs font-bold text-ink-muted">{auditLogsList.length} records</div>
              </div>

              {/* Audit Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadModuleData('audit-logs')}
                    placeholder="Search actions, administrator, details..."
                    className="w-full pl-9 pr-14 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                  />
                  <button
                    onClick={() => loadModuleData('audit-logs')}
                    className="absolute right-2 px-2 py-1 bg-ink text-paper rounded-lg text-[10px] font-bold"
                  >
                    Go
                  </button>
                </div>

                <select
                  value={auditEntityFilter}
                  onChange={(e) => setAuditEntityFilter(e.target.value)}
                  className="px-3 py-2 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                >
                  <option value="all">All Entities (User, Merchant, Category, Review, Setting)</option>
                  <option value="User">User</option>
                  <option value="Merchant">Merchant</option>
                  <option value="KycApproval">KycApproval</option>
                  <option value="Category">Category</option>
                  <option value="Review">Review</option>
                  <option value="Setting">Setting</option>
                  <option value="Notification">Notification</option>
                </select>
              </div>

              {/* Audit Table */}
              <div className="overflow-x-auto border border-ink/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-paper-warm border-b border-ink/10 text-ink-muted font-bold uppercase text-[10px]">
                      <th className="p-3.5">Administrator</th>
                      <th className="p-3.5">Action</th>
                      <th className="p-3.5">Entity</th>
                      <th className="p-3.5">Entity ID</th>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 text-ink">
                    {auditLogsList.map(log => (
                      <tr key={log.id} className="hover:bg-paper-warm/50 transition-colors">
                        <td className="p-3.5 font-bold text-ink">
                          {log.administrator || 'Super Admin'}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-ink text-paper">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-ink-soft">{log.entity || 'Platform'}</td>
                        <td className="p-3.5 font-mono text-[11px] text-ink-muted">{log.entityId || '—'}</td>
                        <td className="p-3.5 text-ink-muted whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-3.5 text-ink-muted max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= MODULE: GEOGRAPHIC DISCOVERY ================= */}
          {activeModule === 'locations' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink flex items-center gap-2">
                    <MapPin size={24} className="text-accent-deep" />
                    <span>South Africa Geographic Discovery & Locations</span>
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Manage reference datasets for 9 provinces, municipalities, cities, and suburbs with verified GPS coordinates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLocation(null);
                    setLocationForm({
                      country: 'South Africa',
                      countryCode: 'ZA',
                      province: 'Gauteng',
                      provinceCode: 'GT',
                      municipality: 'City of Johannesburg',
                      city: 'Johannesburg',
                      suburb: '',
                      postalCode: '',
                      formattedAddress: '',
                      latitude: -26.2041,
                      longitude: 28.0473,
                      locationType: 'suburb',
                      aliases: ''
                    });
                    setIsLocationModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>Add Reference Location</span>
                </button>
              </div>

              {/* Discovery Engine Configuration Strip */}
              {locationConfig && (
                <div className="p-4 bg-paper-warm rounded-2xl border border-ink/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Sliders size={14} className="text-accent-deep" />
                      <span>Geospatial Provider & Platform Settings</span>
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      Total known SA localities: <strong className="text-ink font-bold">{locationConfig.totalKnownLocations}</strong> • Active in-memory cache: <strong className="text-ink font-bold">{locationConfig.activeCacheEntries}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-paper rounded-xl border border-ink/10">
                      <div className="text-[10px] font-bold text-ink-muted uppercase mb-1">Active Location Provider</div>
                      <select
                        value={locationConfig.locationProvider}
                        onChange={(e) => handleUpdateLocationConfig({ locationProvider: e.target.value })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-lg px-2 py-1 text-xs font-bold text-ink focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="database">Database (Local Verified Dataset)</option>
                        <option value="nominatim">Nominatim / OpenStreetMap Live</option>
                        <option value="mock">Mock Provider (Testing / Offline)</option>
                      </select>
                    </div>

                    <div className="p-3 bg-paper rounded-xl border border-ink/10">
                      <div className="text-[10px] font-bold text-ink-muted uppercase mb-1">Default Search Radius</div>
                      <div className="flex items-center gap-2">
                        <select
                          value={locationConfig.defaultRadius}
                          onChange={(e) => handleUpdateLocationConfig({ defaultRadius: Number(e.target.value) })}
                          className="w-full bg-paper-warm border border-ink/15 rounded-lg px-2 py-1 text-xs font-bold text-ink focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value={1}>1 km (Walking)</option>
                          <option value={2}>2 km</option>
                          <option value={5}>5 km</option>
                          <option value={10}>10 km (Standard)</option>
                          <option value={25}>25 km (Metro)</option>
                          <option value={50}>50 km</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-paper rounded-xl border border-ink/10 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-ink-muted uppercase">Radius Filtering Options</div>
                        <div className="text-xs font-bold text-ink mt-0.5">
                          {Array.isArray(locationConfig.radiusOptions) ? locationConfig.radiusOptions.join(', ') : '1, 2, 5, 10, 25, 50, 100'} km
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      placeholder="Search suburb, city, municipality..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setLocationPage(1);
                          loadModuleData('locations');
                        }
                      }}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl pl-9 pr-3 py-2 text-xs text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <select
                    value={locationProvinceFilter}
                    onChange={(e) => {
                      setLocationProvinceFilter(e.target.value);
                      setLocationPage(1);
                    }}
                    className="bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="All">All 9 Provinces</option>
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

                  <button
                    type="button"
                    onClick={() => {
                      setLocationPage(1);
                      loadModuleData('locations');
                    }}
                    className="px-3 py-2 bg-ink text-paper rounded-xl text-xs font-bold hover:bg-ink-soft transition-colors"
                  >
                    Filter
                  </button>
                </div>

                <div className="text-xs text-ink-muted self-end sm:self-center">
                  Showing <strong>{locationsList.length}</strong> of <strong>{locationTotal}</strong> localities
                </div>
              </div>

              {/* Table */}
              <div className="border border-ink/10 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-warm border-b border-ink/10 text-ink-muted uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Suburb / Place</th>
                      <th className="px-4 py-3">City / Town</th>
                      <th className="px-4 py-3">Municipality</th>
                      <th className="px-4 py-3">Province</th>
                      <th className="px-4 py-3">Coordinates (Lat, Lng)</th>
                      <th className="px-4 py-3">Postal Code</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {locationsList.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-ink-muted">
                          No geographic locations found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      locationsList.map((loc) => (
                        <tr key={loc.id} className="hover:bg-paper-warm/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-ink">
                            <div className="flex items-center gap-1.5">
                              <MapPin size={13} className="text-accent-deep shrink-0" />
                              <span>{loc.suburb || loc.city}</span>
                            </div>
                            {loc.aliases && (
                              <div className="text-[10px] text-ink-muted font-normal">Aliases: {loc.aliases}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-ink">{loc.city}</td>
                          <td className="px-4 py-3 text-ink-soft">{loc.municipality || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-paper-warm border border-ink/10 font-bold text-[10px] text-ink">
                              {loc.province}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-ink-soft">
                            {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-ink-soft font-mono">{loc.postalCode || '—'}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLocation(loc);
                                setLocationForm({
                                  country: loc.country || 'South Africa',
                                  countryCode: loc.countryCode || 'ZA',
                                  province: loc.province,
                                  provinceCode: loc.provinceCode || 'GT',
                                  municipality: loc.municipality || '',
                                  city: loc.city,
                                  suburb: loc.suburb || '',
                                  postalCode: loc.postalCode || '',
                                  formattedAddress: loc.formattedAddress || '',
                                  latitude: loc.latitude,
                                  longitude: loc.longitude,
                                  locationType: loc.locationType || 'suburb',
                                  aliases: loc.aliases || ''
                                });
                                setIsLocationModalOpen(true);
                              }}
                              className="text-xs text-ink-muted hover:text-ink font-bold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLocation(loc.id)}
                              className="text-xs text-ink-muted hover:text-red-500 font-bold hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {locationTotalPages > 1 && (
                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    disabled={locationPage <= 1}
                    onClick={() => {
                      setLocationPage(p => Math.max(1, p - 1));
                      loadModuleData('locations');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-ink/15 bg-paper hover:bg-paper-warm disabled:opacity-40 font-bold transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-ink-muted font-medium">
                    Page <strong>{locationPage}</strong> of <strong>{locationTotalPages}</strong>
                  </span>
                  <button
                    disabled={locationPage >= locationTotalPages}
                    onClick={() => {
                      setLocationPage(p => Math.min(locationTotalPages, p + 1));
                      loadModuleData('locations');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-ink/15 bg-paper hover:bg-paper-warm disabled:opacity-40 font-bold transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Add / Edit Reference Location Modal */}
          {isLocationModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in">
              <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="ref-loc-modal-title"
                className="bg-paper rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-ink/20 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                  <div>
                    <h3 id="ref-loc-modal-title" className="font-display font-black text-lg text-ink">
                      {editingLocation ? 'Edit Reference Location' : 'Add South African Reference Location'}
                    </h3>
                    <p className="text-xs text-ink-muted">Configure verified coordinates for radius queries & geocoding</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(false)}
                    className="p-1 rounded-xl hover:bg-paper-warm text-ink-muted hover:text-ink transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveLocation} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Province</label>
                      <select
                        value={locationForm.province}
                        onChange={(e) => setLocationForm({ ...locationForm, province: e.target.value })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
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

                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Municipality / District</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. City of Johannesburg"
                        value={locationForm.municipality}
                        onChange={(e) => setLocationForm({ ...locationForm, municipality: e.target.value })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">City / Town</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Johannesburg"
                        value={locationForm.city}
                        onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Suburb (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Rosebank"
                        value={locationForm.suburb}
                        onChange={(e) => setLocationForm({ ...locationForm, suburb: e.target.value })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={locationForm.latitude}
                        onChange={(e) => setLocationForm({ ...locationForm, latitude: Number(e.target.value) })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={locationForm.longitude}
                        onChange={(e) => setLocationForm({ ...locationForm, longitude: Number(e.target.value) })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Postal Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 2196"
                        value={locationForm.postalCode}
                        onChange={(e) => setLocationForm({ ...locationForm, postalCode: e.target.value })}
                        className="w-full bg-paper-warm border border-ink/15 rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Search Aliases / Keywords</label>
                    <input
                      type="text"
                      placeholder="e.g. Rosebank Mall, Oxford Parks, Rosebank Gautrain"
                      value={locationForm.aliases}
                      onChange={(e) => setLocationForm({ ...locationForm, aliases: e.target.value })}
                      className="w-full bg-paper-warm border border-ink/15 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-ink-soft hover:bg-paper-warm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-accent text-ink font-bold text-xs hover:bg-accent-hover shadow-sm"
                    >
                      {editingLocation ? 'Save Changes' : 'Create Location'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODULE 15: SETTINGS ================= */}
          {activeModule === 'settings' && (
            <div className="bg-paper rounded-3xl border border-ink/15 shadow-card p-6 space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-ink">Platform Parameters & Settings</h2>
                <p className="text-xs text-ink-muted">Configure monetization rules, support channels, and platform operational state</p>
              </div>

              {settingsData && (
                <form onSubmit={handleSaveSettings} className="space-y-5 max-w-xl">
                  {/* Commission Toggle */}
                  <div className="p-4 bg-paper-warm rounded-2xl border border-ink/10 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-ink">Marketplace Commission Mode</div>
                      <div className="text-[11px] text-ink-muted">Take percentage fee per completed checkout order</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsData.commissionEnabled || false}
                      onChange={(e) => setSettingsData({ ...settingsData, commissionEnabled: e.target.checked })}
                      className="w-5 h-5 rounded text-accent focus:ring-accent cursor-pointer"
                    />
                  </div>

                  {/* Commission Rate */}
                  <div>
                    <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settingsData.commissionRate || 5.0}
                      onChange={(e) => setSettingsData({ ...settingsData, commissionRate: parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                    />
                  </div>

                  {/* Minimum Subscription */}
                  <div>
                    <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                      Minimum Monthly Subscription (ZAR)
                    </label>
                    <input
                      type="number"
                      value={settingsData.minimumSubscription || 50.0}
                      onChange={(e) => setSettingsData({ ...settingsData, minimumSubscription: parseFloat(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                    />
                  </div>

                  {/* Platform Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                      Platform Brand Name
                    </label>
                    <input
                      type="text"
                      value={settingsData.platformName || 'LocalBiz South Africa'}
                      onChange={(e) => setSettingsData({ ...settingsData, platformName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                    />
                  </div>

                  {/* Support Contact Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Support Email</label>
                      <input
                        type="email"
                        value={settingsData.supportEmail || 'support@localbiz.co.za'}
                        onChange={(e) => setSettingsData({ ...settingsData, supportEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-ink-muted uppercase mb-1">Support Phone</label>
                      <input
                        type="text"
                        value={settingsData.supportPhone || '+27 11 907 5500'}
                        onChange={(e) => setSettingsData({ ...settingsData, supportPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-paper-warm border border-ink/15 rounded-xl text-xs text-ink focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Maintenance Mode */}
                  <div className="p-4 bg-paper-warm rounded-2xl border border-ink/10 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-ink">Platform Maintenance Mode</div>
                      <div className="text-[11px] text-ink-muted">Display maintenance banner across public portals</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsData.maintenanceMode || false}
                      onChange={(e) => setSettingsData({ ...settingsData, maintenanceMode: e.target.checked })}
                      className="w-5 h-5 rounded text-accent focus:ring-accent cursor-pointer"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-ink text-paper font-bold text-xs hover:bg-ink-soft shadow-sm"
                    >
                      Save Platform Settings
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
