// inventoryController.js
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { InventoryHistory } from "../models/InventoryHistory.js";
import mongoose from "mongoose";

// Get inventory overview
const getInventoryOverview = async (req, res) => {
  try {
    // Get basic inventory stats
    const totalProducts = await Product.countDocuments();

    // Count products with variants
    const productsWithVariants = await Product.countDocuments({
      "variants.0": { $exists: true },
    });

    // Count low stock products
    const lowStockThreshold = parseInt(req.query.threshold) || 10;

    const lowStockProducts = await Product.countDocuments({
      stock: { $lte: lowStockThreshold, $gt: 0 },
    });

    // Count out of stock products
    const outOfStockProducts = await Product.countDocuments({
      stock: 0,
    });

    // Get total inventory value
    const inventoryValue = await Product.aggregate([
      {
        $project: {
          totalValue: { $multiply: ["$stock", "$price"] },
        },
      },
      {
        $group: {
          _id: null,
          value: { $sum: "$totalValue" },
        },
      },
    ]);

    // Get recent inventory changes
    const recentChanges = await InventoryHistory.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .populate("productId", "title")
      .populate("userId", "username");

    res.status(200).json({
      message: "Inventory overview fetched successfully",
      overview: {
        totalProducts,
        productsWithVariants,
        lowStockProducts,
        outOfStockProducts,
        inventoryValue: inventoryValue.length > 0 ? inventoryValue[0].value : 0,
        lowStockThreshold,
      },
      recentChanges: recentChanges.map((change) => ({
        id: change._id,
        product: change.productId
          ? {
              id: change.productId._id,
              title: change.productId.title,
            }
          : null,
        type: change.type,
        previousStock: change.previousStock,
        newStock: change.newStock,
        variant: change.variantId
          ? {
              id: change.variantId,
              name: change.variantName,
            }
          : null,
        user: change.userId
          ? {
              id: change.userId._id,
              username: change.userId.username,
            }
          : null,
        timestamp: change.timestamp,
      })),
    });
  } catch (error) {
    console.error("Error fetching inventory overview:", error.message);
    res.status(500).json({ message: "Error fetching inventory overview" });
  }
};

// Get inventory details for a specific product
const getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Get product with stock information
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get inventory history for this product
    const inventoryHistory = await InventoryHistory.find({
      productId,
      variantId: null, // Only main product stock changes
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("userId", "username");

    // Format the response
    const inventory = {
      product: {
        id: product._id,
        title: product.title,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        inventoryValue: product.stock * product.price,
        lowStockThreshold: product.lowStockThreshold || 10,
        isLowStock:
          product.stock <= (product.lowStockThreshold || 10) &&
          product.stock > 0,
        isOutOfStock: product.stock === 0,
      },
      history: inventoryHistory.map((record) => ({
        id: record._id,
        type: record.type,
        previousStock: record.previousStock,
        newStock: record.newStock,
        quantityChanged: record.newStock - record.previousStock,
        reason: record.reason,
        user: record.userId
          ? {
              id: record.userId._id,
              username: record.userId.username,
            }
          : null,
        timestamp: record.timestamp,
      })),
    };

    res.status(200).json({
      message: "Product inventory fetched successfully",
      inventory,
    });
  } catch (error) {
    console.error("Error fetching product inventory:", error.message);
    res.status(500).json({ message: "Error fetching product inventory" });
  }
};

// Update stock for a product
const updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock, reason } = req.body;
    const userId = req.user.userId;

    if (!productId || stock === undefined) {
      return res.status(400).json({
        message: "Product ID and stock are required",
      });
    }

    // Validate stock (must be non-negative integer)
    if (stock < 0 || !Number.isInteger(Number(stock))) {
      return res.status(400).json({
        message: "Stock must be a non-negative integer",
      });
    }

    // Find the product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Record previous stock
    const previousStock = product.stock;

    // Update stock
    product.stock = stock;
    await product.save();

    // Record inventory change in history
    await InventoryHistory.create({
      productId,
      type: stock > previousStock ? "increase" : "decrease",
      previousStock,
      newStock: stock,
      reason: reason || `Stock updated to ${stock}`,
      userId,
      timestamp: new Date(),
    });

    res.status(200).json({
      message: "Product stock updated successfully",
      product: {
        id: product._id,
        title: product.title,
        previousStock,
        newStock: product.stock,
        quantityChanged: product.stock - previousStock,
      },
    });
  } catch (error) {
    console.error("Error updating product stock:", error.message);
    res.status(500).json({ message: "Error updating product stock" });
  }
};

// Bulk update stock for multiple products
const bulkUpdateStock = async (req, res) => {
  try {
    const { updates, reason } = req.body;
    const userId = req.user.userId;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        message: "Updates array is required",
      });
    }

    const results = [];
    const historyRecords = [];

    // Process each update
    for (const update of updates) {
      const { productId, variantId, stock } = update;

      // Validate stock (must be non-negative integer)
      if (stock < 0 || !Number.isInteger(Number(stock))) {
        results.push({
          productId,
          variantId,
          success: false,
          message: "Stock must be a non-negative integer",
        });
        continue;
      }

      try {
        if (variantId) {
          // Update variant stock
          const product = await Product.findById(productId);

          if (!product) {
            results.push({
              productId,
              variantId,
              success: false,
              message: "Product not found",
            });
            continue;
          }

          // Find the variant
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId
          );

          if (variantIndex === -1) {
            results.push({
              productId,
              variantId,
              success: false,
              message: "Variant not found",
            });
            continue;
          }

          // Record previous stock
          const previousStock = product.variants[variantIndex].stock;

          // Update variant stock
          product.variants[variantIndex].stock = stock;
          await product.save();

          // Record inventory change
          historyRecords.push({
            productId,
            variantId,
            variantName: product.variants[variantIndex].name,
            type: stock > previousStock ? "increase" : "decrease",
            previousStock,
            newStock: stock,
            reason: reason || `Stock updated to ${stock}`,
            userId,
            timestamp: new Date(),
          });

          results.push({
            productId,
            variantId,
            success: true,
            previousStock,
            newStock: stock,
            quantityChanged: stock - previousStock,
          });
        } else {
          // Update main product stock
          const product = await Product.findById(productId);

          if (!product) {
            results.push({
              productId,
              success: false,
              message: "Product not found",
            });
            continue;
          }

          // Record previous stock
          const previousStock = product.stock;

          // Update stock
          product.stock = stock;
          await product.save();

          // Record inventory change
          historyRecords.push({
            productId,
            type: stock > previousStock ? "increase" : "decrease",
            previousStock,
            newStock: stock,
            reason: reason || `Stock updated to ${stock}`,
            userId,
            timestamp: new Date(),
          });

          results.push({
            productId,
            success: true,
            previousStock,
            newStock: stock,
            quantityChanged: stock - previousStock,
          });
        }
      } catch (error) {
        results.push({
          productId,
          variantId,
          success: false,
          message: error.message,
        });
      }
    }

    // Record all inventory changes in bulk
    if (historyRecords.length > 0) {
      await InventoryHistory.insertMany(historyRecords);
    }

    res.status(200).json({
      message: "Bulk stock update completed",
      results,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error("Error in bulk stock update:", error.message);
    res.status(500).json({ message: "Error updating stock" });
  }
};

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const {
      threshold = 10,
      includeOutOfStock = "false",
      category,
      sort = "stock",
      order = "asc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = {};

    if (includeOutOfStock === "true") {
      query.stock = { $lte: parseInt(threshold) };
    } else {
      query.stock = { $lte: parseInt(threshold), $gt: 0 };
    }

    if (category) {
      query.category = category;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    const sortOptions = {};
    sortOptions[sort] = order === "asc" ? 1 : -1;

    // Execute query
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select("title sku category stock price images");

    const total = await Product.countDocuments(query);

    // Get variants with low stock
    const variantsQuery = {
      "variants.stock": { $lte: parseInt(threshold) },
    };

    if (includeOutOfStock !== "true") {
      variantsQuery["variants.stock"].$gt = 0;
    }

    if (category) {
      variantsQuery.category = category;
    }

    const productsWithLowStockVariants = await Product.find(
      variantsQuery
    ).select("title sku category variants images");

    // Extract low stock variants
    const lowStockVariants = [];

    productsWithLowStockVariants.forEach((product) => {
      product.variants.forEach((variant) => {
        if (
          variant.stock <= parseInt(threshold) &&
          (includeOutOfStock === "true" || variant.stock > 0)
        ) {
          lowStockVariants.push({
            productId: product._id,
            productTitle: product.title,
            productSku: product.sku,
            category: product.category,
            image:
              product.images && product.images.length > 0
                ? product.images[0]
                : null,
            variantId: variant._id,
            variantName: variant.name,
            variantSku: variant.sku,
            stock: variant.stock,
            price: variant.price || product.price,
            isOutOfStock: variant.stock === 0,
          });
        }
      });
    });

    // Sort variants
    if (sort === "stock") {
      lowStockVariants.sort((a, b) => {
        return order === "asc" ? a.stock - b.stock : b.stock - a.stock;
      });
    } else if (sort === "price") {
      lowStockVariants.sort((a, b) => {
        return order === "asc" ? a.price - b.price : b.price - a.price;
      });
    }

    // Apply pagination to variants
    const paginatedVariants = lowStockVariants.slice(
      skip,
      skip + parseInt(limit)
    );

    // Format regular products
    const formattedProducts = products.map((product) => ({
      id: product._id,
      title: product.title,
      sku: product.sku,
      category: product.category,
      stock: product.stock,
      price: product.price,
      image:
        product.images && product.images.length > 0 ? product.images[0] : null,
      isOutOfStock: product.stock === 0,
    }));

    res.status(200).json({
      message: "Low stock items fetched successfully",
      threshold: parseInt(threshold),
      products: formattedProducts,
      variants: paginatedVariants,
      pagination: {
        total: total + lowStockVariants.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil((total + lowStockVariants.length) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching low stock products:", error.message);
    res.status(500).json({ message: "Error fetching low stock products" });
  }
};

// Get inventory history
const getInventoryHistory = async (req, res) => {
  try {
    const {
      productId,
      variantId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = {};

    if (productId) {
      query.productId = productId;
    }

    if (variantId) {
      query.variantId = variantId;
    }

    if (type) {
      query.type = type;
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

    // Get history records
    const history = await InventoryHistory.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("productId", "title sku")
      .populate("userId", "username");

    const total = await InventoryHistory.countDocuments(query);

    // Format the response
    const formattedHistory = history.map((record) => ({
      id: record._id,
      product: record.productId
        ? {
            id: record.productId._id,
            title: record.productId.title,
            sku: record.productId.sku,
          }
        : null,
      variant: record.variantId
        ? {
            id: record.variantId,
            name: record.variantName,
          }
        : null,
      type: record.type,
      previousStock: record.previousStock,
      newStock: record.newStock,
      quantityChanged: record.newStock - record.previousStock,
      reason: record.reason,
      user: record.userId
        ? {
            id: record.userId._id,
            username: record.userId.username,
          }
        : null,
      timestamp: record.timestamp,
    }));

    res.status(200).json({
      message: "Inventory history fetched successfully",
      history: formattedHistory,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching inventory history:", error.message);
    res.status(500).json({ message: "Error fetching inventory history" });
  }
};

// Create inventory adjustment
const createInventoryAdjustment = async (req, res) => {
  try {
    const { productId, variantId, adjustmentType, quantity, reason } = req.body;
    const userId = req.user.userId;

    if (!productId || !adjustmentType || quantity === undefined) {
      return res.status(400).json({
        message: "Product ID, adjustment type, and quantity are required",
      });
    }

    // Validate adjustment type
    if (!["add", "subtract", "set"].includes(adjustmentType)) {
      return res.status(400).json({
        message: "Adjustment type must be 'add', 'subtract', or 'set'",
      });
    }

    // Validate quantity
    if (quantity < 0 || !Number.isInteger(Number(quantity))) {
      return res.status(400).json({
        message: "Quantity must be a non-negative integer",
      });
    }

    // Find the product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let previousStock, newStock;

    if (variantId) {
      // Handle variant stock adjustment
      const variantIndex = product.variants.findIndex(
        (v) => v._id.toString() === variantId
      );

      if (variantIndex === -1) {
        return res.status(404).json({ message: "Variant not found" });
      }

      previousStock = product.variants[variantIndex].stock;

      // Apply adjustment
      if (adjustmentType === "add") {
        newStock = previousStock + quantity;
      } else if (adjustmentType === "subtract") {
        newStock = Math.max(0, previousStock - quantity);
      } else {
        newStock = quantity;
      }

      // Update variant stock
      product.variants[variantIndex].stock = newStock;
      await product.save();

      // Record inventory change
      await InventoryHistory.create({
        productId,
        variantId,
        variantName: product.variants[variantIndex].name,
        type:
          previousStock < newStock
            ? "increase"
            : previousStock > newStock
            ? "decrease"
            : "adjustment",
        previousStock,
        newStock,
        reason: reason || `Stock ${adjustmentType} by ${quantity}`,
        userId,
        timestamp: new Date(),
      });

      res.status(200).json({
        message: "Inventory adjustment completed successfully",
        adjustment: {
          productId,
          variantId,
          variantName: product.variants[variantIndex].name,
          adjustmentType,
          previousStock,
          newStock,
          quantityChanged: newStock - previousStock,
        },
      });
    } else {
      // Handle main product stock adjustment
      previousStock = product.stock;

      // Apply adjustment
      if (adjustmentType === "add") {
        newStock = previousStock + quantity;
      } else if (adjustmentType === "subtract") {
        newStock = Math.max(0, previousStock - quantity);
      } else {
        newStock = quantity;
      }

      // Update product stock
      product.stock = newStock;
      await product.save();

      // Record inventory change
      await InventoryHistory.create({
        productId,
        type:
          previousStock < newStock
            ? "increase"
            : previousStock > newStock
            ? "decrease"
            : "adjustment",
        previousStock,
        newStock,
        reason: reason || `Stock ${adjustmentType} by ${quantity}`,
        userId,
        timestamp: new Date(),
      });

      res.status(200).json({
        message: "Inventory adjustment completed successfully",
        adjustment: {
          productId,
          productTitle: product.title,
          adjustmentType,
          previousStock,
          newStock,
          quantityChanged: newStock - previousStock,
        },
      });
    }
  } catch (error) {
    console.error("Error creating inventory adjustment:", error.message);
    res.status(500).json({ message: "Error creating inventory adjustment" });
  }
};

// Get inventory statistics
const getInventoryStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Calculate date range
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get inventory adjustments in period
    const adjustments = await InventoryHistory.find({
      timestamp: { $gte: start, $lte: end },
    });

    // Calculate total changes
    const increases = adjustments.filter((a) => a.type === "increase");
    const decreases = adjustments.filter((a) => a.type === "decrease");

    const totalIncrease = increases.reduce(
      (sum, a) => sum + (a.newStock - a.previousStock),
      0
    );
    const totalDecrease = decreases.reduce(
      (sum, a) => sum + (a.previousStock - a.newStock),
      0
    );

    // Get top adjusted products
    const productAdjustments = {};

    adjustments.forEach((a) => {
      const id = a.productId.toString();

      if (!productAdjustments[id]) {
        productAdjustments[id] = {
          productId: id,
          increases: 0,
          decreases: 0,
          totalChange: 0,
          adjustmentCount: 0,
        };
      }

      const change = a.newStock - a.previousStock;

      if (change > 0) {
        productAdjustments[id].increases += change;
      } else if (change < 0) {
        productAdjustments[id].decreases += Math.abs(change);
      }

      productAdjustments[id].totalChange += change;
      productAdjustments[id].adjustmentCount += 1;
    });

    // Convert to array and sort by total adjustments
    const topProducts = Object.values(productAdjustments)
      .sort((a, b) => b.adjustmentCount - a.adjustmentCount)
      .slice(0, 10);

    // Get product details for top products
    const productIds = topProducts.map((p) => p.productId);
    const productDetails = await Product.find({
      _id: { $in: productIds },
    }).select("_id title sku");

    // Merge product details with adjustment stats
    const topProductsWithDetails = topProducts.map((p) => {
      const product = productDetails.find(
        (d) => d._id.toString() === p.productId
      );

      return {
        ...p,
        title: product ? product.title : "Unknown Product",
        sku: product ? product.sku : "",
      };
    });

    // Get inventory value
    const inventoryValue = await Product.aggregate([
      {
        $project: {
          totalValue: { $multiply: ["$stock", "$price"] },
        },
      },
      {
        $group: {
          _id: null,
          value: { $sum: "$totalValue" },
        },
      },
    ]);

    // Get daily adjustment totals for chart
    const dailyAdjustments = await InventoryHistory.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          change: { $subtract: ["$newStock", "$previousStock"] },
          type: 1,
        },
      },
      {
        $group: {
          _id: {
            date: "$date",
            type: "$type",
          },
          totalChange: { $sum: "$change" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Format for charting
    const formattedDailyAdjustments = [];
    const dateSet = new Set(dailyAdjustments.map((d) => d._id.date));

    // For each unique date
    dateSet.forEach((date) => {
      const increaseRecord = dailyAdjustments.find(
        (d) => d._id.date === date && d._id.type === "increase"
      );
      const decreaseRecord = dailyAdjustments.find(
        (d) => d._id.date === date && d._id.type === "decrease"
      );

      formattedDailyAdjustments.push({
        date,
        increase: increaseRecord ? increaseRecord.totalChange : 0,
        decrease: decreaseRecord ? -decreaseRecord.totalChange : 0,
        netChange:
          (increaseRecord ? increaseRecord.totalChange : 0) -
          (decreaseRecord ? decreaseRecord.totalChange : 0),
      });
    });

    res.status(200).json({
      message: "Inventory statistics fetched successfully",
      period: {
        startDate: start,
        endDate: end,
      },
      overview: {
        totalAdjustments: adjustments.length,
        totalIncrease,
        totalDecrease,
        netChange: totalIncrease - totalDecrease,
        inventoryValue: inventoryValue.length > 0 ? inventoryValue[0].value : 0,
      },
      topProducts: topProductsWithDetails,
      dailyAdjustments: formattedDailyAdjustments,
    });
  } catch (error) {
    console.error("Error fetching inventory statistics:", error.message);
    res.status(500).json({ message: "Error fetching inventory statistics" });
  }
};

// Get variant inventory
const getVariantInventory = async (req, res) => {
  try {
    const { variantId } = req.params;

    if (!variantId) {
      return res.status(400).json({ message: "Variant ID is required" });
    }

    // Find product containing this variant
    const product = await Product.findOne({
      "variants._id": mongoose.Types.ObjectId.createFromHexString(variantId),
    });

    if (!product) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Find the variant
    const variant = product.variants.find(
      (v) => v._id.toString() === variantId
    );

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Get inventory history
    const inventoryHistory = await InventoryHistory.find({
      productId: product._id,
      variantId,
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("userId", "username");

    // Format response
    const inventory = {
      product: {
        id: product._id,
        title: product.title,
        sku: product.sku,
      },
      variant: {
        id: variant._id,
        name: variant.name,
        sku: variant.sku,
        stock: variant.stock,
        price: variant.price || product.price,
        inventoryValue: variant.stock * (variant.price || product.price),
        isLowStock:
          variant.stock <= (product.lowStockThreshold || 10) &&
          variant.stock > 0,
        isOutOfStock: variant.stock === 0,
      },
      history: inventoryHistory.map((record) => ({
        id: record._id,
        type: record.type,
        previousStock: record.previousStock,
        newStock: record.newStock,
        quantityChanged: record.newStock - record.previousStock,
        reason: record.reason,
        user: record.userId
          ? {
              id: record.userId._id,
              username: record.userId.username,
            }
          : null,
        timestamp: record.timestamp,
      })),
    };

    res.status(200).json({
      message: "Variant inventory fetched successfully",
      inventory,
    });
  } catch (error) {
    console.error("Error fetching variant inventory:", error.message);
    res.status(500).json({ message: "Error fetching variant inventory" });
  }
};

// Update variant stock
const updateVariantStock = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { stock, reason } = req.body;
    const userId = req.user.userId;

    if (!variantId || stock === undefined) {
      return res.status(400).json({
        message: "Variant ID and stock are required",
      });
    }

    // Validate stock
    if (stock < 0 || !Number.isInteger(Number(stock))) {
      return res.status(400).json({
        message: "Stock must be a non-negative integer",
      });
    }

    // Find product containing this variant
    const product = await Product.findOne({
      "variants._id": mongoose.Types.ObjectId.createFromHexString(variantId),
    });

    if (!product) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Find the variant
    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === variantId
    );

    if (variantIndex === -1) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const variant = product.variants[variantIndex];

    // Record previous stock
    const previousStock = variant.stock;

    // Update stock
    product.variants[variantIndex].stock = stock;
    await product.save();

    // Record inventory change
    await InventoryHistory.create({
      productId: product._id,
      variantId,
      variantName: variant.name,
      type: stock > previousStock ? "increase" : "decrease",
      previousStock,
      newStock: stock,
      reason: reason || `Stock updated to ${stock}`,
      userId,
      timestamp: new Date(),
    });

    res.status(200).json({
      message: "Variant stock updated successfully",
      variant: {
        id: variant._id,
        name: variant.name,
        previousStock,
        newStock: stock,
        quantityChanged: stock - previousStock,
      },
    });
  } catch (error) {
    console.error("Error updating variant stock:", error.message);
    res.status(500).json({ message: "Error updating variant stock" });
  }
};

export {
  getInventoryOverview,
  getProductInventory,
  updateProductStock,
  bulkUpdateStock,
  getLowStockProducts,
  getInventoryHistory,
  createInventoryAdjustment,
  getInventoryStats,
  getVariantInventory,
  updateVariantStock,
};
