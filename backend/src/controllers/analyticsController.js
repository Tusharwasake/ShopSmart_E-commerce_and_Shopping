// analyticsController.js
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { user } from "../models/User.js";
import { Category } from "../models/Category.js";
import { SearchQuery } from "../models/SearchQuery.js";
import { CouponUsage } from "../models/CouponUsage.js";
import { Transaction } from "../models/Transaction.js";
import { Review } from "../models/Review.js";
import mongoose from "mongoose";

// Helper function to parse date range from query parameters
const parseDateRange = (req) => {
  const { startDate, endDate, period = "month" } = req.query;

  let start, end;

  // Use provided dates or defaults
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of the day
  } else {
    end = new Date(); // Today

    // Set default start date based on period
    start = new Date();
    switch (period) {
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "month":
      default:
        start.setMonth(start.getMonth() - 1);
        break;
    }
  }

  return { startDate: start, endDate: end };
};

// Get sales analytics
const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const { interval = "day" } = req.query;

    // Define date grouping based on interval
    let dateGroup;
    switch (interval) {
      case "hour":
        dateGroup = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          hour: { $hour: "$createdAt" },
        };
        break;
      case "week":
        dateGroup = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        };
        break;
      case "month":
        dateGroup = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
        break;
      case "day":
      default:
        dateGroup = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
        break;
    }

    // Get sales data by date
    const salesByDate = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: dateGroup,
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
          tax: { $sum: "$tax" },
          shipping: { $sum: "$shippingCost" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);

    // Format sales data for response
    const formattedSalesData = salesByDate.map((item) => {
      let date;

      if (interval === "hour") {
        date = new Date(
          item._id.year,
          item._id.month - 1,
          item._id.day,
          item._id.hour
        );
      } else if (interval === "week") {
        // Create date from year and week number
        const firstDayOfYear = new Date(item._id.year, 0, 1);
        date = new Date(firstDayOfYear);
        date.setDate(firstDayOfYear.getDate() + item._id.week * 7);
      } else if (interval === "month") {
        date = new Date(item._id.year, item._id.month - 1, 1);
      } else {
        date = new Date(item._id.year, item._id.month - 1, item._id.day);
      }

      return {
        date: date.toISOString().split("T")[0],
        orders: item.orders,
        revenue: parseFloat(item.revenue.toFixed(2)),
        tax: parseFloat(item.tax.toFixed(2)),
        shipping: parseFloat(item.shipping.toFixed(2)),
      };
    });

    // Get sales by payment method
    const salesByPaymentMethod = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Get sales by status
    const salesByStatus = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$status",
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Get average order value trend
    const aovTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: dateGroup,
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      {
        $project: {
          date: "$_id",
          aov: { $divide: ["$revenue", "$orders"] },
        },
      },
      { $sort: { "date.year": 1, "date.month": 1, "date.day": 1 } },
    ]);

    // Format AOV trend
    const formattedAovTrend = aovTrend.map((item) => {
      let date;

      if (interval === "hour") {
        date = new Date(
          item.date.year,
          item.date.month - 1,
          item.date.day,
          item.date.hour
        );
      } else if (interval === "week") {
        const firstDayOfYear = new Date(item.date.year, 0, 1);
        date = new Date(firstDayOfYear);
        date.setDate(firstDayOfYear.getDate() + item.date.week * 7);
      } else if (interval === "month") {
        date = new Date(item.date.year, item.date.month - 1, 1);
      } else {
        date = new Date(item.date.year, item.date.month - 1, item.date.day);
      }

      return {
        date: date.toISOString().split("T")[0],
        aov: parseFloat(item.aov.toFixed(2)),
      };
    });

    // Calculate overall metrics
    const overallMetrics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          totalTax: { $sum: "$tax" },
          totalShipping: { $sum: "$shippingCost" },
          averageOrderValue: { $avg: "$total" },
        },
      },
    ]);

    // Get metrics for comparison (previous period)
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(endDate);
    const timeSpan = endDate - startDate;

    previousPeriodStart.setTime(previousPeriodStart.getTime() - timeSpan);
    previousPeriodEnd.setTime(previousPeriodEnd.getTime() - timeSpan);

    const previousMetrics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    // Calculate growth rates
    const currentMetrics =
      overallMetrics.length > 0
        ? overallMetrics[0]
        : {
            totalOrders: 0,
            totalRevenue: 0,
            totalTax: 0,
            totalShipping: 0,
            averageOrderValue: 0,
          };

    const prevMetrics =
      previousMetrics.length > 0
        ? previousMetrics[0]
        : {
            totalOrders: 0,
            totalRevenue: 0,
          };

    const orderGrowth =
      prevMetrics.totalOrders > 0
        ? ((currentMetrics.totalOrders - prevMetrics.totalOrders) /
            prevMetrics.totalOrders) *
          100
        : null;

    const revenueGrowth =
      prevMetrics.totalRevenue > 0
        ? ((currentMetrics.totalRevenue - prevMetrics.totalRevenue) /
            prevMetrics.totalRevenue) *
          100
        : null;

    res.status(200).json({
      message: "Sales analytics fetched successfully",
      period: {
        start: startDate,
        end: endDate,
        interval,
      },
      overview: {
        totalOrders: currentMetrics.totalOrders,
        totalRevenue: parseFloat(currentMetrics.totalRevenue.toFixed(2)),
        totalTax: parseFloat(currentMetrics.totalTax.toFixed(2)),
        totalShipping: parseFloat(currentMetrics.totalShipping.toFixed(2)),
        averageOrderValue: parseFloat(
          currentMetrics.averageOrderValue?.toFixed(2) || "0"
        ),
        orderGrowth:
          orderGrowth !== null ? parseFloat(orderGrowth.toFixed(2)) : null,
        revenueGrowth:
          revenueGrowth !== null ? parseFloat(revenueGrowth.toFixed(2)) : null,
      },
      salesByDate: formattedSalesData,
      salesByPaymentMethod,
      salesByStatus,
      aovTrend: formattedAovTrend,
    });
  } catch (error) {
    console.error("Error fetching sales analytics:", error.message);
    res.status(500).json({ message: "Error fetching sales analytics" });
  }
};

// Get product performance analytics
const getProductAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 },
    ]);

    // Get product categories performance
    const categoryPerformance = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.category",
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          orders: { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          category: "$_id",
          quantitySold: 1,
          revenue: 1,
          orderCount: { $size: "$orders" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Get inventory analytics
    const inventoryAnalytics = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          lowStockProducts: {
            $sum: {
              $cond: [{ $lte: ["$stock", 5] }, 1, 0],
            },
          },
          outOfStockProducts: {
            $sum: {
              $cond: [{ $eq: ["$stock", 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Get product rating distribution
    const ratingDistribution = await Product.aggregate([
      {
        $group: {
          _id: { $round: ["$rating"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // Format rating distribution
    const formattedRatingDistribution = [0, 1, 2, 3, 4, 5].map((rating) => {
      const found = ratingDistribution.find((item) => item._id === rating);
      return {
        rating,
        count: found ? found.count : 0,
      };
    });

    // Get recently added products
    const newProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title price images stock category createdAt");

    // Get low stock products
    const lowStockProducts = await Product.find({ stock: { $lte: 5, $gt: 0 } })
      .sort({ stock: 1 })
      .limit(10)
      .select("title price images stock category");

    res.status(200).json({
      message: "Product analytics fetched successfully",
      period: {
        start: startDate,
        end: endDate,
      },
      overview: {
        ...inventoryAnalytics[0],
      },
      topProducts,
      categoryPerformance,
      ratingDistribution: formattedRatingDistribution,
      newProducts,
      lowStockProducts,
    });
  } catch (error) {
    console.error("Error fetching product analytics:", error.message);
    res.status(500).json({ message: "Error fetching product analytics" });
  }
};

// Get customer analytics
const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);

    // Get customer acquisition over time
    const newCustomers = await user.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format customer acquisition data
    const formattedNewCustomers = newCustomers.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      return {
        date: date.toISOString().split("T")[0],
        count: item.count,
      };
    });

    // Get top customers by order value
    const topCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
          userId: { $ne: null }, // Exclude guest orders
        },
      },
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          userId: "$_id",
          username: "$userDetails.username",
          email: "$userDetails.email",
          orderCount: 1,
          totalSpent: 1,
          lastOrderDate: 1,
          averageOrderValue: { $divide: ["$totalSpent", "$orderCount"] },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);

    // Customer retention analysis
    // Get first-time vs. returning customers ratio
    const customerOrderGroups = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
          userId: { $ne: null }, // Exclude guest orders
        },
      },
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          firstOrderDate: { $min: "$createdAt" },
        },
      },
      {
        $project: {
          userId: "$_id",
          orderCount: 1,
          totalSpent: 1,
          firstOrderDate: 1,
          isFirstTimeInPeriod: {
            $and: [
              { $gte: ["$firstOrderDate", startDate] },
              { $lte: ["$firstOrderDate", endDate] },
            ],
          },
        },
      },
    ]);

    // Calculate first-time vs. returning customers
    const firstTimeCustomers = customerOrderGroups.filter(
      (customer) => customer.isFirstTimeInPeriod
    ).length;
    const returningCustomers = customerOrderGroups.filter(
      (customer) => !customer.isFirstTimeInPeriod
    ).length;

    // Calculate customer lifetime value (CLV)
    const customerLifetimeValue = await Order.aggregate([
      {
        $match: {
          status: { $nin: ["cancelled", "refunded"] },
          userId: { $ne: null }, // Exclude guest orders
        },
      },
      {
        $group: {
          _id: "$userId",
          totalSpent: { $sum: "$total" },
          orderCount: { $sum: 1 },
          firstOrderDate: { $min: "$createdAt" },
        },
      },
      {
        $project: {
          userId: "$_id",
          totalSpent: 1,
          orderCount: 1,
          firstOrderDate: 1,
          daysActive: {
            $divide: [
              { $subtract: [new Date(), "$firstOrderDate"] },
              86400000, // ms in a day
            ],
          },
        },
      },
      {
        $project: {
          totalSpent: 1,
          orderCount: 1,
          daysActive: 1,
          // Daily CLV = Total Spent / Days Active
          dailyCLV: {
            $cond: [
              { $gt: ["$daysActive", 0] },
              { $divide: ["$totalSpent", "$daysActive"] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageTotalSpent: { $avg: "$totalSpent" },
          averageOrderCount: { $avg: "$orderCount" },
          averageDaysActive: { $avg: "$daysActive" },
          averageDailyCLV: { $avg: "$dailyCLV" },
        },
      },
    ]);

    // Customer registration statistics
    const registrationStats = await user.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          averageRegistrationsPerDay: {
            $avg: {
              $cond: [{ $gte: ["$createdAt", startDate] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Get guest vs. registered user orders
    const orderTypeStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$userId", null] }, "guest", "registered"] },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
    ]);

    // Format order type stats
    const formattedOrderTypeStats = {
      guest: {
        orderCount: 0,
        totalSpent: 0,
      },
      registered: {
        orderCount: 0,
        totalSpent: 0,
      },
    };

    orderTypeStats.forEach((stat) => {
      formattedOrderTypeStats[stat._id] = {
        orderCount: stat.orderCount,
        totalSpent: parseFloat(stat.totalSpent.toFixed(2)),
      };
    });

    res.status(200).json({
      message: "Customer analytics fetched successfully",
      period: {
        start: startDate,
        end: endDate,
      },
      overview: {
        totalCustomers: registrationStats[0]?.totalUsers || 0,
        newCustomers: firstTimeCustomers,
        returningCustomers: returningCustomers,
        registeredVsGuest: formattedOrderTypeStats,
      },
      customerAcquisition: formattedNewCustomers,
      topCustomers,
      retention: {
        firstTimeRatio:
          firstTimeCustomers / (firstTimeCustomers + returningCustomers) || 0,
        returningRatio:
          returningCustomers / (firstTimeCustomers + returningCustomers) || 0,
      },
      lifetime:
        customerLifetimeValue.length > 0
          ? {
              averageValue: parseFloat(
                customerLifetimeValue[0].averageTotalSpent.toFixed(2)
              ),
              averageOrderCount: parseFloat(
                customerLifetimeValue[0].averageOrderCount.toFixed(2)
              ),
              dailyValue: parseFloat(
                customerLifetimeValue[0].averageDailyCLV.toFixed(2)
              ),
              yearlyValue: parseFloat(
                (customerLifetimeValue[0].averageDailyCLV * 365).toFixed(2)
              ),
            }
          : {
              averageValue: 0,
              averageOrderCount: 0,
              dailyValue: 0,
              yearlyValue: 0,
            },
    });
  } catch (error) {
    console.error("Error fetching customer analytics:", error.message);
    res.status(500).json({ message: "Error fetching customer analytics" });
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (req, res) => {
  try {
    // Get overall inventory statistics
    const inventoryStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
          avgStock: { $avg: "$stock" },
          lowStockProducts: {
            $sum: {
              $cond: [
                { $and: [{ $lte: ["$stock", 5] }, { $gt: ["$stock", 0] }] },
                1,
                0,
              ],
            },
          },
          outOfStockProducts: {
            $sum: {
              $cond: [{ $eq: ["$stock", 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Get top products by inventory value
    const topInventoryValue = await Product.aggregate([
      {
        $project: {
          title: 1,
          stock: 1,
          price: 1,
          inventoryValue: { $multiply: ["$price", "$stock"] },
        },
      },
      { $sort: { inventoryValue: -1 } },
      { $limit: 10 },
    ]);

    // Get most stocked products
    const topStockedProducts = await Product.find()
      .sort({ stock: -1 })
      .limit(10)
      .select("title price stock category images");

    // Get low stock products
    const lowStockProducts = await Product.find({ stock: { $lte: 5, $gt: 0 } })
      .sort({ stock: 1 })
      .limit(10)
      .select("title price stock category images");

    // Get out of stock products
    const outOfStockProducts = await Product.find({ stock: 0 })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("title price category images updatedAt");

    // Get category-wise inventory breakdown
    const categoryInventory = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          productCount: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
          lowStockProducts: {
            $sum: {
              $cond: [{ $lte: ["$stock", 5] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    // Calculate inventory turnover rate (using estimates based on sales data)
    // Get the monthly sales quantity
    const { startDate, endDate } = parseDateRange(req);

    const salesQuantity = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          quantitySold: { $sum: "$items.quantity" },
        },
      },
    ]);

    // Calculate turnover rate for each product
    const productTurnover = await Promise.all(
      salesQuantity.map(async (item) => {
        const product = await Product.findById(item._id).select(
          "title price stock category"
        );

        if (!product) return null;

        // Calculate turnover rate
        // Formula: (Sales Quantity) / ((Beginning Inventory + Ending Inventory) / 2)
        // We're estimating using current stock as ending inventory
        const avgInventory =
          (product.stock + product.stock + item.quantitySold) / 2;
        const turnoverRate =
          avgInventory > 0 ? item.quantitySold / avgInventory : 0;

        return {
          productId: item._id,
          title: product.title,
          category: product.category,
          quantitySold: item.quantitySold,
          currentStock: product.stock,
          turnoverRate: parseFloat(turnoverRate.toFixed(2)),
        };
      })
    );

    // Filter out null values and sort by turnover rate
    const sortedTurnover = productTurnover
      .filter((item) => item !== null)
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, 10);

    res.status(200).json({
      message: "Inventory analytics fetched successfully",
      overview: inventoryStats[0]
        ? {
            totalProducts: inventoryStats[0].totalProducts,
            totalStock: inventoryStats[0].totalStock,
            totalValue: parseFloat(inventoryStats[0].totalValue.toFixed(2)),
            averageStock: parseFloat(inventoryStats[0].avgStock.toFixed(2)),
            lowStockProducts: inventoryStats[0].lowStockProducts,
            outOfStockProducts: inventoryStats[0].outOfStockProducts,
            stockDistribution: {
              healthy:
                inventoryStats[0].totalProducts -
                inventoryStats[0].lowStockProducts -
                inventoryStats[0].outOfStockProducts,
              low: inventoryStats[0].lowStockProducts,
              out: inventoryStats[0].outOfStockProducts,
            },
          }
        : {
            totalProducts: 0,
            totalStock: 0,
            totalValue: 0,
            averageStock: 0,
            lowStockProducts: 0,
            outOfStockProducts: 0,
            stockDistribution: {
              healthy: 0,
              low: 0,
              out: 0,
            },
          },
      topInventoryValue,
      topStockedProducts,
      lowStockProducts,
      outOfStockProducts,
      categoryInventory,
      turnoverLeaders: sortedTurnover,
    });
  } catch (error) {
    console.error("Error fetching inventory analytics:", error.message);
    res.status(500).json({ message: "Error fetching inventory analytics" });
  }
};

// Get marketing analytics
const getMarketingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);

    // Get coupon usage and performance
    const couponPerformance = await CouponUsage.aggregate([
      {
        $match: {
          usedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "couponId",
          foreignField: "_id",
          as: "couponDetails",
        },
      },
      { $unwind: "$couponDetails" },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "orderDetails",
        },
      },
      { $unwind: "$orderDetails" },
      {
        $group: {
          _id: "$couponId",
          code: { $first: "$couponDetails.code" },
          discountType: { $first: "$couponDetails.discountType" },
          discountValue: { $first: "$couponDetails.discountValue" },
          usageCount: { $sum: 1 },
          totalDiscount: { $sum: "$discountAmount" },
          totalOrderValue: { $sum: "$orderDetails.total" },
          averageOrderValue: { $avg: "$orderDetails.total" },
        },
      },
      { $sort: { usageCount: -1 } },
    ]);

    // Get search analytics
    const searchAnalytics = await SearchQuery.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$query",
          count: { $sum: "$count" },
          averageResults: { $avg: "$resultCount" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Get cart conversion rates
    // This is an estimate based on orders completed vs. cart activity
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalCartUpdates = await user.aggregate([
      {
        $match: {
          "cart.updatedAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const cartConversionRate =
      totalCartUpdates.length > 0 && totalCartUpdates[0].count > 0
        ? (totalOrders / totalCartUpdates[0].count) * 100
        : 0;

    // Get product review analytics
    const reviewAnalytics = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          verifiedPurchases: {
            $sum: { $cond: ["$verifiedPurchase", 1, 0] },
          },
        },
      },
    ]);

    // Get top reviewed products
    const topReviewedProducts = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$product",
          reviewCount: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          productId: "$_id",
          title: "$productDetails.title",
          reviewCount: 1,
          averageRating: 1,
        },
      },
      { $sort: { reviewCount: -1 } },
      { $limit: 10 },
    ]);

    // Get user acquisition sources (this is a placeholder since we don't track this)
    const acquisitionSources = [
      { source: "Direct", count: 120, percentage: 40 },
      { source: "Organic Search", count: 75, percentage: 25 },
      { source: "Social Media", count: 60, percentage: 20 },
      { source: "Referral", count: 30, percentage: 10 },
      { source: "Email", count: 15, percentage: 5 },
    ];

    res.status(200).json({
      message: "Marketing analytics fetched successfully",
      period: {
        start: startDate,
        end: endDate,
      },
      couponPerformance,
      searchAnalytics: {
        topSearches: searchAnalytics,
        totalSearches: searchAnalytics.reduce(
          (acc, item) => acc + item.count,
          0
        ),
      },
      conversionRates: {
        cartToOrder: parseFloat(cartConversionRate.toFixed(2)),
      },
      reviews:
        reviewAnalytics.length > 0
          ? {
              totalReviews: reviewAnalytics[0].totalReviews,
              averageRating: parseFloat(
                reviewAnalytics[0].averageRating.toFixed(1)
              ),
              verifiedPurchases: reviewAnalytics[0].verifiedPurchases,
              verifiedPercentage:
                (reviewAnalytics[0].verifiedPurchases /
                  reviewAnalytics[0].totalReviews) *
                100,
            }
          : {
              totalReviews: 0,
              averageRating: 0,
              verifiedPurchases: 0,
              verifiedPercentage: 0,
            },
      topReviewedProducts,
      acquisitionSources,
    });
  } catch (error) {
    console.error("Error fetching marketing analytics:", error.message);
    res.status(500).json({ message: "Error fetching marketing analytics" });
  }
};

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    // Use today and the last 30 days for the dashboard
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get today's sales and orders
    const todaySales = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999)),
          },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    // Get monthly sales
    const monthlySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: today },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format monthly sales data
    const formattedMonthlySales = monthlySales.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      return {
        date: date.toISOString().split("T")[0],
        sales: parseFloat(item.totalSales.toFixed(2)),
        orders: item.orderCount,
      };
    });

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "username email")
      .select("orderNumber total status createdAt");

    // Format recent orders
    const formattedRecentOrders = recentOrders.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      date: order.createdAt,
      customer: order.userId
        ? {
            id: order.userId._id,
            name: order.userId.username,
            email: order.userId.email,
          }
        : { name: "Guest" },
    }));

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: today },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
    ]);

    // Get inventory alerts
    const inventoryAlerts = await Product.find({ stock: { $lte: 5 } })
      .sort({ stock: 1 })
      .limit(5)
      .select("title stock");

    // Get total customers
    const customerCount = await user.countDocuments();

    // Get new customers this month
    const newCustomers = await user.countDocuments({
      createdAt: { $gte: startDate, $lte: today },
    });

    // Get order status distribution
    const orderStatus = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: today },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate the total monthly sales and orders
    const monthlyTotal = monthlySales.reduce(
      (acc, item) => {
        acc.sales += item.totalSales;
        acc.orders += item.orderCount;
        return acc;
      },
      { sales: 0, orders: 0 }
    );

    res.status(200).json({
      message: "Dashboard summary fetched successfully",
      today:
        todaySales.length > 0
          ? {
              sales: parseFloat(todaySales[0].totalSales.toFixed(2)),
              orders: todaySales[0].orderCount,
            }
          : {
              sales: 0,
              orders: 0,
            },
      month: {
        sales: parseFloat(monthlyTotal.sales.toFixed(2)),
        orders: monthlyTotal.orders,
        newCustomers,
      },
      charts: {
        salesTrend: formattedMonthlySales,
      },
      recentOrders: formattedRecentOrders,
      topProducts,
      inventoryAlerts,
      customers: {
        total: customerCount,
        new: newCustomers,
      },
      orderStatus: orderStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error.message);
    res.status(500).json({ message: "Error fetching dashboard summary" });
  }
};

// Get search analytics
const getSearchAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);

    // Get most popular searches
    const popularSearches = await SearchQuery.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$query",
          searchCount: { $sum: "$count" },
          averageResults: { $avg: "$resultCount" },
        },
      },
      { $sort: { searchCount: -1 } },
      { $limit: 20 },
    ]);

    // Get searches with no results
    const zeroResultSearches = await SearchQuery.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          resultCount: 0,
        },
      },
      {
        $group: {
          _id: "$query",
          searchCount: { $sum: "$count" },
        },
      },
      { $sort: { searchCount: -1 } },
      { $limit: 20 },
    ]);

    // Get search count trend over time
    const searchTrend = await SearchQuery.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          searchCount: { $sum: "$count" },
          uniqueQueries: { $addToSet: "$query" },
        },
      },
      {
        $project: {
          date: "$_id",
          searchCount: 1,
          uniqueQueryCount: { $size: "$uniqueQueries" },
        },
      },
      { $sort: { "date.year": 1, "date.month": 1, "date.day": 1 } },
    ]);

    // Format search trend data
    const formattedSearchTrend = searchTrend.map((item) => {
      const date = new Date(item.date.year, item.date.month - 1, item.date.day);
      return {
        date: date.toISOString().split("T")[0],
        searchCount: item.searchCount,
        uniqueSearches: item.uniqueQueryCount,
      };
    });

    // Calculate overall metrics
    const totalSearches = popularSearches.reduce(
      (sum, item) => sum + item.searchCount,
      0
    );
    const totalZeroResults = zeroResultSearches.reduce(
      (sum, item) => sum + item.searchCount,
      0
    );
    const zeroResultRate =
      totalSearches > 0 ? (totalZeroResults / totalSearches) * 100 : 0;

    res.status(200).json({
      message: "Search analytics fetched successfully",
      period: {
        start: startDate,
        end: endDate,
      },
      overview: {
        totalSearches,
        uniqueSearchTerms: popularSearches.length,
        zeroResultRate: parseFloat(zeroResultRate.toFixed(2)),
      },
      popularSearches,
      zeroResultSearches,
      searchTrend: formattedSearchTrend,
    });
  } catch (error) {
    console.error("Error fetching search analytics:", error.message);
    res.status(500).json({ message: "Error fetching search analytics" });
  }
};

// Get category analytics
const getCategoryAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);

    // Get sales by category
    const salesByCategory = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.category",
          orderCount: { $addToSet: "$_id" },
          itemCount: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      {
        $project: {
          category: "$_id",
          orderCount: { $size: "$orderCount" },
          itemCount: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Get category inventory
    const categoryInventory = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          productCount: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          averagePrice: { $avg: "$price" },
          inventoryValue: { $sum: { $multiply: ["$price", "$stock"] } },
          lowStockProducts: {
            $sum: {
              $cond: [{ $lte: ["$stock", 5] }, 1, 0],
            },
          },
        },
      },
      { $sort: { inventoryValue: -1 } },
    ]);

    // Combine sales and inventory data
    const categories = {};

    // Add sales data
    salesByCategory.forEach((item) => {
      categories[item.category] = {
        sales: {
          orderCount: item.orderCount,
          itemCount: item.itemCount,
          revenue: parseFloat(item.revenue.toFixed(2)),
        },
      };
    });

    // Add inventory data
    categoryInventory.forEach((item) => {
      if (!categories[item._id]) {
        categories[item._id] = {};
      }

      categories[item._id].inventory = {
        productCount: item.productCount,
        totalStock: item.totalStock,
        averagePrice: parseFloat(item.averagePrice.toFixed(2)),
        inventoryValue: parseFloat(item.inventoryValue.toFixed(2)),
        lowStockProducts: item.lowStockProducts,
      };
    });

    // Convert to array and calculate metrics
    const categoryAnalytics = Object.entries(categories).map(([name, data]) => {
      const sales = data.sales || { orderCount: 0, itemCount: 0, revenue: 0 };
      const inventory = data.inventory || {
        productCount: 0,
        totalStock: 0,
        averagePrice: 0,
        inventoryValue: 0,
        lowStockProducts: 0,
      };

      // Calculate turnover rate (if we have both sales and inventory data)
      const turnoverRate =
        inventory.totalStock > 0 ? sales.itemCount / inventory.totalStock : 0;

      return {
        name,
        sales,
        inventory,
        metrics: {
          turnoverRate: parseFloat(turnoverRate.toFixed(2)),
          revenuePerProduct:
            inventory.productCount > 0
              ? parseFloat((sales.revenue / inventory.productCount).toFixed(2))
              : 0,
        },
      };
    });

    // Sort by revenue
    categoryAnalytics.sort((a, b) => b.sales.revenue - a.sales.revenue);

    // Calculate category distribution by revenue
    const totalRevenue = categoryAnalytics.reduce(
      (sum, item) => sum + item.sales.revenue,
      0
    );

    const categoryDistribution = categoryAnalytics.map((item) => ({
      name: item.name,
      revenue: item.sales.revenue,
      percentage:
        totalRevenue > 0
          ? parseFloat(((item.sales.revenue / totalRevenue) * 100).toFixed(2))
          : 0,
    }));

    // Get total categories count
    const totalCategories = await Category.countDocuments();

    res.status(200).json({
      message: "Category analytics fetched successfully",
      period: {
        start: startDate,
        end: endDate,
      },
      overview: {
        totalCategories,
        categoriesWithSales: salesByCategory.length,
        topCategory: categoryAnalytics[0]?.name || "None",
        topCategoryRevenue: categoryAnalytics[0]?.sales.revenue || 0,
      },
      categoryAnalytics,
      distribution: categoryDistribution,
    });
  } catch (error) {
    console.error("Error fetching category analytics:", error.message);
    res.status(500).json({ message: "Error fetching category analytics" });
  }
};

// Get revenue breakdown
const getRevenueBreakdown = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);

    // Get revenue breakdown by time (daily)
    const revenueByDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          subtotal: { $sum: "$subtotal" },
          tax: { $sum: "$tax" },
          shipping: { $sum: "$shippingCost" },
          discount: { $sum: "$discount" },
          total: { $sum: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format revenue by day
    const formattedRevenueByDay = revenueByDay.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      return {
        date: date.toISOString().split("T")[0],
        subtotal: parseFloat(item.subtotal.toFixed(2)),
        tax: parseFloat(item.tax.toFixed(2)),
        shipping: parseFloat(item.shipping.toFixed(2)),
        discount: parseFloat(item.discount.toFixed(2)),
        total: parseFloat(item.total.toFixed(2)),
      };
    });

    // Get revenue by payment method
    const revenueByPaymentMethod = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Calculate totals
    const totals = revenueByDay.reduce(
      (acc, item) => {
        acc.subtotal += item.subtotal;
        acc.tax += item.tax;
        acc.shipping += item.shipping;
        acc.discount += item.discount;
        acc.total += item.total;
        return acc;
      },
      { subtotal: 0, tax: 0, shipping: 0, discount: 0, total: 0 }
    );

    // Calculate percentages
    const revenueComposition = {
      subtotal: parseFloat(totals.subtotal.toFixed(2)),
      tax: parseFloat(totals.tax.toFixed(2)),
      shipping: parseFloat(totals.shipping.toFixed(2)),
      discount: parseFloat(totals.discount.toFixed(2)),
      percentages: {
        tax:
          totals.subtotal > 0
            ? parseFloat(((totals.tax / totals.subtotal) * 100).toFixed(2))
            : 0,
        shipping:
          totals.subtotal > 0
            ? parseFloat(((totals.shipping / totals.subtotal) * 100).toFixed(2))
            : 0,
        discount:
          totals.subtotal > 0
            ? parseFloat(((totals.discount / totals.subtotal) * 100).toFixed(2))
            : 0,
      },
    };

    // Get average order value trend
    const aovTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          orderCount: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
      {
        $project: {
          date: "$_id",
          aov: { $divide: ["$total", "$orderCount"] },
        },
      },
      { $sort: { "date.year": 1, "date.month": 1, "date.day": 1 } },
    ]);

    // Format AOV trend
    const formattedAovTrend = aovTrend.map((item) => {
      const date = new Date(item.date.year, item.date.month - 1, item.date.day);
      return {
        date: date.toISOString().split("T")[0],
        aov: parseFloat(item.aov.toFixed(2)),
      };
    });

    // Get discount analysis
    const discountAnalysis = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["cancelled", "refunded"] },
          discount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          totalDiscount: { $sum: "$discount" },
          averageDiscount: { $avg: "$discount" },
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    // Get orders without discount
    const noDiscountOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ["cancelled", "refunded"] },
      discount: { $eq: 0 },
    });

    res.status(200).json({
      message: "Revenue breakdown fetched successfully",
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        total: parseFloat(totals.total.toFixed(2)),
        ...revenueComposition,
      },
      trends: {
        daily: formattedRevenueByDay,
        aov: formattedAovTrend,
      },
      paymentMethods: revenueByPaymentMethod,
      discounts:
        discountAnalysis.length > 0
          ? {
              ordersWithDiscount: discountAnalysis[0].orderCount,
              ordersWithoutDiscount: noDiscountOrders,
              totalDiscount: parseFloat(
                discountAnalysis[0].totalDiscount.toFixed(2)
              ),
              averageDiscount: parseFloat(
                discountAnalysis[0].averageDiscount.toFixed(2)
              ),
              discountRate: parseFloat(
                (
                  (discountAnalysis[0].totalDiscount /
                    (discountAnalysis[0].totalRevenue +
                      discountAnalysis[0].totalDiscount)) *
                  100
                ).toFixed(2)
              ),
            }
          : {
              ordersWithDiscount: 0,
              ordersWithoutDiscount: noDiscountOrders,
              totalDiscount: 0,
              averageDiscount: 0,
              discountRate: 0,
            },
    });
  } catch (error) {
    console.error("Error fetching revenue breakdown:", error.message);
    res.status(500).json({ message: "Error fetching revenue breakdown" });
  }
};

// Export analytics report
const exportAnalyticsReport = async (req, res) => {
  try {
    const {
      type,
      startDate: startDateParam,
      endDate: endDateParam,
    } = req.query;

    // Parse date range
    const { startDate, endDate } = parseDateRange(req);

    // Basic report structure
    const report = {
      generatedAt: new Date(),
      period: {
        startDate,
        endDate,
      },
      data: {},
    };

    // Generate report based on type
    switch (type) {
      case "sales":
        // Get sales data
        const salesData = await Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" },
              },
              orders: { $sum: 1 },
              revenue: { $sum: "$total" },
              tax: { $sum: "$tax" },
              shipping: { $sum: "$shippingCost" },
              discount: { $sum: "$discount" },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ]);

        report.data.title = "Sales Report";
        report.data.summary = salesData.reduce(
          (acc, item) => {
            acc.totalOrders += item.orders;
            acc.totalRevenue += item.revenue;
            acc.totalTax += item.tax;
            acc.totalShipping += item.shipping;
            acc.totalDiscount += item.discount;
            return acc;
          },
          {
            totalOrders: 0,
            totalRevenue: 0,
            totalTax: 0,
            totalShipping: 0,
            totalDiscount: 0,
          }
        );

        report.data.daily = salesData.map((item) => {
          const date = new Date(
            item._id.year,
            item._id.month - 1,
            item._id.day
          );
          return {
            date: date.toISOString().split("T")[0],
            orders: item.orders,
            revenue: parseFloat(item.revenue.toFixed(2)),
            tax: parseFloat(item.tax.toFixed(2)),
            shipping: parseFloat(item.shipping.toFixed(2)),
            discount: parseFloat(item.discount.toFixed(2)),
          };
        });

        // Get sales by payment method
        const paymentMethodData = await Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$paymentMethod",
              count: { $sum: 1 },
              revenue: { $sum: "$total" },
            },
          },
          { $sort: { revenue: -1 } },
        ]);

        report.data.paymentMethods = paymentMethodData;
        break;

      case "products":
        // Get product sales data
        const productSales = await Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
              status: { $nin: ["cancelled", "refunded"] },
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.productId",
              name: { $first: "$items.name" },
              quantitySold: { $sum: "$items.quantity" },
              revenue: {
                $sum: { $multiply: ["$items.price", "$items.quantity"] },
              },
            },
          },
          { $sort: { quantitySold: -1 } },
        ]);

        // Get product inventory data
        const productInventory = await Product.find()
          .select("_id title stock price category")
          .sort({ stock: -1 });

        // Combine sales and inventory data
        const productData = [];
        for (const item of productInventory) {
          const salesInfo = productSales.find(
            (sales) => sales._id.toString() === item._id.toString()
          );

          productData.push({
            productId: item._id,
            title: item.title,
            category: item.category,
            stock: item.stock,
            price: item.price,
            quantitySold: salesInfo ? salesInfo.quantitySold : 0,
            revenue: salesInfo ? parseFloat(salesInfo.revenue.toFixed(2)) : 0,
          });
        }

        report.data.title = "Product Report";
        report.data.products = productData;
        break;

      case "customers":
        // Get customer order data
        const customerOrders = await Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
              status: { $nin: ["cancelled", "refunded"] },
              userId: { $ne: null },
            },
          },
          {
            $group: {
              _id: "$userId",
              orderCount: { $sum: 1 },
              totalSpent: { $sum: "$total" },
              lastOrderDate: { $max: "$createdAt" },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          { $unwind: "$userDetails" },
          {
            $project: {
              userId: "$_id",
              username: "$userDetails.username",
              email: "$userDetails.email",
              orderCount: 1,
              totalSpent: 1,
              lastOrderDate: 1,
            },
          },
          { $sort: { totalSpent: -1 } },
        ]);

        // Get new customer registrations
        const newCustomers = await user.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ]);

        report.data.title = "Customer Report";
        report.data.customers = customerOrders.map((customer) => ({
          userId: customer.userId,
          username: customer.username,
          email: customer.email,
          orderCount: customer.orderCount,
          totalSpent: parseFloat(customer.totalSpent.toFixed(2)),
          lastOrderDate: customer.lastOrderDate,
        }));

        report.data.newCustomers = newCustomers.map((item) => {
          const date = new Date(
            item._id.year,
            item._id.month - 1,
            item._id.day
          );
          return {
            date: date.toISOString().split("T")[0],
            count: item.count,
          };
        });

        report.data.summary = {
          totalCustomers: report.data.customers.length,
          newCustomers: newCustomers.reduce((sum, item) => sum + item.count, 0),
          averageSpent: parseFloat(
            (
              report.data.customers.reduce(
                (sum, item) => sum + item.totalSpent,
                0
              ) / report.data.customers.length
            ).toFixed(2)
          ),
          topSpender: report.data.customers[0]
            ? {
                username: report.data.customers[0].username,
                totalSpent: report.data.customers[0].totalSpent,
              }
            : null,
        };
        break;

      case "inventory":
        // Get inventory status
        const inventory = await Product.find()
          .sort({ stock: -1 })
          .select("_id title category price stock");

        report.data.title = "Inventory Report";
        report.data.inventory = inventory.map((item) => ({
          productId: item._id,
          title: item.title,
          category: item.category,
          price: item.price,
          stock: item.stock,
          value: parseFloat((item.price * item.stock).toFixed(2)),
        }));

        report.data.summary = {
          totalProducts: inventory.length,
          totalStock: inventory.reduce((sum, item) => sum + item.stock, 0),
          totalValue: parseFloat(
            inventory
              .reduce((sum, item) => sum + item.price * item.stock, 0)
              .toFixed(2)
          ),
          lowStockProducts: inventory.filter((item) => item.stock <= 5).length,
          outOfStockProducts: inventory.filter((item) => item.stock === 0)
            .length,
        };

        // Get category inventory breakdown
        const categoryInventory = {};
        for (const item of inventory) {
          if (!categoryInventory[item.category]) {
            categoryInventory[item.category] = {
              productCount: 0,
              totalStock: 0,
              totalValue: 0,
            };
          }

          categoryInventory[item.category].productCount++;
          categoryInventory[item.category].totalStock += item.stock;
          categoryInventory[item.category].totalValue +=
            item.price * item.stock;
        }

        report.data.categories = Object.entries(categoryInventory)
          .map(([category, data]) => ({
            category,
            productCount: data.productCount,
            totalStock: data.totalStock,
            totalValue: parseFloat(data.totalValue.toFixed(2)),
          }))
          .sort((a, b) => b.totalValue - a.totalValue);
        break;

      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

    // Send the report
    res.status(200).json({
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } report generated successfully`,
      report,
    });
  } catch (error) {
    console.error("Error generating analytics report:", error.message);
    res.status(500).json({ message: "Error generating analytics report" });
  }
};

export {
  getSalesAnalytics,
  getProductAnalytics,
  getCustomerAnalytics,
  getInventoryAnalytics,
  getMarketingAnalytics,
  getDashboardSummary,
  getSearchAnalytics,
  getCategoryAnalytics,
  getRevenueBreakdown,
  exportAnalyticsReport,
};
