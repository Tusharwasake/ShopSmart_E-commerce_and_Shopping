// dashboardController.js
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { user } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Review } from "../models/Review.js";
import { InventoryHistory } from "../models/InventoryHistory.js";
import { SystemSettings } from "../models/SystemSettings.js";
import { AdminNotification } from "../models/AdminNotification.js";
import { AuditLog } from "../models/AuditLog.js";
import mongoose from "mongoose";

// Get dashboard summary with key metrics
const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfYesterday = new Date(today);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    // Sales metrics
    const todaySales = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfToday }, status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
    ]);
    
    const yesterdaySales = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfYesterday, $lt: startOfToday },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
    ]);
    
    const monthSales = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
    ]);
    
    const lastMonthSales = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
    ]);
    
    // Customer metrics
    const totalCustomers = await user.countDocuments();
    
    const newCustomersToday = await user.countDocuments({
      createdAt: { $gte: startOfToday }
    });
    
    const newCustomersMonth = await user.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    const newCustomersLastMonth = await user.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
    });
    
    // Inventory metrics
    const lowStockProducts = await Product.countDocuments({
      stock: { $lte: 10, $gt: 0 }
    });
    
    const outOfStockProducts = await Product.countDocuments({
      stock: 0
    });
    
    // Order metrics
    const pendingOrders = await Order.countDocuments({
      status: 'pending'
    });
    
    const processingOrders = await Order.countDocuments({
      status: 'processing'
    });
    
    const shippedOrders = await Order.countDocuments({
      status: 'shipped'
    });
    
    // Notifications
    const unresolvedReports = await Review.countDocuments({
      isReported: true
    });
    
    const unreadNotifications = await AdminNotification.countDocuments({
      read: false
    });
    
    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (!previous) return 100;
      return ((current - previous) / previous) * 100;
    };
    
    const revenue = {
      today: todaySales.length > 0 ? todaySales[0].total : 0,
      yesterday: yesterdaySales.length > 0 ? yesterdaySales[0].total : 0,
      month: monthSales.length > 0 ? monthSales[0].total : 0,
      lastMonth: lastMonthSales.length > 0 ? lastMonthSales[0].total : 0,
      change: calculateChange(
        monthSales.length > 0 ? monthSales[0].total : 0,
        lastMonthSales.length > 0 ? lastMonthSales[0].total : 0
      )
    };
    
    const orders = {
      today: todaySales.length > 0 ? todaySales[0].count : 0,
      yesterday: yesterdaySales.length > 0 ? yesterdaySales[0].count : 0,
      month: monthSales.length > 0 ? monthSales[0].count : 0,
      lastMonth: lastMonthSales.length > 0 ? lastMonthSales[0].count : 0,
      change: calculateChange(
        monthSales.length > 0 ? monthSales[0].count : 0,
        lastMonthSales.length > 0 ? lastMonthSales[0].count : 0
      ),
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders
    };
    
    const customers = {
      total: totalCustomers,
      newToday: newCustomersToday,
      newMonth: newCustomersMonth,
      change: calculateChange(newCustomersMonth, newCustomersLastMonth)
    };
    
    const inventory = {
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts
    };
    
    res.status(200).json({
      message: "Dashboard summary fetched successfully",
      summary: {
        revenue,
        orders,
        customers,
        inventory,
        alerts: {
          unresolvedReports,
          unreadNotifications
        }
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error.message);
    res.status(500).json({ message: "Error fetching dashboard summary" });
  }
};

// Get recent orders for dashboard
const getRecentOrders = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'username email');
    
    // Format orders for display
    const formattedOrders = recentOrders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      customer: order.userId ? {
        id: order.userId._id,
        name: order.userId.username,
        email: order.userId.email
      } : {
        name: order.shippingAddress.firstName + ' ' + order.shippingAddress.lastName,
        email: order.shippingAddress.email || 'Guest Customer'
      },
      total: order.total,
      status: order.status,
      items: order.items.length,
      date: order.createdAt
    }));
    
    res.status(200).json({
      message: "Recent orders fetched successfully",
      orders: formattedOrders
    });
  } catch (error) {
    console.error("Error fetching recent orders:", error.message);
    res.status(500).json({ message: "Error fetching recent orders" });
  }
};

// Get top selling products
const getTopProducts = async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    
    // Determine date range based on period
    const today = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    // Aggregate order items to find top products
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          name: { $first: '$items.name' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    // Get product details
    const productIds = topProducts.map(p => p._id);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('title category images');
    
    // Merge aggregation results with product details
    const formattedProducts = topProducts.map(p => {
      const productDetails = products.find(prod => prod._id.toString() === p._id.toString());
      
      return {
        id: p._id,
        title: productDetails ? productDetails.title : p.name,
        totalSold: p.totalSold,
        revenue: p.revenue,
        category: productDetails ? productDetails.category : null,
        image: productDetails && productDetails.images && productDetails.images.length > 0 
          ? productDetails.images[0] 
          : null
      };
    });
    
    res.status(200).json({
      message: "Top products fetched successfully",
      period,
      products: formattedProducts
    });
  } catch (error) {
    console.error("Error fetching top products:", error.message);
    res.status(500).json({ message: "Error fetching top products" });
  }
};

// Get sales statistics
const getSalesStatistics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Determine date range based on period
    const today = new Date();
    let startDate, groupBy, dateFormat;
    
    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        groupBy = { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" } };
        dateFormat = "%m-%d";
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        groupBy = { day: { $dayOfMonth: "$createdAt" } };
        dateFormat = "%d";
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        groupBy = { month: { $month: "$createdAt" } };
        dateFormat = "%m";
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        groupBy = { day: { $dayOfMonth: "$createdAt" } };
        dateFormat = "%d";
    }
    
    // Get daily sales data
    const salesByDate = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          date: { $first: "$createdAt" }
        }
      },
      {
        $addFields: {
          dateStr: { $dateToString: { format: dateFormat, date: "$date" } }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    // Get sales by payment method
    const salesByPayment = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: "$paymentMethod",
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      }
    ]);
    
    // Get sales by status
    const salesByStatus = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      }
    ]);
    
    // Calculate average order value
    const aov = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $project: {
          aov: { $divide: ["$totalRevenue", "$totalOrders"] }
        }
      }
    ]);
    
    // Format data for response
    const formattedSalesByDate = salesByDate.map(item => ({
      date: item.dateStr,
      revenue: item.revenue,
      orders: item.orders
    }));
    
    res.status(200).json({
      message: "Sales statistics fetched successfully",
      period,
      averageOrderValue: aov.length > 0 ? aov[0].aov : 0,
      salesByDate: formattedSalesByDate,
      salesByPayment,
      salesByStatus
    });
  } catch (error) {
    console.error("Error fetching sales statistics:", error.message);
    res.status(500).json({ message: "Error fetching sales statistics" });
  }
};

// Get customer statistics
const getCustomerStatistics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Determine date range based on period
    const today = new Date();
    let startDate, groupBy, dateFormat;
    
    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        groupBy = { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" } };
        dateFormat = "%m-%d";
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        groupBy = { day: { $dayOfMonth: "$createdAt" } };
        dateFormat = "%d";
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        groupBy = { month: { $month: "$createdAt" } };
        dateFormat = "%m";
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        groupBy = { day: { $dayOfMonth: "$createdAt" } };
        dateFormat = "%d";
    }
    
    // Get new customers over time
    const newCustomersByDate = await user.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          date: { $first: "$createdAt" }
        }
      },
      {
        $addFields: {
          dateStr: { $dateToString: { format: dateFormat, date: "$date" } }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    // Get top customers by order value
    const topCustomers = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId",
          totalSpent: { $sum: "$total" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);
    
    // Get user details for top customers
    const userIds = topCustomers.map(c => c._id);
    const userDetails = await user.find({ _id: { $in: userIds } })
      .select('username email');
    
    // Merge user details with spending data
    const formattedTopCustomers = topCustomers.map(c => {
      const userDetail = userDetails.find(u => u._id.toString() === c._id.toString());
      
      return {
        id: c._id,
        username: userDetail ? userDetail.username : 'Unknown User',
        email: userDetail ? userDetail.email : '',
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        averageOrderValue: c.totalSpent / c.orderCount
      };
    });
    
    // Get customer retention metrics
    const repeatCustomers = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 }
        }
      },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: "count" }
    ]);
    
    const oneTimeCustomers = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 }
        }
      },
      { $match: { orderCount: 1 } },
      { $count: "count" }
    ]);
    
    const totalCustomersWithOrders = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId"
        }
      },
      { $count: "count" }
    ]);
    
    // Format data for response
    const formattedNewCustomers = newCustomersByDate.map(item => ({
      date: item.dateStr,
      count: item.count
    }));
    
    const repeatCustomerCount = repeatCustomers.length > 0 ? repeatCustomers[0].count : 0;
    const oneTimeCustomerCount = oneTimeCustomers.length > 0 ? oneTimeCustomers[0].count : 0;
    const totalCustomerCount = totalCustomersWithOrders.length > 0 ? totalCustomersWithOrders[0].count : 0;
    
    const retentionRate = totalCustomerCount > 0 
      ? (repeatCustomerCount / totalCustomerCount) * 100 
      : 0;
    
    res.status(200).json({
      message: "Customer statistics fetched successfully",
      period,
      newCustomers: formattedNewCustomers,
      topCustomers: formattedTopCustomers,
      retention: {
        repeatCustomers: repeatCustomerCount,
        oneTimeCustomers: oneTimeCustomerCount,
        totalCustomers: totalCustomerCount,
        retentionRate: parseFloat(retentionRate.toFixed(2))
      }
    });
  } catch (error) {
    console.error("Error fetching customer statistics:", error.message);
    res.status(500).json({ message: "Error fetching customer statistics" });
  }
};

// Get inventory summary
const getInventorySummary = async (req, res) => {
  try {
    // Get inventory value
    const inventoryValue = await Product.aggregate([
      {
        $project: {
          totalValue: { $multiply: ["$stock", "$price"] },
          category: 1
        }
      },
      {
        $group: {
          _id: null,
          value: { $sum: "$totalValue" }
        }
      }
    ]);
    
    // Get inventory value by category
    const inventoryByCategory = await Product.aggregate([
      {
        $project: {
          totalValue: { $multiply: ["$stock", "$price"] },
          category: 1
        }
      },
      {
        $group: {
          _id: "$category",
          value: { $sum: "$totalValue" },
          itemCount: { $sum: 1 }
        }
      },
      { $sort: { value: -1 } }
    ]);
    
    // Get low stock products
    const lowStockThreshold = 10;
    const lowStockProducts = await Product.find({
      stock: { $lte: lowStockThreshold, $gt: 0 }
    })
    .sort({ stock: 1 })
    .limit(10)
    .select('title sku stock price category');
    
    // Get recent inventory changes
    const recentChanges = await InventoryHistory.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('productId', 'title sku')
      .populate('userId', 'username');
    
    // Get inventory movement stats
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const inventoryMovement = await InventoryHistory.aggregate([
      { $match: { timestamp: { $gte: startOfMonth } } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalQuantity: { $sum: { $subtract: ["$newStock", "$previousStock"] } }
        }
      }
    ]);
    
    // Format data for response
    const formattedLowStock = lowStockProducts.map(product => ({
      id: product._id,
      title: product.title,
      sku: product.sku,
      stock: product.stock,
      price: product.price,
      value: product.stock * product.price,
      category: product.category
    }));
    
    const formattedChanges = recentChanges.map(change => ({
      id: change._id,
      product: change.productId ? {
        id: change.productId._id,
        title: change.productId.title,
        sku: change.productId.sku
      } : null,
      type: change.type,
      previousStock: change.previousStock,
      newStock: change.newStock,
      change: change.newStock - change.previousStock,
      reason: change.reason,
      user: change.userId ? {
        id: change.userId._id,
        username: change.userId.username
      } : null,
      timestamp: change.timestamp
    }));
    
    const movement = {
      increases: inventoryMovement.find(m => m._id === 'increase') || { count: 0, totalQuantity: 0 },
      decreases: inventoryMovement.find(m => m._id === 'decrease') || { count: 0, totalQuantity: 0 }
    };
    
    res.status(200).json({
      message: "Inventory summary fetched successfully",
      inventoryValue: inventoryValue.length > 0 ? inventoryValue[0].value : 0,
      lowStockThreshold,
      lowStockCount: formattedLowStock.length,
      inventoryByCategory,
      lowStockProducts: formattedLowStock,
      recentChanges: formattedChanges,
      movement
    });
  } catch (error) {
    console.error("Error fetching inventory summary:", error.message);
    res.status(500).json({ message: "Error fetching inventory summary" });
  }
};

// Get revenue chart data
const getRevenueChart = async (req, res) => {
  try {
    const { period = 'month', compare = 'false' } = req.query;
    
    // Determine date ranges based on period
    const today = new Date();
    let currentStartDate, previousStartDate, previousEndDate, groupBy, dateFormat;
    
    switch (period) {
      case 'week':
        currentStartDate = new Date(today);
        currentStartDate.setDate(currentStartDate.getDate() - 7);
        
        previousStartDate = new Date(currentStartDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        
        previousEndDate = new Date(currentStartDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        
        groupBy = { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" } };
        dateFormat = "%m-%d";
        break;
      case 'month':
        currentStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        previousStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        previousEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        
        groupBy = { day: { $dayOfMonth: "$createdAt" } };
        dateFormat = "%d";
        break;
      case 'year':
        currentStartDate = new Date(today.getFullYear(), 0, 1);
        
        previousStartDate = new Date(today.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(today.getFullYear() - 1, 11, 31);
        
        groupBy = { month: { $month: "$createdAt" } };
        dateFormat = "%m";
        break;
      default:
        currentStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        previousStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        previousEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        
        groupBy = { day: { $dayOfMonth: "$createdAt" } };
        dateFormat = "%d";
    }
    
    // Get current period revenue data
    const currentPeriodData = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: currentStartDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          date: { $first: "$createdAt" }
        }
      },
      {
        $addFields: {
          dateStr: { $dateToString: { format: dateFormat, date: "$date" } }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    // Format current period data
    const formattedCurrentPeriod = currentPeriodData.map(item => ({
      date: item.dateStr,
      revenue: item.revenue,
      orders: item.orders
    }));
    
    // Get comparison data if requested
    let formattedPreviousPeriod = [];
    
    if (compare === 'true') {
      const previousPeriodData = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: previousStartDate, $lte: previousEndDate },
            status: { $nin: ['cancelled', 'refunded'] }
          }
        },
        {
          $group: {
            _id: groupBy,
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
            date: { $first: "$createdAt" }
          }
        },
        {
          $addFields: {
            dateStr: { $dateToString: { format: dateFormat, date: "$date" } }
          }
        },
        { $sort: { date: 1 } }
      ]);
      
      formattedPreviousPeriod = previousPeriodData.map(item => ({
        date: item.dateStr,
        revenue: item.revenue,
        orders: item.orders
      }));
    }
    
    // Calculate totals

   const currentTotal = formattedCurrentPeriod.reduce((sum, item) => sum + item.revenue, 0);
   const previousTotal = formattedPreviousPeriod.reduce((sum, item) => sum + item.revenue, 0);
   
   // Calculate percentage change
   const percentageChange = previousTotal > 0 
     ? ((currentTotal - previousTotal) / previousTotal) * 100 
     : 100;
   
   res.status(200).json({
     message: "Revenue chart data fetched successfully",
     period,
     currentPeriod: {
       data: formattedCurrentPeriod,
       total: currentTotal
     },
     previousPeriod: compare === 'true' ? {
       data: formattedPreviousPeriod,
       total: previousTotal
     } : null,
     comparison: compare === 'true' ? {
       percentageChange: parseFloat(percentageChange.toFixed(2)),
       absoluteChange: currentTotal - previousTotal
     } : null
   });
 } catch (error) {
   console.error("Error fetching revenue chart data:", error.message);
   res.status(500).json({ message: "Error fetching revenue chart data" });
 }
};

// Get system settings
const getSystemSettings = async (req, res) => {
 try {
   // Get settings or create default
   let settings = await SystemSettings.findOne();
   
   if (!settings) {
     settings = await SystemSettings.create({
       storeName: "My E-Commerce Store",
       contactEmail: "contact@example.com",
       currency: "USD",
       taxRate: 10,
       shippingOptions: [
         { name: "Standard Shipping", price: 5.99, estimatedDays: 5 },
         { name: "Express Shipping", price: 15.99, estimatedDays: 2 }
       ],
       lowStockThreshold: 10,
       allowGuestCheckout: true,
       enableReviews: true,
       requireReviewApproval: true,
       enableWishlist: true,
       createdAt: new Date(),
       updatedAt: new Date()
     });
   }
   
   res.status(200).json({
     message: "System settings fetched successfully",
     settings
   });
 } catch (error) {
   console.error("Error fetching system settings:", error.message);
   res.status(500).json({ message: "Error fetching system settings" });
 }
};

// Update system settings
const updateSystemSettings = async (req, res) => {
 try {
   const {
     storeName,
     contactEmail,
     currency,
     taxRate,
     shippingOptions,
     lowStockThreshold,
     allowGuestCheckout,
     enableReviews,
     requireReviewApproval,
     enableWishlist
   } = req.body;
   
   // Validate required fields
   if (!storeName || !contactEmail) {
     return res.status(400).json({
       message: "Store name and contact email are required"
     });
   }
   
   // Get existing settings or create new
   let settings = await SystemSettings.findOne();
   
   if (!settings) {
     settings = new SystemSettings({
       createdAt: new Date()
     });
   }
   
   // Update settings
   settings.storeName = storeName;
   settings.contactEmail = contactEmail;
   settings.currency = currency || settings.currency;
   settings.taxRate = taxRate !== undefined ? taxRate : settings.taxRate;
   settings.shippingOptions = shippingOptions || settings.shippingOptions;
   settings.lowStockThreshold = lowStockThreshold !== undefined ? lowStockThreshold : settings.lowStockThreshold;
   settings.allowGuestCheckout = allowGuestCheckout !== undefined ? allowGuestCheckout : settings.allowGuestCheckout;
   settings.enableReviews = enableReviews !== undefined ? enableReviews : settings.enableReviews;
   settings.requireReviewApproval = requireReviewApproval !== undefined ? requireReviewApproval : settings.requireReviewApproval;
   settings.enableWishlist = enableWishlist !== undefined ? enableWishlist : settings.enableWishlist;
   settings.updatedAt = new Date();
   
   await settings.save();
   
   // Log the settings update
   await AuditLog.create({
     action: 'settings_update',
     userId: req.user.userId,
     details: { 
       changes: req.body,
       settingsId: settings._id
     },
     timestamp: new Date()
   });
   
   res.status(200).json({
     message: "System settings updated successfully",
     settings
   });
 } catch (error) {
   console.error("Error updating system settings:", error.message);
   res.status(500).json({ message: "Error updating system settings" });
 }
};

// Get admin notifications
const getNotifications = async (req, res) => {
 try {
   const { page = 1, limit = 20, unreadOnly = "false" } = req.query;
   
   // Build query
   const query = {};
   if (unreadOnly === "true") {
     query.read = false;
   }
   
   // Pagination
   const skip = (parseInt(page) - 1) * parseInt(limit);
   
   // Get notifications
   const notifications = await AdminNotification.find(query)
     .sort({ createdAt: -1 })
     .skip(skip)
     .limit(parseInt(limit));
   
   const total = await AdminNotification.countDocuments(query);
   const unreadCount = await AdminNotification.countDocuments({ read: false });
   
   res.status(200).json({
     message: "Notifications fetched successfully",
     notifications,
     pagination: {
       total,
       page: parseInt(page),
       limit: parseInt(limit),
       pages: Math.ceil(total / parseInt(limit))
     },
     unreadCount
   });
 } catch (error) {
   console.error("Error fetching notifications:", error.message);
   res.status(500).json({ message: "Error fetching notifications" });
 }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
 try {
   const { id } = req.params;
   
   const notification = await AdminNotification.findById(id);
   
   if (!notification) {
     return res.status(404).json({ message: "Notification not found" });
   }
   
   notification.read = true;
   await notification.save();
   
   res.status(200).json({
     message: "Notification marked as read",
     notificationId: id
   });
 } catch (error) {
   console.error("Error marking notification as read:", error.message);
   res.status(500).json({ message: "Error marking notification as read" });
 }
};

// Get audit log
const getAuditLog = async (req, res) => {
 try {
   const { 
     action, 
     userId,
     startDate,
     endDate,
     page = 1,
     limit = 20
   } = req.query;
   
   // Build query
   const query = {};
   
   if (action) {
     query.action = action;
   }
   
   if (userId) {
     query.userId = userId;
   }
   
   // Add date range if provided
   if (startDate || endDate) {
     query.timestamp = {};
     
     if (startDate) {
       query.timestamp.$gte = new Date(startDate);
     }
     
     if (endDate) {
       const endDateTime = new Date(endDate);
       endDateTime.setHours(23, 59, 59, 999);
       query.timestamp.$lte = endDateTime;
     }
   }
   
   // Pagination
   const skip = (parseInt(page) - 1) * parseInt(limit);
   
   // Get audit logs
   const logs = await AuditLog.find(query)
     .sort({ timestamp: -1 })
     .skip(skip)
     .limit(parseInt(limit))
     .populate('userId', 'username email');
   
   const total = await AuditLog.countDocuments(query);
   
   // Get available action types for filtering
   const actionTypes = await AuditLog.distinct('action');
   
   res.status(200).json({
     message: "Audit logs fetched successfully",
     logs: logs.map(log => ({
       id: log._id,
       action: log.action,
       user: log.userId ? {
         id: log.userId._id,
         username: log.userId.username,
         email: log.userId.email
       } : null,
       details: log.details,
       ipAddress: log.ipAddress,
       userAgent: log.userAgent,
       timestamp: log.timestamp
     })),
     pagination: {
       total,
       page: parseInt(page),
       limit: parseInt(limit),
       pages: Math.ceil(total / parseInt(limit))
     },
     actionTypes
   });
 } catch (error) {
   console.error("Error fetching audit logs:", error.message);
   res.status(500).json({ message: "Error fetching audit logs" });
 }
};

export {
 getDashboardSummary,
 getRecentOrders,
 getTopProducts,
 getSalesStatistics,
 getCustomerStatistics,
 getInventorySummary,
 getRevenueChart,
 getSystemSettings,
 updateSystemSettings,
 getNotifications,
 markNotificationAsRead,
 getAuditLog
};