// vendorController.js
import { Vendor } from "../models/Vendor.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { user } from "../models/User.js";
import { Review } from "../models/Review.js";
import { VendorPayment } from "../models/VendorPayment.js";
import { VendorSettlement } from "../models/VendorSettlement.js";
import mongoose from "mongoose";

// Get all active vendors
const getAllVendors = async (req, res) => {
  try {
    const { 
      category, 
      sort = 'name', 
      order = 'asc',
      page = 1,
      limit = 20
    } = req.query;
    
    // Build query
    const query = { status: 'approved' };
    
    if (category) {
      query.categories = category;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort criteria
    const sortOptions = {};
    sortOptions[sort === 'rating' ? 'rating.average' : sort] = order === 'asc' ? 1 : -1;
    
    // Get vendors
    const vendors = await Vendor.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('name slug logo banner description categories rating createdAt');
    
    const total = await Vendor.countDocuments(query);
    
    // Format response
    const formattedVendors = vendors.map(vendor => ({
      id: vendor._id,
      name: vendor.name,
      slug: vendor.slug,
      logo: vendor.logo,
      banner: vendor.banner,
      description: vendor.description,
      categories: vendor.categories,
      rating: vendor.rating,
      createdAt: vendor.createdAt
    }));
    
    res.status(200).json({
      message: "Vendors fetched successfully",
      vendors: formattedVendors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching vendors:", error.message);
    res.status(500).json({ message: "Error fetching vendors" });
  }
};

// Get vendor by ID or slug
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ID is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    
    // Find vendor by ID or slug
    const vendor = isValidObjectId
      ? await Vendor.findById(id)
      : await Vendor.findOne({ slug: id });
    
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    // Check if vendor is approved
    if (vendor.status !== 'approved') {
      return res.status(403).json({ message: "This vendor is not currently active" });
    }
    
    // Get vendor products count
    const productsCount = await Product.countDocuments({ vendorId: vendor._id });
    
    // Format response
    const vendorData = {
      id: vendor._id,
      name: vendor.name,
      slug: vendor.slug,
      logo: vendor.logo,
      banner: vendor.banner,
      description: vendor.description,
      categories: vendor.categories,
      rating: vendor.rating,
      address: {
        city: vendor.address.city,
        state: vendor.address.state,
        country: vendor.address.country
      },
      productsCount,
      socialLinks: vendor.socialLinks,
      policies: vendor.policies,
      createdAt: vendor.createdAt
    };
    
    res.status(200).json({
      message: "Vendor fetched successfully",
      vendor: vendorData
    });
  } catch (error) {
    console.error("Error fetching vendor:", error.message);
    res.status(500).json({ message: "Error fetching vendor" });
  }
};

// Register as a vendor
const registerAsVendor = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      description,
      categories,
      phone,
      email,
      address,
      businessInfo
    } = req.body;
    
    if (!name || !description || !categories || !address || !businessInfo) {
      return res.status(400).json({
        message: "Name, description, categories, address, and business info are required"
      });
    }
    
    // Check if user already has a vendor account
    const existingVendor = await Vendor.findOne({ userId });
    
    if (existingVendor) {
      return res.status(400).json({
        message: "You already have a vendor account",
        status: existingVendor.status
      });
    }
    
    // Check if vendor name is already taken
    const nameExists = await Vendor.findOne({ name });
    
    if (nameExists) {
      return res.status(400).json({
        message: "Vendor name already taken"
      });
    }
    
    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if slug is already taken
    const slugExists = await Vendor.findOne({ slug });
    
    if (slugExists) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      slug = `${slug}-${randomSuffix}`;
    }
    
    // Create vendor
    const vendor = await Vendor.create({
      userId,
      name,
      slug,
      description,
      categories,
      phone: phone || '',
      email: email || '',
      address,
      businessInfo,
      status: 'pending',
      createdAt: new Date()
    });
    
    // Update user role
    await user.findByIdAndUpdate(userId, {
      $set: { 
        vendorId: vendor._id,
        pendingVendorStatus: true
      }
    });
    
    res.status(201).json({
      message: "Vendor application submitted successfully. Pending approval.",
      vendor: {
        id: vendor._id,
        name: vendor.name,
        slug: vendor.slug,
        status: vendor.status
      }
    });
  } catch (error) {
    console.error("Error registering vendor:", error.message);
    res.status(500).json({ message: "Error registering vendor" });
  }
};

// Update vendor profile
const updateVendorProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vendorId = req.user.vendorId;
    const updates = req.body;
    
    // Find the vendor
    const vendor = await Vendor.findOne({ _id: vendorId, userId });
    
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    // Check if updating restricted fields while pending approval
    if (vendor.status === 'pending' && (
      updates.name !== undefined ||
      updates.businessInfo !== undefined
    )) {
      return res.status(403).json({
        message: "Cannot update business name or legal info while application is pending"
      });
    }
    
    // Check if vendor name is changed and already taken
    if (updates.name && updates.name !== vendor.name) {
      const nameExists = await Vendor.findOne({ 
        name: updates.name,
        _id: { $ne: vendorId }
      });
      
      if (nameExists) {
        return res.status(400).json({
          message: "Vendor name already taken"
        });
      }
      
      // Update slug if name changes
      updates.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Check if slug is already taken
      const slugExists = await Vendor.findOne({ 
        slug: updates.slug,
        _id: { $ne: vendorId }
      });
      
      if (slugExists) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        updates.slug = `${updates.slug}-${randomSuffix}`;
      }
    }
    
    // Apply updates
    updates.updatedAt = new Date();
    
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: updates },
      { new: true }
    );
    
    res.status(200).json({
      message: "Vendor profile updated successfully",
      vendor: {
        id: updatedVendor._id,
        name: updatedVendor.name,
        slug: updatedVendor.slug,
        description: updatedVendor.description,
        categories: updatedVendor.categories,
        logo: updatedVendor.logo,
        banner: updatedVendor.banner,
        address: updatedVendor.address,
        phone: updatedVendor.phone,
        email: updatedVendor.email,
        socialLinks: updatedVendor.socialLinks,
        policies: updatedVendor.policies
      }
    });
  } catch (error) {
    console.error("Error updating vendor profile:", error.message);
    res.status(500).json({ message: "Error updating vendor profile" });
  }
};

// Get vendor products
const getVendorProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      category, 
      sort = 'createdAt', 
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;
    
    // Check if vendor exists and is approved
    const vendor = await Vendor.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { slug: id }
      ],
      status: 'approved'
    });
    
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found or not active" });
    }
    
    // Build query
    const query = { vendorId: vendor._id };
    
    if (category) {
      query.category = category;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort criteria
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    // Get products
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Product.countDocuments(query);
    
    // Format response
    const formattedProducts = products.map(product => ({
      id: product._id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      discountedPrice: product.discount ? 
        product.price - (product.price * (product.discount / 100)) : 
        product.price,
      discount: product.discount || 0,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      category: product.category,
      rating: product.rating || 0,
      stock: product.stock,
      createdAt: product.createdAt
    }));
    
    res.status(200).json({
      message: "Vendor products fetched successfully",
      vendor: {
        id: vendor._id,
        name: vendor.name,
        slug: vendor.slug
      },
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching vendor products:", error.message);
    res.status(500).json({ message: "Error fetching vendor products" });
  }
};

// Add vendor product
const addVendorProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vendorId = req.user.vendorId;
    const {
      title,
      description,
      price,
      category,
      images,
      stock,
      variants,
      attributes,
      sku,
      weight,
      dimensions,
      shippingClass
    } = req.body;
    
    if (!title || !description || !price || !category) {
      return res.status(400).json({
        message: "Title, description, price, and category are required"
      });
    }
    
    // Find the vendor
    const vendor = await Vendor.findOne({ _id: vendorId, userId });
    
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    // Check if vendor is approved
    if (vendor.status !== 'approved') {
      return res.status(403).json({
        message: "Your vendor account must be approved to add products"
      });
    }
    
    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if slug is already taken
    const slugExists = await Product.findOne({ slug });
    
    const finalSlug = slugExists 
      ? `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
      : slug;
    
    // Create product
    const product = await Product.create({
      title,
      slug: finalSlug,
      description,
      price,
      category,
      images: images || [],
      stock: stock || 0,
      variants: variants || [],
      attributes: attributes || {},
      sku: sku || `${vendor.slug}-${Date.now()}`,
      weight: weight || 0,
      dimensions: dimensions || { length: 0, width: 0, height: 0 },
      shippingClass: shippingClass || 'standard',
      vendorId,
      createdAt: new Date()
    });
    
    res.status(201).json({
      message: "Product created successfully",
      product: {
        id: product._id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        category: product.category,
        stock: product.stock
      }
    });
  } catch (error) {
    console.error("Error adding product:", error.message);
    res.status(500).json({ message: "Error adding product" });
  }
};

// Update vendor product
const updateVendorProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vendorId = req.user.vendorId;
    const { id } = req.params;
    const updates = req.body;
    
    // Find the product
    const product = await Product.findOne({ 
      _id: id,
      vendorId
    });
    
    if (!product) {
      return res.status(404).json({ message: "Product not found or not owned by this vendor" });
    }
    
    // Check if title is changed and update slug
    if (updates.title && updates.title !== product.title) {
      const slug = updates.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Check if slug is already taken
      const slugExists = await Product.findOne({ 
        slug,
        _id: { $ne: id }
      });
      
      updates.slug = slugExists 
        ? `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
        : slug;
    }
    
    // Apply updates
    updates.updatedAt = new Date();
    
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
    
    res.status(200).json({
      message: "Product updated successfully",
      product: {
        id: updatedProduct._id,
        title: updatedProduct.title,
        slug: updatedProduct.slug,
        price: updatedProduct.price,
        category: updatedProduct.category,
        stock: updatedProduct.stock,
        images: updatedProduct.images
      }
    });
  } catch (error) {
    console.error("Error updating product:", error.message);
    res.status(500).json({ message: "Error updating product" });
  }
};

// Delete vendor product
const deleteVendorProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vendorId = req.user.vendorId;
    const { id } = req.params;
    
    // Find the product
    const product = await Product.findOne({ 
      _id: id,
      vendorId
    });
    
    if (!product) {
      return res.status(404).json({ message: "Product not found or not owned by this vendor" });
    }
    
    // Check if product is in any orders
    const ordersWithProduct = await Order.countDocuments({
      'items.productId': id,
      status: { $nin: ['delivered', 'cancelled', 'refunded'] }
    });
    
    if (ordersWithProduct > 0) {
      return res.status(400).json({
        message: "Cannot delete product that has active orders",
        activeOrders: ordersWithProduct
      });
    }
    
    // Delete the product
    await Product.findByIdAndDelete(id);
    
    res.status(200).json({
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting product:", error.message);
    res.status(500).json({ message: "Error deleting product" });
  }
};

// Get vendor dashboard
const getVendorDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vendorId = req.user.vendorId;
    
    // Find the vendor
    const vendor = await Vendor.findOne({ _id: vendorId, userId });
    
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    // Get summary metrics
    const totalProducts = await Product.countDocuments({ vendorId });
    
    const lowStockProducts = await Product.countDocuments({
      vendorId,
      stock: { $lte: 10, $gt: 0 }
    });
    
    const outOfStockProducts = await Product.countDocuments({
      vendorId,
      stock: 0
    });
    
    // Get recent orders
    const recentOrders = await Order.aggregate([
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      { $match: { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) } },
      {
        $group: {
          _id: '$_id',
          orderNumber: { $first: '$orderNumber' },
          createdAt: { $first: '$createdAt' },
          status: { $first: '$status' },
          items: { $push: '$items' },
          total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 }
    ]);
    
    // Get sales analytics
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthlySales = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $nin: ['cancelled', 'refunded'] } } },
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      { $match: { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) } },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orders: { $addToSet: '$_id' },
          itemsSold: { $sum: '$items.quantity' }
        }
      }
    ]);
    
    // Get top products
    const topProducts = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      { $match: { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) } },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$productInfo.title' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);
    
    res.status(200).json({
      message: "Vendor dashboard fetched successfully",
      vendor: {
        name: vendor.name,
        status: vendor.status
      },
      summary: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        monthlySales: monthlySales.length > 0 ? {
          revenue: monthlySales[0].revenue,
          orders: monthlySales[0].orders.length,
          itemsSold: monthlySales[0].itemsSold
        } : {
          revenue: 0,
          orders: 0,
          itemsSold: 0
        }
      },
      recentOrders,
      topProducts
    });
  } catch (error) {
    console.error("Error fetching vendor dashboard:", error.message);
    res.status(500).json({ message: "Error fetching vendor dashboard" });
  }
};

// Get vendor orders
const getVendorOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vendorId = req.user.vendorId;
    const { 
      status, 
      startDate, 
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    
    // Build query
    let matchStage = { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) };
    
    if (status) {
      matchStage['status'] = status;
    }
    
    if (startDate || endDate) {
      matchStage['createdAt'] = {};
      
      if (startDate) {
        matchStage['createdAt'].$gte = new Date(startDate);
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        matchStage['createdAt'].$lte = endDateTime;
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get vendor orders
    const vendorOrders = await Order.aggregate([
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      { $match: matchStage },
      {
        $group: {
          _id: '$_id',
          orderNumber: { $first: '$orderNumber' },
          createdAt: { $first: '$createdAt' },
          status: { $first: '$status' },
          customerInfo: { 
            $first: { 
              firstName: '$shippingAddress.firstName',
              lastName: '$shippingAddress.lastName',
              email: '$shippingAddress.email'
            }
          },
          items: { 
            $push: { 
              productId: '$items.productId',
              title: '$productInfo.title',
              quantity: '$items.quantity',
              price: '$items.price',
              total: { $multiply: ['$items.price', '$items.quantity'] }
            }
          },
          total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);
    
    // Get total count for pagination
    const totalOrders = await Order.aggregate([
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      { $match: matchStage },
      {
        $group: {
          _id: '$_id'
        }
      },
      { $count: 'total' }
    ]);
    
    const total = totalOrders.length > 0 ? totalOrders[0].total : 0;
    
    res.status(200).json({
      message: "Vendor orders fetched successfully",
      orders: vendorOrders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching vendor orders:", error.message);
    res.status(500).json({ message: "Error fetching vendor orders" });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vendorId = req.user.vendorId;
    const { id } = req.params;
    const { status, trackingNumber, carrier, note } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    // Check if status is valid
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be processing, shipped, delivered, or cancelled",
        validStatuses
      });
    }
    
    // Find the order
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if order has vendor's products
    const orderHasVendorProducts = await Order.aggregate([
      { $match: { _id: mongoose.Types.ObjectId.createFromHexString(id) } },
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      { $match: { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) } },
      { $count: 'count' }
    ]);
    

      if (orderHasVendorProducts.length === 0) {
        return res.status(403).json({ message: "This order does not contain any of your products" });
      }
      
      // Update order status
      // Since we have a marketplace model, we only update the status for this vendor's items
      const updatedItems = order.items.map(item => {
        const isVendorItem = async () => {
          const product = await Product.findById(item.productId);
          return product && product.vendorId.toString() === vendorId;
        };
        
        if (isVendorItem()) {
          return {
            ...item,
            vendorStatus: status
          };
        }
        return item;
      });
      
      // Update tracking info if provided
      let trackingInfo = order.trackingInfo || [];
      
      if (status === 'shipped' && (trackingNumber || carrier)) {
        // Add or update tracking info for this vendor
        const existingIndex = trackingInfo.findIndex(info => info.vendorId.toString() === vendorId);
        
        if (existingIndex !== -1) {
          trackingInfo[existingIndex] = {
            ...trackingInfo[existingIndex],
            trackingNumber: trackingNumber || trackingInfo[existingIndex].trackingNumber,
            carrier: carrier || trackingInfo[existingIndex].carrier,
            updatedAt: new Date()
          };
        } else {
          trackingInfo.push({
            vendorId,
            trackingNumber: trackingNumber || "",
            carrier: carrier || "",
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
      
      // Add status history entry
      const statusEntry = {
        status,
        vendorId,
        timestamp: new Date(),
        note: note || `Order status updated to ${status} by vendor`
      };
      
      const statusHistory = order.statusHistory || [];
      statusHistory.push(statusEntry);
      
      // Update the order
      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { 
          $set: { 
            items: updatedItems,
            trackingInfo,
            statusHistory
          }
        },
        { new: true }
      );
      
      res.status(200).json({
        message: "Order status updated successfully",
        order: {
          id: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          vendorStatus: status,
          trackingInfo: updatedOrder.trackingInfo.find(info => info.vendorId.toString() === vendorId)
        }
      });
    } catch (error) {
      console.error("Error updating order status:", error.message);
      res.status(500).json({ message: "Error updating order status" });
    }
   };
   
   // Get vendor payments
   const getVendorPayments = async (req, res) => {
    try {
      const userId = req.user.userId;
      const vendorId = req.user.vendorId;
      const { 
        status, 
        startDate, 
        endDate,
        page = 1,
        limit = 20
      } = req.query;
      
      // Build query
      const query = { vendorId };
      
      if (status) {
        query.status = status;
      }
      
      if (startDate || endDate) {
        query.createdAt = {};
        
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDateTime;
        }
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Get payments
      const payments = await VendorPayment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await VendorPayment.countDocuments(query);
      
      // Calculate summary
      const paymentSummary = await VendorPayment.aggregate([
        { $match: { vendorId: mongoose.Types.ObjectId.createFromHexString(vendorId) } },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Format summary
      const summary = {
        paid: { total: 0, count: 0 },
        pending: { total: 0, count: 0 },
        cancelled: { total: 0, count: 0 }
      };
      
      paymentSummary.forEach(item => {
        if (summary[item._id]) {
          summary[item._id] = {
            total: item.total,
            count: item.count
          };
        }
      });
      
      res.status(200).json({
        message: "Vendor payments fetched successfully",
        payments,
        summary,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching vendor payments:", error.message);
      res.status(500).json({ message: "Error fetching vendor payments" });
    }
   };
   
   // Get vendor reviews
   const getVendorReviews = async (req, res) => {
    try {
      const userId = req.user.userId;
      const vendorId = req.user.vendorId;
      const { 
        rating, 
        page = 1,
        limit = 20
      } = req.query;
      
      // Get products from this vendor
      const vendorProducts = await Product.find({ vendorId })
        .select('_id');
      
      const productIds = vendorProducts.map(product => product._id);
      
      // Build query
      const query = { 
        product: { $in: productIds },
        status: 'approved'
      };
      
      if (rating) {
        query.rating = parseInt(rating);
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Get reviews
      const reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'username avatar')
        .populate('product', 'title images');
      
      const total = await Review.countDocuments(query);
      
      // Calculate ratings summary
      const ratingsSummary = await Review.aggregate([
        { $match: { product: { $in: productIds }, status: 'approved' } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]);
      
      // Format ratings
      const ratings = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      };
      
      let totalReviews = 0;
      let totalRating = 0;
      
      ratingsSummary.forEach(item => {
        ratings[item._id] = item.count;
        totalReviews += item.count;
        totalRating += item._id * item.count;
      });
      
      const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;
      
      // Format reviews
      const formattedReviews = reviews.map(review => ({
        id: review._id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        user: review.user ? {
          id: review.user._id,
          username: review.user.username,
          avatar: review.user.avatar
        } : null,
        product: {
          id: review.product._id,
          title: review.product.title,
          image: review.product.images && review.product.images.length > 0 
            ? review.product.images[0] 
            : null
        },
        createdAt: review.createdAt
      }));
      
      res.status(200).json({
        message: "Vendor reviews fetched successfully",
        reviews: formattedReviews,
        summary: {
          average: parseFloat(averageRating),
          total: totalReviews,
          distribution: ratings
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching vendor reviews:", error.message);
      res.status(500).json({ message: "Error fetching vendor reviews" });
    }
   };
   
   // Get vendor statistics
   const getVendorStatistics = async (req, res) => {
    try {
      const userId = req.user.userId;
      const vendorId = req.user.vendorId;
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
        { $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }},
        { $unwind: '$items' },
        { 
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        { $match: { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) } },
        {
          $group: {
            _id: groupBy,
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            orders: { $addToSet: '$_id' },
            items: { $sum: '$items.quantity' },
            date: { $first: "$createdAt" }
          }
        },
        {
          $addFields: {
            dateStr: { $dateToString: { format: dateFormat, date: "$date" } },
            orderCount: { $size: "$orders" }
          }
        },
        { $sort: { date: 1 } }
      ]);
      
      // Get sales by category
      const salesByCategory = await Order.aggregate([
        { $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }},
        { $unwind: '$items' },
        { 
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        { $match: { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) } },
        {
          $group: {
            _id: '$productInfo.category',
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            items: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } }
      ]);
      
      // Get top products
      const topProducts = await Order.aggregate([
        { $match: { 
          createdAt: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }},
        { $unwind: '$items' },
        { 
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        { $match: { 'productInfo.vendorId': mongoose.Types.ObjectId.createFromHexString(vendorId) } },
        {
          $group: {
            _id: '$items.productId',
            title: { $first: '$productInfo.title' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            quantity: { $sum: '$items.quantity' }
          }
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 }
      ]);
      
      // Format data for response
      const formattedSalesByDate = salesByDate.map(item => ({
        date: item.dateStr,
        revenue: item.revenue,
        orders: item.orderCount,
        items: item.items
      }));
      
      // Calculate period totals
      const periodTotals = {
        revenue: salesByDate.reduce((sum, item) => sum + item.revenue, 0),
        orders: new Set(salesByDate.flatMap(item => item.orders)).size,
        items: salesByDate.reduce((sum, item) => sum + item.items, 0)
      };
      
      res.status(200).json({
        message: "Vendor statistics fetched successfully",
        period,
        salesByDate: formattedSalesByDate,
        salesByCategory,
        topProducts,
        totals: periodTotals
      });
    } catch (error) {
      console.error("Error fetching vendor statistics:", error.message);
      res.status(500).json({ message: "Error fetching vendor statistics" });
    }
   };
   
   // Admin: Get vendor applications
   const getVendorApplications = async (req, res) => {
    try {
      const { 
        status = 'pending', 
        page = 1,
        limit = 20
      } = req.query;
      
      // Build query
      const query = {};
      
      if (status !== 'all') {
        query.status = status;
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Get applications
      const applications = await Vendor.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'username email');
      
      const total = await Vendor.countDocuments(query);
      
      // Format response
      const formattedApplications = applications.map(app => ({
        id: app._id,
        name: app.name,
        description: app.description,
        categories: app.categories,
        user: app.userId ? {
          id: app.userId._id,
          username: app.userId.username,
          email: app.userId.email
        } : null,
        businessInfo: app.businessInfo,
        status: app.status,
        createdAt: app.createdAt
      }));
      
      res.status(200).json({
        message: "Vendor applications fetched successfully",
        applications: formattedApplications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching vendor applications:", error.message);
      res.status(500).json({ message: "Error fetching vendor applications" });
    }
   };
   
   // Admin: Approve vendor
   const approveVendor = async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      
      // Find the vendor
      const vendor = await Vendor.findById(id);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      if (vendor.status !== 'pending') {
        return res.status(400).json({
          message: `Cannot approve vendor that is already ${vendor.status}`
        });
      }
      
      // Update vendor status
      vendor.status = 'approved';
      vendor.adminNote = note || "Application approved";
      vendor.updatedAt = new Date();
      await vendor.save();
      
      // Update user role
      await user.findByIdAndUpdate(vendor.userId, {
        $set: { 
          role: 'vendor',
          pendingVendorStatus: false
        }
      });
      
      res.status(200).json({
        message: "Vendor approved successfully",
        vendor: {
          id: vendor._id,
          name: vendor.name,
          status: vendor.status
        }
      });
    } catch (error) {
      console.error("Error approving vendor:", error.message);
      res.status(500).json({ message: "Error approving vendor" });
    }
   };
   
   // Admin: Reject vendor
   const rejectVendor = async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          message: "Rejection reason is required"
        });
      }
      
      // Find the vendor
      const vendor = await Vendor.findById(id);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      if (vendor.status !== 'pending') {
        return res.status(400).json({
          message: `Cannot reject vendor that is already ${vendor.status}`
        });
      }
      
      // Update vendor status
      vendor.status = 'rejected';
      vendor.adminNote = reason;
      vendor.updatedAt = new Date();
      await vendor.save();
      
      // Update user status
      await user.findByIdAndUpdate(vendor.userId, {
        $set: { pendingVendorStatus: false }
      });
      
      res.status(200).json({
        message: "Vendor application rejected",
        vendor: {
          id: vendor._id,
          name: vendor.name,
          status: vendor.status
        }
      });
    } catch (error) {
      console.error("Error rejecting vendor:", error.message);
      res.status(500).json({ message: "Error rejecting vendor" });
    }
   };
   
   // Admin: Suspend vendor
   const suspendVendor = async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          message: "Suspension reason is required"
        });
      }
      
      // Find the vendor
      const vendor = await Vendor.findById(id);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      if (vendor.status !== 'approved') {
        return res.status(400).json({
          message: `Cannot suspend vendor that is not approved`
        });
      }
      
      // Update vendor status
      vendor.status = 'suspended';
      vendor.adminNote = reason;
      vendor.updatedAt = new Date();
      await vendor.save();
      
      // Update product status for this vendor
      await Product.updateMany(
        { vendorId: id },
        { $set: { active: false } }
      );
      
      res.status(200).json({
        message: "Vendor suspended successfully",
        vendor: {
          id: vendor._id,
          name: vendor.name,
          status: vendor.status
        }
      });
    } catch (error) {
      console.error("Error suspending vendor:", error.message);
      res.status(500).json({ message: "Error suspending vendor" });
    }
   };
   
   // Admin: Get vendor settlements
   const getVendorSettlements = async (req, res) => {
    try {
      const { 
        status, 
        vendorId,
        startDate, 
        endDate,
        page = 1,
        limit = 20
      } = req.query;
      
      // Build query
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (vendorId) {
        query.vendorId = vendorId;
      }
      
      if (startDate || endDate) {
        query.createdAt = {};
        
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDateTime;
        }
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Get settlements
      const settlements = await VendorSettlement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('vendorId', 'name');
      
      const total = await VendorSettlement.countDocuments(query);
      
      // Get settlement summary
      const summary = await VendorSettlement.aggregate([
        {
          $group: {
            _id: '$status',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Format summary
      const settlementSummary = {
        pending: { total: 0, count: 0 },
        paid: { total: 0, count: 0 },
        cancelled: { total: 0, count: 0 }
      };
      
      summary.forEach(item => {
        if (settlementSummary[item._id]) {
          settlementSummary[item._id] = {
            total: item.total,
            count: item.count
          };
        }
      });
      
      res.status(200).json({
        message: "Vendor settlements fetched successfully",
        settlements,
        summary: settlementSummary,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching vendor settlements:", error.message);
      res.status(500).json({ message: "Error fetching vendor settlements" });
    }
   };
   
   export {
    getAllVendors,
    getVendorById,
    registerAsVendor,
    updateVendorProfile,
    getVendorProducts,
    addVendorProduct,
    updateVendorProduct,
    deleteVendorProduct,
    getVendorDashboard,
    getVendorOrders,
    updateOrderStatus,
    getVendorPayments,
    getVendorReviews,
    getVendorStatistics,
    approveVendor,
    rejectVendor,
    suspendVendor,
    getVendorApplications,
    getVendorSettlements
   };