import { PrismaClient } from '@prisma/client';

export class AnalyticsService {
  constructor(prismaInstance = null) {
    this.prisma = prismaInstance || new PrismaClient();
  }

  /**
   * Resolves a period preset or custom date range into { from: Date|null, to: Date|null, period: string }
   */
  resolveDateRange(period = '30d', startDate = null, endDate = null) {
    const now = new Date();
    let from = null;
    let to = null;

    if (startDate || endDate || period === 'custom') {
      if (startDate) {
        from = new Date(startDate);
        if (typeof startDate === 'string' && startDate.length === 10) {
          from.setHours(0, 0, 0, 0);
        }
      }
      if (endDate) {
        to = new Date(endDate);
        if (typeof endDate === 'string' && endDate.length === 10) {
          to.setHours(23, 59, 59, 999);
        }
      } else {
        to = new Date(now);
      }
      return { from, to, period: 'custom' };
    }

    switch (period) {
      case 'today': {
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
        break;
      }
      case '7d': {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = new Date(now);
        break;
      }
      case '30d': {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = new Date(now);
        break;
      }
      case 'month': {
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        to = new Date(now);
        break;
      }
      case 'year': {
        from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        to = new Date(now);
        break;
      }
      case 'all':
      default: {
        from = null;
        to = null;
        break;
      }
    }

    return { from, to, period };
  }

  /**
   * Helper to get the preceding date interval for growth / comparative analysis
   */
  getPreviousDateRange(from, to) {
    if (!from || !to) return null;
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime());
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    return { from: prevFrom, to: prevTo };
  }

  /**
   * Helper to format ISO week string e.g. "2026-W37"
   */
  getWeekIdentifier(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
    return `${target.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  /**
   * Generates Business Analytics for a single merchant
   */
  async getBusinessAnalytics(merchantId, options = {}) {
    if (!merchantId) {
      throw new Error('Merchant ID is required for business analytics');
    }

    const { period = '30d', startDate, endDate } = options;
    const { from, to, period: resolvedPeriod } = this.resolveDateRange(period, startDate, endDate);

    // Build Prisma where clauses for Order & Booking
    const orderWhere = {
      merchantId,
      status: { notIn: ['CANCELLED', 'Cancelled'] }
    };

    const bookingWhere = {
      merchantId,
      status: { notIn: ['CANCELLED', 'Cancelled'] }
    };

    if (from || to) {
      orderWhere.createdAt = {};
      bookingWhere.createdAt = {};
      if (from) {
        orderWhere.createdAt.gte = from;
        bookingWhere.createdAt.gte = from;
      }
      if (to) {
        orderWhere.createdAt.lte = to;
        bookingWhere.createdAt.lte = to;
      }
    }

    // 1. Database Aggregation: Orders (Sum, Count, Avg)
    const [orderAgg, bookingAgg, orderStatuses, bookingStatuses, distinctOrderCustomers, distinctBookingCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: orderWhere,
        _sum: { total: true },
        _count: { id: true },
        _avg: { total: true }
      }),
      this.prisma.booking.aggregate({
        where: bookingWhere,
        _sum: { servicePrice: true },
        _count: { id: true }
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: {
          merchantId,
          ...(orderWhere.createdAt ? { createdAt: orderWhere.createdAt } : {})
        },
        _count: { id: true }
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: {
          merchantId,
          ...(bookingWhere.createdAt ? { createdAt: bookingWhere.createdAt } : {})
        },
        _count: { id: true }
      }),
      this.prisma.order.findMany({
        where: orderWhere,
        select: { userId: true, phone: true, customer: true },
        distinct: ['phone', 'userId']
      }),
      this.prisma.booking.findMany({
        where: bookingWhere,
        select: { userId: true, phone: true, customerName: true },
        distinct: ['phone', 'userId']
      })
    ]);

    const orderRevenue = Math.round((orderAgg._sum.total || 0) * 100) / 100;
    const serviceRevenue = Math.round((bookingAgg._sum.servicePrice || 0) * 100) / 100;
    const totalRevenue = Math.round((orderRevenue + serviceRevenue) * 100) / 100;
    const ordersCount = orderAgg._count.id || 0;
    const bookingsCount = bookingAgg._count.id || 0;
    const averageOrderValue = ordersCount > 0 ? Math.round((orderRevenue / ordersCount) * 100) / 100 : 0;

    // Unique customers aggregation
    const uniqueCustomerSet = new Set();
    distinctOrderCustomers.forEach(c => {
      const key = c.userId || (c.phone ? c.phone.trim() : null) || (c.customer ? c.customer.trim().toLowerCase() : null);
      if (key) uniqueCustomerSet.add(key);
    });
    distinctBookingCustomers.forEach(c => {
      const key = c.userId || (c.phone ? c.phone.trim() : null) || (c.customerName ? c.customerName.trim().toLowerCase() : null);
      if (key) uniqueCustomerSet.add(key);
    });
    const customersCount = uniqueCustomerSet.size;

    // 2. Top Products (Database Aggregation using OrderItem)
    // We group OrderItem by name and productId within merchant's non-cancelled orders
    const topProductsRaw = await this.prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      where: {
        order: orderWhere
      },
      _sum: { qty: true, price: true },
      _count: { id: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 10
    });

    const topProducts = topProductsRaw.map((p, index) => {
      const unitsSold = p._sum.qty || 0;
      // In orderItem, price is per unit; gross revenue is price * qty
      const unitPrice = p._sum.price && p._count.id ? (p._sum.price / p._count.id) : 0;
      const gross = Math.round((unitPrice * unitsSold) * 100) / 100;
      return {
        rank: index + 1,
        id: p.productId || `prod-${index + 1}`,
        name: p.name,
        unitsSold,
        revenue: gross
      };
    });

    // 3. Top Services (Database Aggregation using Booking)
    const topServicesRaw = await this.prisma.booking.groupBy({
      by: ['serviceName', 'serviceId'],
      where: bookingWhere,
      _sum: { servicePrice: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    const topServices = topServicesRaw.map((s, index) => ({
      rank: index + 1,
      id: s.serviceId || `srv-${index + 1}`,
      name: s.serviceName,
      bookingsCount: s._count.id || 0,
      revenue: Math.round((s._sum.servicePrice || 0) * 100) / 100
    }));

    // 4. Time Series Sales Aggregation: Daily, Weekly, Monthly, Annual
    // Fetch only timestamp and total scalar columns for time series bucketing
    const orderScalars = await this.prisma.order.findMany({
      where: orderWhere,
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' }
    });

    const dailyMap = {};
    const weeklyMap = {};
    const monthlyMap = {};
    const annualMap = {};

    orderScalars.forEach(order => {
      const d = order.createdAt ? new Date(order.createdAt) : new Date();
      const dateStr = d.toISOString().slice(0, 10);
      const weekStr = this.getWeekIdentifier(d);
      const monthStr = d.toISOString().slice(0, 7);
      const yearStr = d.toISOString().slice(0, 4);
      const val = Number(order.total) || 0;

      // Daily
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      dailyMap[dateStr].revenue += val;
      dailyMap[dateStr].orders += 1;

      // Weekly
      if (!weeklyMap[weekStr]) weeklyMap[weekStr] = { week: weekStr, label: weekStr, revenue: 0, orders: 0 };
      weeklyMap[weekStr].revenue += val;
      weeklyMap[weekStr].orders += 1;

      // Monthly
      if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { month: monthStr, label: monthStr, revenue: 0, orders: 0 };
      monthlyMap[monthStr].revenue += val;
      monthlyMap[monthStr].orders += 1;

      // Annual
      if (!annualMap[yearStr]) annualMap[yearStr] = { year: yearStr, label: yearStr, revenue: 0, orders: 0 };
      annualMap[yearStr].revenue += val;
      annualMap[yearStr].orders += 1;
    });

    // Round time series values
    const roundSeries = (map) => Object.values(map).map(item => ({
      ...item,
      revenue: Math.round(item.revenue * 100) / 100
    }));

    const salesBreakdown = {
      daily: roundSeries(dailyMap),
      weekly: roundSeries(weeklyMap),
      monthly: roundSeries(monthlyMap),
      annual: roundSeries(annualMap)
    };

    // 5. Growth Calculation (comparison with previous period)
    const prevRange = this.getPreviousDateRange(from, to);
    let growth = {
      revenueGrowthPercent: 0,
      ordersGrowthPercent: 0,
      bookingsGrowthPercent: 0
    };

    if (prevRange && prevRange.from && prevRange.to) {
      const [prevOrderAgg, prevBookingAgg] = await Promise.all([
        this.prisma.order.aggregate({
          where: {
            merchantId,
            status: { notIn: ['CANCELLED', 'Cancelled'] },
            createdAt: { gte: prevRange.from, lte: prevRange.to }
          },
          _sum: { total: true },
          _count: { id: true }
        }),
        this.prisma.booking.aggregate({
          where: {
            merchantId,
            status: { notIn: ['CANCELLED', 'Cancelled'] },
            createdAt: { gte: prevRange.from, lte: prevRange.to }
          },
          _sum: { servicePrice: true },
          _count: { id: true }
        })
      ]);

      const prevRev = (prevOrderAgg._sum.total || 0) + (prevBookingAgg._sum.servicePrice || 0);
      const prevOrders = prevOrderAgg._count.id || 0;
      const prevBookings = prevBookingAgg._count.id || 0;

      growth.revenueGrowthPercent = prevRev > 0
        ? Math.round(((totalRevenue - prevRev) / prevRev) * 1000) / 10
        : (totalRevenue > 0 ? 100 : 0);

      growth.ordersGrowthPercent = prevOrders > 0
        ? Math.round(((ordersCount - prevOrders) / prevOrders) * 1000) / 10
        : (ordersCount > 0 ? 100 : 0);

      growth.bookingsGrowthPercent = prevBookings > 0
        ? Math.round(((bookingsCount - prevBookings) / prevBookings) * 1000) / 10
        : (bookingsCount > 0 ? 100 : 0);
    }

    return {
      period: resolvedPeriod,
      dateRange: {
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null
      },
      summary: {
        revenue: totalRevenue,
        orderRevenue,
        serviceRevenue,
        orders: ordersCount,
        ordersCount,
        bookings: bookingsCount,
        bookingsCount,
        customers: customersCount,
        customersCount,
        averageOrderValue,
        growth
      },
      salesBreakdown,
      topProducts,
      topServices,
      orderStatuses: orderStatuses.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {}),
      bookingStatuses: bookingStatuses.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {})
    };
  }

  /**
   * Generates Platform Analytics for Super Admin across all merchants
   */
  async getAdminAnalytics(options = {}) {
    const { period = '30d', startDate, endDate } = options;
    const { from, to, period: resolvedPeriod } = this.resolveDateRange(period, startDate, endDate);

    const orderWhere = {
      status: { notIn: ['CANCELLED', 'Cancelled'] }
    };

    const bookingWhere = {
      status: { notIn: ['CANCELLED', 'Cancelled'] }
    };

    const userWhere = {};

    if (from || to) {
      orderWhere.createdAt = {};
      bookingWhere.createdAt = {};
      userWhere.createdAt = {};
      if (from) {
        orderWhere.createdAt.gte = from;
        bookingWhere.createdAt.gte = from;
        userWhere.createdAt.gte = from;
      }
      if (to) {
        orderWhere.createdAt.lte = to;
        bookingWhere.createdAt.lte = to;
        userWhere.createdAt.lte = to;
      }
    }

    // 1. Platform-wide Database Aggregations
    const [
      orderAgg,
      bookingAgg,
      totalUsers,
      totalMerchants,
      totalCategories,
      usersByRoleRaw,
      merchantsByStatusRaw,
      merchantsByCategoryRaw,
      orderStatusesRaw
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: orderWhere,
        _sum: { total: true },
        _count: { id: true },
        _avg: { total: true }
      }),
      this.prisma.booking.aggregate({
        where: bookingWhere,
        _sum: { servicePrice: true },
        _count: { id: true }
      }),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.merchant.count(),
      this.prisma.category.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        where: userWhere,
        _count: { id: true }
      }),
      this.prisma.merchant.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      this.prisma.merchant.groupBy({
        by: ['category'],
        _count: { id: true }
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: {
          ...(orderWhere.createdAt ? { createdAt: orderWhere.createdAt } : {})
        },
        _count: { id: true }
      })
    ]);

    const orderRevenue = Math.round((orderAgg._sum.total || 0) * 100) / 100;
    const serviceRevenue = Math.round((bookingAgg._sum.servicePrice || 0) * 100) / 100;
    const totalRevenue = Math.round((orderRevenue + serviceRevenue) * 100) / 100;
    const totalOrders = orderAgg._count.id || 0;
    const totalBookings = bookingAgg._count.id || 0;
    const avgOrderValue = totalOrders > 0 ? Math.round((orderRevenue / totalOrders) * 100) / 100 : 0;
    const businessLimit = options.limit ? Number(options.limit) : 50;

    // 2. Top Businesses by Revenue & Order Volume
    const topMerchantsAgg = await this.prisma.order.groupBy({
      by: ['merchantId', 'businessName'],
      where: orderWhere,
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: businessLimit
    });

    // Enrich with merchant metadata
    const merchantIds = topMerchantsAgg.map(m => m.merchantId);
    const merchantProfiles = await this.prisma.merchant.findMany({
      where: { id: { in: merchantIds } },
      select: { id: true, name: true, category: true, suburb: true }
    });
    const profileMap = new Map(merchantProfiles.map(m => [m.id, m]));

    const topBusinesses = topMerchantsAgg.map((m, index) => {
      const prof = profileMap.get(m.merchantId);
      const rev = Math.round((m._sum.total || 0) * 100) / 100;
      return {
        rank: index + 1,
        id: m.merchantId,
        name: prof?.name || m.businessName,
        category: prof?.category || 'General',
        suburb: prof?.suburb || 'Platform',
        orderCount: m._count.id || 0,
        totalRevenue: rev,
        shareOfRevenue: totalRevenue > 0 ? Math.round((rev / totalRevenue) * 1000) / 10 : 0
      };
    });

    // 3. Platform Top Products
    const topProductsRaw = await this.prisma.orderItem.groupBy({
      by: ['name', 'productId'],
      where: {
        order: orderWhere
      },
      _sum: { qty: true, price: true },
      _count: { id: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 10
    });

    const topProducts = topProductsRaw.map((p, index) => {
      const unitsSold = p._sum.qty || 0;
      const unitPrice = p._sum.price && p._count.id ? (p._sum.price / p._count.id) : 0;
      const gross = Math.round((unitPrice * unitsSold) * 100) / 100;
      return {
        rank: index + 1,
        id: p.productId || `prod-${index + 1}`,
        name: p.name,
        unitsSold,
        revenue: gross
      };
    });

    // 4. Platform Sales Time Series
    const orderScalars = await this.prisma.order.findMany({
      where: orderWhere,
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' }
    });

    const dailyMap = {};
    const weeklyMap = {};
    const monthlyMap = {};
    const annualMap = {};

    orderScalars.forEach(order => {
      const d = order.createdAt ? new Date(order.createdAt) : new Date();
      const dateStr = d.toISOString().slice(0, 10);
      const weekStr = this.getWeekIdentifier(d);
      const monthStr = d.toISOString().slice(0, 7);
      const yearStr = d.toISOString().slice(0, 4);
      const val = Number(order.total) || 0;

      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      dailyMap[dateStr].revenue += val;
      dailyMap[dateStr].orders += 1;

      if (!weeklyMap[weekStr]) weeklyMap[weekStr] = { week: weekStr, label: weekStr, revenue: 0, orders: 0 };
      weeklyMap[weekStr].revenue += val;
      weeklyMap[weekStr].orders += 1;

      if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { month: monthStr, label: monthStr, revenue: 0, orders: 0 };
      monthlyMap[monthStr].revenue += val;
      monthlyMap[monthStr].orders += 1;

      if (!annualMap[yearStr]) annualMap[yearStr] = { year: yearStr, label: yearStr, revenue: 0, orders: 0 };
      annualMap[yearStr].revenue += val;
      annualMap[yearStr].orders += 1;
    });

    const roundSeries = (map) => Object.values(map).map(item => ({
      ...item,
      revenue: Math.round(item.revenue * 100) / 100
    }));

    const salesBreakdown = {
      daily: roundSeries(dailyMap),
      weekly: roundSeries(weeklyMap),
      monthly: roundSeries(monthlyMap),
      annual: roundSeries(annualMap)
    };

    // 5. Growth Calculation (current vs preceding period)
    const prevRange = this.getPreviousDateRange(from, to);
    let growth = {
      revenueGrowthPercent: 0,
      ordersGrowthPercent: 0,
      bookingsGrowthPercent: 0,
      usersGrowthPercent: 0
    };

    if (prevRange && prevRange.from && prevRange.to) {
      const [prevOrderAgg, prevBookingAgg, prevUserCount] = await Promise.all([
        this.prisma.order.aggregate({
          where: {
            status: { notIn: ['CANCELLED', 'Cancelled'] },
            createdAt: { gte: prevRange.from, lte: prevRange.to }
          },
          _sum: { total: true },
          _count: { id: true }
        }),
        this.prisma.booking.aggregate({
          where: {
            status: { notIn: ['CANCELLED', 'Cancelled'] },
            createdAt: { gte: prevRange.from, lte: prevRange.to }
          },
          _sum: { servicePrice: true },
          _count: { id: true }
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: prevRange.from, lte: prevRange.to } }
        })
      ]);

      const prevRev = (prevOrderAgg._sum.total || 0) + (prevBookingAgg._sum.servicePrice || 0);
      const prevOrders = prevOrderAgg._count.id || 0;
      const prevBookings = prevBookingAgg._count.id || 0;

      growth.revenueGrowthPercent = prevRev > 0
        ? Math.round(((totalRevenue - prevRev) / prevRev) * 1000) / 10
        : (totalRevenue > 0 ? 100 : 0);

      growth.ordersGrowthPercent = prevOrders > 0
        ? Math.round(((totalOrders - prevOrders) / prevOrders) * 1000) / 10
        : (totalOrders > 0 ? 100 : 0);

      growth.bookingsGrowthPercent = prevBookings > 0
        ? Math.round(((totalBookings - prevBookings) / prevBookings) * 1000) / 10
        : (totalBookings > 0 ? 100 : 0);

      growth.usersGrowthPercent = prevUserCount > 0
        ? Math.round(((totalUsers - prevUserCount) / prevUserCount) * 1000) / 10
        : (totalUsers > 0 ? 100 : 0);
    }

    const usersByRole = usersByRoleRaw.reduce((acc, curr) => ({ ...acc, [curr.role]: curr._count.id }), { consumer: 0, business: 0, admin: 0 });
    const businessesByStatus = merchantsByStatusRaw.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {});
    const businessesByCategory = merchantsByCategoryRaw.reduce((acc, curr) => ({ ...acc, [curr.category]: curr._count.id }), {});
    const ordersByStatus = orderStatusesRaw.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {});

    return {
      period: resolvedPeriod,
      dateRange: {
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null
      },
      totalGmv: totalRevenue,
      revenue: totalRevenue,
      totalRevenue,
      totalOrders,
      orders: totalOrders,
      totalBookings,
      bookings: totalBookings,
      totalUsers,
      users: totalUsers,
      totalMerchants,
      totalBusinesses: totalMerchants,
      businesses: totalMerchants,
      totalCategories,
      categories: totalCategories,
      avgOrderValue,
      averageOrderValue: avgOrderValue,
      summary: {
        totalRevenue,
        revenue: totalRevenue,
        totalGmv: totalRevenue,
        orderRevenue,
        serviceRevenue,
        totalOrders,
        orders: totalOrders,
        totalBookings,
        bookings: totalBookings,
        totalUsers,
        users: totalUsers,
        totalBusinesses: totalMerchants,
        businesses: totalMerchants,
        totalCategories,
        categories: totalCategories,
        averageOrderValue: avgOrderValue,
        avgOrderValue,
        growth
      },
      growth,
      salesBreakdown,
      monthlyBreakdown: salesBreakdown.monthly,
      topBusinesses,
      topMerchants: topBusinesses,
      topProducts,
      usersByRole,
      businessesByStatus,
      businessesByCategory,
      merchantsByCategory: businessesByCategory,
      ordersByStatus
    };
  }

  /**
   * Generates CSV string from tabular array data
   */
  formatCsv(headers, rows) {
    const escapeCsvField = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsvField).join(',');
    const rowLines = rows.map(r => r.map(escapeCsvField).join(','));
    // UTF-8 BOM ensures Excel displays UTF-8 characters without corruption
    return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  }

  /**
   * Report Export Architecture: CSV and JSON format generator
   */
  async exportReport(params = {}) {
    const {
      scope = 'business', // 'business' or 'admin'
      merchantId = null,
      type = 'sales-summary', // 'sales-summary', 'top-products', 'top-services', 'orders', 'platform-overview', 'businesses'
      format = 'csv', // 'csv' or 'json'
      period = '30d',
      startDate = null,
      endDate = null
    } = params;

    const dateRange = this.resolveDateRange(period, startDate, endDate);
    const filenameDate = new Date().toISOString().slice(0, 10);

    if (scope === 'business') {
      if (!merchantId) throw new Error('Merchant ID required for business report export');
      const analytics = await this.getBusinessAnalytics(merchantId, { period, startDate, endDate });

      if (type === 'top-products') {
        const headers = ['Rank', 'Product ID', 'Product Name', 'Units Sold', 'Revenue (ZAR)'];
        const rows = analytics.topProducts.map(p => [
          p.rank,
          p.id,
          p.name,
          p.unitsSold,
          p.revenue.toFixed(2)
        ]);

        if (format === 'json') {
          return {
            filename: `products-report-${merchantId}-${filenameDate}.json`,
            contentType: 'application/json',
            data: { merchantId, dateRange: analytics.dateRange, products: analytics.topProducts }
          };
        }
        return {
          filename: `products-report-${merchantId}-${filenameDate}.csv`,
          contentType: 'text/csv; charset=utf-8',
          data: this.formatCsv(headers, rows)
        };
      }

      if (type === 'top-services') {
        const headers = ['Rank', 'Service ID', 'Service Name', 'Bookings Count', 'Revenue (ZAR)'];
        const rows = analytics.topServices.map(s => [
          s.rank,
          s.id,
          s.name,
          s.bookingsCount,
          s.revenue.toFixed(2)
        ]);

        if (format === 'json') {
          return {
            filename: `services-report-${merchantId}-${filenameDate}.json`,
            contentType: 'application/json',
            data: { merchantId, dateRange: analytics.dateRange, services: analytics.topServices }
          };
        }
        return {
          filename: `services-report-${merchantId}-${filenameDate}.csv`,
          contentType: 'text/csv; charset=utf-8',
          data: this.formatCsv(headers, rows)
        };
      }

      if (type === 'orders') {
        const orderWhere = {
          merchantId,
          status: { notIn: ['CANCELLED', 'Cancelled'] }
        };
        if (dateRange.from || dateRange.to) {
          orderWhere.createdAt = {};
          if (dateRange.from) orderWhere.createdAt.gte = dateRange.from;
          if (dateRange.to) orderWhere.createdAt.lte = dateRange.to;
        }

        const orders = await this.prisma.order.findMany({
          where: orderWhere,
          select: {
            id: true,
            createdAt: true,
            customer: true,
            phone: true,
            address: true,
            status: true,
            paymentMethod: true,
            subtotal: true,
            deliveryFee: true,
            discount: true,
            total: true
          },
          orderBy: { createdAt: 'desc' }
        });

        if (format === 'json') {
          return {
            filename: `orders-report-${merchantId}-${filenameDate}.json`,
            contentType: 'application/json',
            data: { merchantId, dateRange: analytics.dateRange, orders }
          };
        }

        const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Address', 'Status', 'Payment Method', 'Subtotal', 'Delivery Fee', 'Discount', 'Total (ZAR)'];
        const rows = orders.map(o => [
          o.id,
          o.createdAt ? o.createdAt.toISOString() : '',
          o.customer,
          o.phone,
          o.address,
          o.status,
          o.paymentMethod,
          (o.subtotal || 0).toFixed(2),
          (o.deliveryFee || 0).toFixed(2),
          (o.discount || 0).toFixed(2),
          (o.total || 0).toFixed(2)
        ]);

        return {
          filename: `orders-report-${merchantId}-${filenameDate}.csv`,
          contentType: 'text/csv; charset=utf-8',
          data: this.formatCsv(headers, rows)
        };
      }

      // Default: sales-summary
      const headers = ['Period', 'Orders Count', 'Gross Revenue (ZAR)', 'Avg Order Value (ZAR)'];
      const rows = (analytics.salesBreakdown.daily.length > 0 ? analytics.salesBreakdown.daily : analytics.salesBreakdown.monthly).map(item => [
        item.date || item.month || item.year,
        item.orders,
        item.revenue.toFixed(2),
        item.orders > 0 ? (item.revenue / item.orders).toFixed(2) : '0.00'
      ]);

      if (format === 'json') {
        return {
          filename: `sales-summary-${merchantId}-${filenameDate}.json`,
          contentType: 'application/json',
          data: { merchantId, summary: analytics.summary, salesBreakdown: analytics.salesBreakdown }
        };
      }

      return {
        filename: `sales-summary-${merchantId}-${filenameDate}.csv`,
        contentType: 'text/csv; charset=utf-8',
        data: this.formatCsv(headers, rows)
      };
    }

    // Admin scope
    const adminAnalytics = await this.getAdminAnalytics({ period, startDate, endDate, limit: 100 });

    if (type === 'businesses') {
      const headers = ['Rank', 'Business ID', 'Business Name', 'Category', 'Suburb', 'Order Count', 'Total Revenue (ZAR)', 'Platform Share (%)'];
      const rows = adminAnalytics.topBusinesses.map(b => [
        b.rank,
        b.id,
        b.name,
        b.category,
        b.suburb,
        b.orderCount,
        b.totalRevenue.toFixed(2),
        b.shareOfRevenue.toFixed(1)
      ]);

      if (format === 'json') {
        return {
          filename: `platform-merchants-${filenameDate}.json`,
          contentType: 'application/json',
          data: { topBusinesses: adminAnalytics.topBusinesses }
        };
      }

      return {
        filename: `platform-merchants-${filenameDate}.csv`,
        contentType: 'text/csv; charset=utf-8',
        data: this.formatCsv(headers, rows)
      };
    }

    if (type === 'platform-overview' || type === 'sales-summary') {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Total Platform Revenue (ZAR)', adminAnalytics.summary.totalRevenue.toFixed(2)],
        ['Total Orders', adminAnalytics.summary.totalOrders],
        ['Total Bookings', adminAnalytics.summary.totalBookings],
        ['Total Users Registered', adminAnalytics.summary.totalUsers],
        ['Total Merchants', adminAnalytics.summary.totalBusinesses],
        ['Total Categories', adminAnalytics.summary.totalCategories],
        ['Average Order Value (ZAR)', adminAnalytics.summary.averageOrderValue.toFixed(2)],
        ['Revenue Growth (%)', `${adminAnalytics.growth.revenueGrowthPercent}%`],
        ['Orders Growth (%)', `${adminAnalytics.growth.ordersGrowthPercent}%`]
      ];

      if (format === 'json') {
        return {
          filename: `platform-overview-${filenameDate}.json`,
          contentType: 'application/json',
          data: adminAnalytics
        };
      }

      return {
        filename: `platform-overview-${filenameDate}.csv`,
        contentType: 'text/csv; charset=utf-8',
        data: this.formatCsv(headers, rows)
      };
    }

    throw new Error(`Unsupported export report type: ${type}`);
  }
}

export const analyticsService = new AnalyticsService();
