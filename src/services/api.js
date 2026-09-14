// Centralized API Service for LocalBiz Platform

const API_BASE = '/api';

const getHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token || localStorage.getItem('localbiz_token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

export const api = {
  // 1. Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async registerBusiness(data) {
    const res = await fetch(`${API_BASE}/auth/register-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: 'business' })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Business registration failed');
    }
    return res.json();
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      // Graceful offline logout
    }
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return res.json();
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to request password reset');
    }
    return res.json();
  },

  async updateProfile(data) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update profile');
    }
    return res.json();
  },

  // 2. Merchants
  async getMerchants(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/merchants?${query}`);
    return res.json();
  },

  async getMerchant(id) {
    const res = await fetch(`${API_BASE}/merchants/${id}`);
    if (!res.ok) throw new Error('Merchant not found');
    return res.json();
  },

  async createMerchant(data) {
    const res = await fetch(`${API_BASE}/merchants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to register merchant');
    return res.json();
  },

  async updateMerchant(id, data) {
    const res = await fetch(`${API_BASE}/merchants/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update merchant');
    return res.json();
  },

  async getMerchantAnalytics(id) {
    const res = await fetch(`${API_BASE}/merchants/${id}/analytics`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async addReview(merchantId, reviewData, token) {
    const res = await fetch(`${API_BASE}/merchants/${merchantId}/reviews`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(reviewData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add review');
    }
    return res.json();
  },

  async getMerchantRatingSummary(merchantId) {
    const res = await fetch(`${API_BASE}/merchants/${merchantId}/rating-summary`);
    if (!res.ok) throw new Error('Failed to fetch rating summary');
    return res.json();
  },

  // Stage 12 — Advanced Search & Suggestions
  async searchMarketplace(params = {}) {
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    const res = await fetch(`${API_BASE}/search?${query}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to perform marketplace search');
    return res.json();
  },

  async getSearchSuggestions(q = '', limit = 8) {
    if (!q || !q.trim()) return [];
    const query = new URLSearchParams({ q: q.trim(), limit }).toString();
    const res = await fetch(`${API_BASE}/search/suggestions?${query}`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return res.json();
  },

  // 3. Products & Services
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/products?${query}`);
    return res.json();
  },

  async getProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error('Product not found');
    return res.json();
  },

  async createProduct(data) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create product');
    return res.json();
  },

  async updateProduct(id, data) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete product');
    return res.json();
  },

  // 4. Orders
  async getOrders(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/orders?${query}`, {
      headers: getHeaders(token)
    });
    return res.json();
  },

  async getOrder(id, token) {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Order not found');
    return res.json();
  },

  async createOrder(data, token) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create order');
    }
    return res.json();
  },

  async updateOrderStatus(id, status, paymentStatus, token) {
    // Stage 7 PUT /api/orders/:id/status
    let res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ status, paymentStatus })
    });
    if (!res.ok) {
      // Fallback to PATCH if needed
      res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify({ status, paymentStatus })
      });
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update order status');
    }
    return res.json();
  },

  async cancelOrder(id, token) {
    return this.updateOrderStatus(id, 'CANCELLED', undefined, token);
  },

  // Stage 9 — Payments Architecture
  async createPayment(data, token) {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to initiate payment');
    }
    return res.json();
  },

  async processPayment(paymentId, options = {}, token) {
    const res = await fetch(`${API_BASE}/payments/${paymentId}/process`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(options)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Payment processing failed');
    }
    return res.json();
  },

  async getPaymentById(id, token) {
    const res = await fetch(`${API_BASE}/payments/${id}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Payment record not found');
    return res.json();
  },

  async getPayments(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/payments?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load payment history');
    return res.json();
  },

  async refundPayment(id, options = {}, token) {
    const res = await fetch(`${API_BASE}/payments/${id}/refund`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(options)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to refund payment');
    }
    return res.json();
  },

  // 5. Bookings
  async getBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/bookings?${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getBooking(id) {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Booking not found');
    return res.json();
  },

  async createBooking(data, token = null) {
    const headers = token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : getHeaders();
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create booking');
    }
    return res.json();
  },

  async updateBookingStatus(id, status, extraData = {}, token = null) {
    const headers = token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : getHeaders();
    let res = await fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status, ...extraData })
    });
    if (!res.ok) {
      res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, ...extraData })
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update booking status');
    }
    return res.json();
  },

  async cancelBooking(id, token = null) {
    return this.updateBookingStatus(id, 'CANCELLED', {}, token);
  },

  async rescheduleBooking(id, newDate, newTimeSlot, token = null) {
    return this.updateBookingStatus(id, 'RESCHEDULED', { newDate, newTimeSlot }, token);
  },

  async getMerchantAvailability(merchantId, date = '') {
    const url = date
      ? `${API_BASE}/merchants/${merchantId}/availability?date=${date}`
      : `${API_BASE}/merchants/${merchantId}/availability`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch merchant availability');
    return res.json();
  },

  async getBusinessAvailability() {
    const res = await fetch(`${API_BASE}/business/availability`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch availability');
    return res.json();
  },

  async updateBusinessAvailability(data) {
    const res = await fetch(`${API_BASE}/business/availability`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return res.json();
  },

  // 6. Favourites (Stage 13 — Multi-Entity Consumer Favorites)
  async getFavourites(userId, options = {}, token) {
    const query = new URLSearchParams({
      ...(userId ? { userId } : {}),
      ...(options.type ? { type: options.type } : {})
    }).toString();
    const res = await fetch(`${API_BASE}/favourites?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load favorites');
    return res.json();
  },

  async addFavourite(payload, token) {
    const res = await fetch(`${API_BASE}/favourites`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add favorite');
    }
    return res.json();
  },

  async removeFavourite(options, token) {
    const endpoint = options?.id 
      ? `${API_BASE}/favourites/${options.id}`
      : `${API_BASE}/favourites?${new URLSearchParams(options).toString()}`;
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove favorite');
    }
    return res.json();
  },

  async toggleFavourite(userId, target, token) {
    const payload = typeof target === 'string'
      ? { userId, merchantId: target, toggle: true }
      : { userId, ...target, toggle: true };

    const res = await fetch(`${API_BASE}/favourites`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update favorite');
    }
    return res.json();
  },

  async checkFavouriteStatus(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/favourites/status?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return { isFavourite: false, favouriteId: null };
    return res.json();
  },

  // 7. Promotions
  async getPromotions(merchantId) {
    const query = merchantId ? `?merchantId=${merchantId}` : '';
    const res = await fetch(`${API_BASE}/promotions${query}`);
    return res.json();
  },

  async createPromotion(data) {
    const res = await fetch(`${API_BASE}/promotions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deletePromotion(id) {
    const res = await fetch(`${API_BASE}/promotions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  async validatePromotion(code, merchantId, context = {}) {
    const res = await fetch(`${API_BASE}/promotions/validate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code, merchantId, ...context })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid promotion code');
    }
    return data;
  },

  // 8. Notifications & Reports
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/notifications?${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return res.json();
  },

  async markAllNotificationsRead(params = {}) {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async deleteNotification(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  async createReport(data) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 9. Categories
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    return res.json();
  },

  async createCategory(data) {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // 10. Reviews Moderation
  async getReviews() {
    const res = await fetch(`${API_BASE}/reviews`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateReviewStatus(id, status) {
    const res = await fetch(`${API_BASE}/reviews/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async deleteReview(id) {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // 11. Messages & Conversations (Stage 14)
  async getConversations(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/conversations${query ? `?${query}` : ''}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to load conversations');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async getConversation(id, token) {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to load conversation');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async startConversation(data, token) {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to start conversation');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async sendConversationMessage(conversationId, data, token) {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to send message');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async markConversationRead(conversationId, token) {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to mark conversation as read');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async getUnreadMessageCounts(token) {
    const res = await fetch(`${API_BASE}/conversations/unread-count`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return { totalUnread: 0 };
    return res.json();
  },

  // Legacy fallback messages
  async getMessages(merchantId) {
    const query = merchantId ? `?merchantId=${merchantId}` : '';
    const res = await fetch(`${API_BASE}/messages${query}`);
    return res.json();
  },

  async sendMessage(data, token) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 12. Campaigns
  async getCampaigns() {
    const res = await fetch(`${API_BASE}/campaigns`);
    return res.json();
  },

  async createCampaign(data) {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateCampaign(id, data) {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 13. Admin API Suite (Stage 6)
  async getAdminOverview(token) {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return null;
    return res.json();
  },

  async getAdminDashboard(token) {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load admin dashboard');
    return res.json();
  },

  async getAdminUsers(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/users?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async updateAdminUser(id, data, token) {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  async getAdminBusinesses(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/businesses?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async updateAdminBusinessStatus(id, status, token) {
    const res = await fetch(`${API_BASE}/admin/merchants/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update business status');
    return res.json();
  },

  async getAdminApprovals(token) {
    const res = await fetch(`${API_BASE}/admin/approvals`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async updateKycApproval(id, status, token) {
    const res = await fetch(`${API_BASE}/admin/approvals/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update KYC status');
    return res.json();
  },

  async getAdminCategories(token) {
    const res = await fetch(`${API_BASE}/admin/categories`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async createAdminCategory(data, token) {
    const res = await fetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create category');
    }
    return res.json();
  },

  async updateAdminCategory(id, data, token) {
    const res = await fetch(`${API_BASE}/admin/categories/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update category');
    }
    return res.json();
  },

  async deleteAdminCategory(id, token) {
    const res = await fetch(`${API_BASE}/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return res.json();
  },

  async getAdminProducts(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/products?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async updateAdminProductStatus(id, data, token) {
    const res = await fetch(`${API_BASE}/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update product status');
    return res.json();
  },

  async deleteAdminProduct(id, token) {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to remove listing');
    return res.json();
  },

  async getAdminServices(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/services?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getAdminOrders(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/orders?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async updateAdminOrderStatus(id, data, token) {
    const res = await fetch(`${API_BASE}/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },

  async getAdminBookings(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/bookings?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async updateAdminBookingStatus(id, data, token) {
    const res = await fetch(`${API_BASE}/admin/bookings/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update booking status');
    return res.json();
  },

  async getAdminPayments(token) {
    const res = await fetch(`${API_BASE}/admin/payments`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load payments ledger');
    return res.json();
  },

  async getAdminReviews(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/reviews?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async flagAdminReview(id, token) {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}/flag`, {
      method: 'PATCH',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to flag review');
    return res.json();
  },

  async updateAdminReviewStatus(id, status, token) {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update review status');
    return res.json();
  },

  async deleteAdminReview(id, token) {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to remove review');
    return res.json();
  },

  async getAdminReports(token) {
    const res = await fetch(`${API_BASE}/admin/reports`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load reports');
    return res.json();
  },

  async getAdminNotifications(token) {
    const res = await fetch(`${API_BASE}/admin/notifications`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async broadcastAdminNotification(data, token) {
    const res = await fetch(`${API_BASE}/admin/notifications/broadcast`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to broadcast notification');
    }
    return res.json();
  },

  async getAdminPromotions(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/promotions?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load promotions');
    return res.json();
  },

  async updateAdminPromotionStatus(id, status, token) {
    const res = await fetch(`${API_BASE}/admin/promotions/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update promotion status');
    }
    return res.json();
  },

  async deleteAdminPromotion(id, token) {
    const res = await fetch(`${API_BASE}/admin/promotions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete promotion');
    }
    return res.json();
  },

  async getAdminAuditLogs(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/audit-logs?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getAdminSettings(token) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: getHeaders(token)
    });
    if (!res.ok) return null;
    return res.json();
  },

  async updateAdminSettings(data, token) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update platform settings');
    return res.json();
  },

  // 14. Business Management Portal (Stage 5)
  async getBusinessDashboard(token) {
    const res = await fetch(`${API_BASE}/business/dashboard`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business dashboard');
    return res.json();
  },

  async getBusinessProfile(token) {
    const res = await fetch(`${API_BASE}/business/profile`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business profile');
    return res.json();
  },

  async updateBusinessProfile(data, token) {
    const res = await fetch(`${API_BASE}/business/profile`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update business profile');
    return res.json();
  },

  async getBusinessProducts(token) {
    const res = await fetch(`${API_BASE}/business/products`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business products');
    return res.json();
  },

  async createBusinessProduct(data, token) {
    const res = await fetch(`${API_BASE}/business/products`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create product');
    }
    return res.json();
  },

  async updateBusinessProduct(id, data, token) {
    const res = await fetch(`${API_BASE}/business/products/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update product');
    }
    return res.json();
  },

  async deleteBusinessProduct(id, token) {
    const res = await fetch(`${API_BASE}/business/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete product');
    }
    return res.json();
  },

  async toggleBusinessProductStock(id, inStock, token) {
    const res = await fetch(`${API_BASE}/business/products/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ inStock })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update product status');
    }
    return res.json();
  },

  async getBusinessServices(token) {
    const res = await fetch(`${API_BASE}/business/services`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business services');
    return res.json();
  },

  async createBusinessService(data, token) {
    const res = await fetch(`${API_BASE}/business/services`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create service');
    }
    return res.json();
  },

  async updateBusinessService(id, data, token) {
    const res = await fetch(`${API_BASE}/business/services/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update service');
    }
    return res.json();
  },

  async deleteBusinessService(id, token) {
    const res = await fetch(`${API_BASE}/business/services/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete service');
    }
    return res.json();
  },

  async toggleBusinessServiceStatus(id, inStock, token) {
    const res = await fetch(`${API_BASE}/business/services/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ inStock })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update service status');
    }
    return res.json();
  },

  async getBusinessCategories(token) {
    const res = await fetch(`${API_BASE}/business/categories`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business categories');
    return res.json();
  },

  async getBusinessOrders(token) {
    const res = await fetch(`${API_BASE}/business/orders`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business orders');
    return res.json();
  },

  async updateBusinessOrderStatus(id, status, paymentStatus, token) {
    const res = await fetch(`${API_BASE}/business/orders/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status, paymentStatus })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update order status');
    }
    return res.json();
  },

  async getBusinessBookings(token) {
    const res = await fetch(`${API_BASE}/business/bookings`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business bookings');
    return res.json();
  },

  async updateBusinessBookingStatus(id, status, token) {
    const res = await fetch(`${API_BASE}/business/bookings/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update booking status');
    }
    return res.json();
  },

  async getBusinessCustomers(token) {
    const res = await fetch(`${API_BASE}/business/customers`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business customers');
    return res.json();
  },

  async getBusinessReviews(token) {
    const res = await fetch(`${API_BASE}/business/reviews`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load business reviews');
    return res.json();
  },

  async getBusinessRatingSummary(token) {
    const res = await fetch(`${API_BASE}/business/reviews/summary`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load rating summary');
    return res.json();
  },

  async replyBusinessReview(id, reply, token) {
    const res = await fetch(`${API_BASE}/business/reviews/${id}/reply`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ reply })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to post reply to review');
    }
    return res.json();
  },

  async getBusinessPayments(token) {
    const res = await fetch(`${API_BASE}/business/payments`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load payments ledger');
    return res.json();
  },

  async getBusinessPromotions(token) {
    const res = await fetch(`${API_BASE}/business/promotions`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load promotions');
    return res.json();
  },

  async createBusinessPromotion(data, token) {
    const res = await fetch(`${API_BASE}/business/promotions`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create promotion');
    }
    return res.json();
  },

  async deleteBusinessPromotion(id, token) {
    const res = await fetch(`${API_BASE}/business/promotions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete promotion');
    }
    return res.json();
  },

  async updateBusinessPromotion(id, data, token) {
    const res = await fetch(`${API_BASE}/business/promotions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update promotion');
    }
    return res.json();
  },

  async setBusinessPromotionStatus(id, status, token) {
    const res = await fetch(`${API_BASE}/business/promotions/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update promotion status');
    }
    return res.json();
  },

  async getBusinessReports(token) {
    const res = await fetch(`${API_BASE}/business/reports`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load reports');
    return res.json();
  },

  async getBusinessNotifications(token) {
    const res = await fetch(`${API_BASE}/business/notifications`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load notifications');
    return res.json();
  },

  async updateBusinessSettings(data, token) {
    const res = await fetch(`${API_BASE}/business/settings`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update settings');
    }
    return res.json();
  },

  // 12. Favourites (Stage 13 — Multi-Entity Consumer Favorites)
  async getFavourites(userId, options = {}, token) {
    const authToken = token || localStorage.getItem('localbiz_token');
    if (!authToken && !userId) return [];
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (options.type && options.type !== 'all') params.append('type', options.type);
    
    try {
      const res = await fetch(`${API_BASE}/favourites?${params.toString()}`, {
        headers: getHeaders(authToken)
      });
      if (res.status === 401) return [];
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch favorites');
      }
      return res.json();
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('Authentication')) return [];
      throw e;
    }
  },

  async addFavourite(data, token) {
    const res = await fetch(`${API_BASE}/favourites`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to add favorite');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async removeFavourite(identifier, isTarget = false, token) {
    if (isTarget || typeof identifier === 'object') {
      const params = new URLSearchParams(identifier);
      const res = await fetch(`${API_BASE}/favourites?${params.toString()}`, {
        method: 'DELETE',
        headers: getHeaders(token)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const error = new Error(err.error || 'Failed to remove favorite');
        error.statusCode = res.status;
        throw error;
      }
      return res.json();
    }

    const res = await fetch(`${API_BASE}/favourites/${identifier}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to remove favorite');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async toggleFavourite(userId, payload, token) {
    const res = await fetch(`${API_BASE}/favourites`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ ...payload, userId, toggle: true })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to toggle favorite');
      error.statusCode = res.status;
      throw error;
    }
    return res.json();
  },

  async checkFavouriteStatus(params, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/favourites/status?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to check favorite status');
    }
    return res.json();
  },

  // ================= STAGE 16: REPORTING & ANALYTICS =================
  async getBusinessAnalytics(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/business/analytics?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch business analytics');
    }
    return res.json();
  },

  async exportBusinessReport(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/business/analytics/export?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export business report');
    }
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  },

  async getAdminAnalytics(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/analytics?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch platform analytics');
    }
    return res.json();
  },

  async exportAdminReport(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/analytics/export?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export admin report');
    }
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  },

  // ================= 15. LOCATION & GEOGRAPHIC DISCOVERY =================
  async getProvinces() {
    const res = await fetch(`${API_BASE}/location/provinces`);
    if (!res.ok) throw new Error('Failed to fetch provinces');
    return res.json();
  },

  async getCities(province) {
    const params = province ? `?province=${encodeURIComponent(province)}` : '';
    const res = await fetch(`${API_BASE}/location/cities${params}`);
    if (!res.ok) throw new Error('Failed to fetch cities');
    return res.json();
  },

  async getSuburbs(city, province) {
    const query = new URLSearchParams();
    if (city) query.set('city', city);
    if (province) query.set('province', province);
    const res = await fetch(`${API_BASE}/location/suburbs?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch suburbs');
    return res.json();
  },

  async searchLocations(q, options = {}) {
    const query = new URLSearchParams({ q, ...options });
    const res = await fetch(`${API_BASE}/location/search?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to search locations');
    return res.json();
  },

  async geocode(address, options = {}) {
    const query = new URLSearchParams({ address, ...options });
    const res = await fetch(`${API_BASE}/location/geocode?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to geocode address');
    return res.json();
  },

  async reverseGeocode(lat, lng, options = {}) {
    const query = new URLSearchParams({ lat, lng, ...options });
    const res = await fetch(`${API_BASE}/location/reverse-geocode?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to reverse geocode coordinates');
    return res.json();
  },

  async getNearby(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/location/nearby?${query}`);
    if (!res.ok) throw new Error('Failed to fetch nearby items');
    return res.json();
  },

  async selectActiveLocation(data) {
    const res = await fetch(`${API_BASE}/location/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to set active location');
    return res.json();
  },

  async getCurrentLocationConfig() {
    const res = await fetch(`${API_BASE}/location/current`);
    if (!res.ok) throw new Error('Failed to fetch default location config');
    return res.json();
  },

  async getSavedLocations(token) {
    const res = await fetch(`${API_BASE}/location/saved`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch saved locations');
    return res.json();
  },

  async saveLocation(data, token) {
    const res = await fetch(`${API_BASE}/location/saved`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save location');
    }
    return res.json();
  },

  async deleteSavedLocation(id, token) {
    const res = await fetch(`${API_BASE}/location/saved/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete saved location');
    return res.json();
  },

  async getMerchantBranches(merchantId) {
    const res = await fetch(`${API_BASE}/merchants/${merchantId}/branches`);
    if (!res.ok) throw new Error('Failed to fetch merchant branches');
    return res.json();
  },

  async createMerchantBranch(merchantId, data, token) {
    const res = await fetch(`${API_BASE}/merchants/${merchantId}/branches`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create branch location');
    }
    return res.json();
  },

  async deleteMerchantBranch(merchantId, branchId, token) {
    const res = await fetch(`${API_BASE}/merchants/${merchantId}/branches/${branchId}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete branch location');
    return res.json();
  },

  async getAdminLocations(params = {}, token) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin/locations?${query}`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch admin locations');
    return res.json();
  },

  async createAdminLocation(data, token) {
    const res = await fetch(`${API_BASE}/admin/locations`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create reference location');
    }
    return res.json();
  },

  async updateAdminLocation(id, data, token) {
    const res = await fetch(`${API_BASE}/admin/locations/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update reference location');
    }
    return res.json();
  },

  async deleteAdminLocation(id, token) {
    const res = await fetch(`${API_BASE}/admin/locations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete reference location');
    return res.json();
  },

  async getAdminLocationConfig(token) {
    const res = await fetch(`${API_BASE}/admin/location-config`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch location settings');
    return res.json();
  },

  async updateAdminLocationConfig(data, token) {
    const res = await fetch(`${API_BASE}/admin/location-config`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update location settings');
    }
    return res.json();
  }
};


