// orderController.js
import { Order } from "../models/Order.js";
import { user } from "../models/User.js";
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { Coupon } from "../models/Coupon.js";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "../services/emailService.js";
import mongoose from "mongoose";

// Create a new order from cart
const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      shippingAddress, 
      billingAddress, 
      paymentMethod, 
      paymentDetails, 
      shippingMethod,
      notes 
    } = req.body;
    
    // Validate required fields
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ 
        message: "Shipping address and payment method are required" 
      });
    }
    
    // Get user with cart items populated
    const userDoc = await user.findById(userId).populate({
      path: 'cart.productId',
      select: 'title price images stock discount variants'
    });
    
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!userDoc.cart || userDoc.cart.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    
    // Prepare order items and calculate totals
    const orderItems = [];
    let subtotal = 0;
    let totalDiscount = 0;
    
    for (const item of userDoc.cart) {
      if (!item.productId) continue;
      
      let price = item.productId.price;
      let variantName = null;
      let variantAttributes = null;
      let variantImage = null;
      
      // Handle variant pricing and details
      if (item.variantId && item.productId.variants && item.productId.variants.length > 0) {
        const variant = item.productId.variants.find(
          v => v._id.toString() === item.variantId.toString()
        );
        
        if (variant) {
          if (variant.price) {
            price = variant.price;
          }
          variantName = variant.name;
          variantAttributes = variant.attributes;
          variantImage = variant.image;
        }
      }
      
      // Apply product discount
      const discount = item.productId.discount || 0;
      const itemDiscount = price * (discount / 100) * item.quantity;
      totalDiscount += itemDiscount;
      
      const discountedPrice = price - (price * (discount / 100));
      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        productId: item.productId._id,
        variantId: item.variantId,
        name: item.productId.title,
        price: price,
        discount: discount,
        quantity: item.quantity,
        image: variantImage || (item.productId.images && item.productId.images.length > 0 ? item.productId.images[0] : ""),
        attributes: variantAttributes,
        variant: variantName,
        total: itemTotal
      });
    }
    
    // Apply coupon discount if any
    let couponDiscount = 0;
    let couponCode = null;
    
    if (userDoc.cart.coupon) {
      couponCode = userDoc.cart.coupon.code;
      
      // Calculate coupon discount
      if (userDoc.cart.coupon.discountType === 'percentage') {
        couponDiscount = (subtotal - totalDiscount) * (userDoc.cart.coupon.discountValue / 100);
      } else {
        couponDiscount = userDoc.cart.coupon.discountValue;
      }
      
      // Don't allow negative total
      if (couponDiscount > (subtotal - totalDiscount)) {
        couponDiscount = subtotal - totalDiscount;
      }
      
      // Add to used coupons if needed
      const coupon = await Coupon.findOne({ code: couponCode });
      if (coupon && coupon.oneTimeUse) {
        if (!userDoc.usedCoupons) {
          userDoc.usedCoupons = [];
        }
        
        userDoc.usedCoupons.push({
          code: couponCode,
          usedAt: new Date()
        });
        
        // Update coupon usage count
        await Coupon.updateOne(
          { code: couponCode },
          { $inc: { usageCount: 1 } }
        );
      }
    }
    
    // Calculate shipping cost
    // This is a simplified example; you might have more complex shipping rules
    let shippingCost = 0;
    if (shippingMethod === 'express') {
      shippingCost = 15.99;
    } else if (shippingMethod === 'standard') {
      shippingCost = 5.99;
    } else if (subtotal < 50) {
      shippingCost = 5.99; // Default shipping for orders under $50
    }
    
    // Calculate tax (simplified, typically 5-10% depending on region)
    const taxRate = 0.07; // 7%
    const taxableAmount = subtotal - totalDiscount - couponDiscount;
    const tax = taxableAmount * taxRate;
    
    // Calculate total
    const total = taxableAmount + tax + shippingCost;
    
    // Create the order
    const order = await Order.create({
      userId,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      paymentDetails: paymentDetails || {},
      subtotal,
      tax,
      shippingCost,
      discount: totalDiscount + couponDiscount,
      couponCode,
      total,
      status: 'pending',
      notes: notes || "",
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created'
      }]
    });
    
    // Clear the user's cart
    userDoc.cart = [];
    await userDoc.save();
    
    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(userDoc.email, {
        orderNumber: order.orderNumber,
        total: order.total,
        items: orderItems
      });
    } catch (emailError) {
      console.error("Error sending order confirmation email:", emailError);
      // Don't fail the order if email fails
    }
    
    res.status(201).json({
      message: "Order created successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error("Error creating order:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Validate checkout (check stock, validate coupon, etc.)
const validateCheckout = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userDoc = await user.findById(userId).populate({
      path: 'cart.productId',
      select: 'title price stock variants'
    });
    
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!userDoc.cart || userDoc.cart.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    
    const validationResults = {
      valid: true,
      items: [],
      outOfStock: [],
      invalidItems: []
    };
    
    // Validate each item in the cart
    for (const item of userDoc.cart) {
      if (!item.productId) {
        validationResults.invalidItems.push({
          itemId: item._id,
          reason: "Product no longer exists"
        });
        validationResults.valid = false;
        continue;
      }
      
      // Check stock
      if (item.variantId) {
        // Check variant stock
        let variant;
        if (item.productId.variants && item.productId.variants.length > 0) {
          variant = item.productId.variants.find(
            v => v._id.toString() === item.variantId.toString()
          );
        }
        
        if (!variant) {
          // Try to find in separate variants collection
          variant = await ProductVariant.findOne({ 
            _id: item.variantId, 
            productId: item.productId._id 
          });
        }
        
        if (!variant) {
          validationResults.invalidItems.push({
            itemId: item._id,
            productId: item.productId._id,
            title: item.productId.title,
            reason: "Variant no longer exists"
          });
          validationResults.valid = false;
          continue;
        }
        
        if (variant.stock < item.quantity) {
          validationResults.outOfStock.push({
            itemId: item._id,
            productId: item.productId._id,
            title: item.productId.title,
            variant: variant.name,
            requested: item.quantity,
            available: variant.stock
          });
          validationResults.valid = false;
          continue;
        }
      } else {
        // Check main product stock
        if (item.productId.stock < item.quantity) {
          validationResults.outOfStock.push({
            itemId: item._id,
            productId: item.productId._id,
            title: item.productId.title,
            requested: item.quantity,
            available: item.productId.stock
          });
          validationResults.valid = false;
          continue;
        }
      }
      
      // Item is valid
      validationResults.items.push({
        itemId: item._id,
        productId: item.productId._id,
        title: item.productId.title,
        variant: item.variantId ? "Variant exists" : null,
        quantity: item.quantity
      });
    }
    
    // Validate coupon if present
    if (userDoc.cart.coupon) {
      const coupon = await Coupon.findOne({
        code: userDoc.cart.coupon.code,
        active: true,
        expiryDate: { $gt: new Date() }
      });
      
      if (!coupon) {
        validationResults.valid = false;
        validationResults.couponError = "Coupon is invalid or expired";
      } else if (coupon.oneTimeUse) {
        // Check if user already used this coupon
        const alreadyUsed = userDoc.usedCoupons && userDoc.usedCoupons.some(
          c => c.code === coupon.code
        );
        
        if (alreadyUsed) {
          validationResults.valid = false;
          validationResults.couponError = "You have already used this coupon";
        }
      }
    }
    
    res.status(200).json(validationResults);
  } catch (error) {
    console.error("Error validating checkout:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create guest order
const createGuestOrder = async (req, res) => {
  try {
    const { 
      email, 
      firstName, 
      lastName,
      items, 
      shippingAddress, 
      billingAddress, 
      paymentMethod, 
      paymentDetails,
      shippingMethod,
      notes 
    } = req.body;
    
    // Validate required fields
    if (!email || !items || !items.length || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ 
        message: "Missing required fields" 
      });
    }
    
    // Verify items and calculate totals
    const orderItems = [];
    let subtotal = 0;
    let totalDiscount = 0;
    
    for (const item of items) {
      // Validate item structure
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ 
          message: "Invalid item format; productId and quantity required" 
        });
      }
      
      // Get product details
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productId}`
        });
      }
      
      let price = product.price;
      let variantName = null;
      let variantAttributes = null;
      let variantImage = null;
      
      // Handle variant
      if (item.variantId) {
        let variant;
        if (product.variants && product.variants.length > 0) {
          variant = product.variants.find(
            v => v._id.toString() === item.variantId.toString()
          );
        }
        
        if (!variant) {
          // Try to find in separate variants collection
          variant = await ProductVariant.findOne({ 
            _id: item.variantId, 
            productId: item.productId 
          });
        }
        
        if (!variant) {
          return res.status(404).json({
            message: `Variant not found: ${item.variantId}`
          });
        }
        
        if (variant.price) {
          price = variant.price;
        }
        variantName = variant.name;
        variantAttributes = variant.attributes;
        variantImage = variant.image;
        
        // Check stock
        if (variant.stock < item.quantity) {
          return res.status(400).json({
            message: `Not enough stock for variant ${variant.name}`,
            available: variant.stock,
            requested: item.quantity
          });
        }
        
        // Update variant stock
        if (product.variants && product.variants.length > 0) {
          const variantIndex = product.variants.findIndex(
            v => v._id.toString() === item.variantId.toString()
          );
          
          if (variantIndex !== -1) {
            product.variants[variantIndex].stock -= item.quantity;
            await product.save();
          } else {
            // Update separate variant collection
            await ProductVariant.updateOne(
              { _id: item.variantId },
              { $inc: { stock: -item.quantity } }
            );
          }
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: item.variantId },
            { $inc: { stock: -item.quantity } }
          );
        }
      } else {
        // Check main product stock
        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Not enough stock for product ${product.title}`,
            available: product.stock,
            requested: item.quantity
          });
        }
        
        // Update main product stock
        product.stock -= item.quantity;
        await product.save();
      }
      
      // Apply product discount
      const discount = product.discount || 0;
      const itemDiscount = price * (discount / 100) * item.quantity;
      totalDiscount += itemDiscount;
      
      const discountedPrice = price - (price * (discount / 100));
      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        productId: product._id,
        variantId: item.variantId,
        name: product.title,
        price: price,
        discount: discount,
        quantity: item.quantity,
        image: variantImage || (product.images && product.images.length > 0 ? product.images[0] : ""),
        attributes: variantAttributes,
        variant: variantName,
        total: itemTotal
      });
    }
    
    // Apply coupon if provided
    let couponDiscount = 0;
    let couponCode = null;
    
    if (req.body.couponCode) {
      const coupon = await Coupon.findOne({
        code: req.body.couponCode,
        active: true,
        expiryDate: { $gt: new Date() }
      });
      
      if (coupon) {
        couponCode = coupon.code;
        
        // Check minimum purchase requirement
        if (coupon.minimumPurchase && subtotal < coupon.minimumPurchase) {
          return res.status(400).json({
            message: `Minimum purchase of $${coupon.minimumPurchase} required for this coupon`,
            minimumPurchase: coupon.minimumPurchase,
            currentSubtotal: subtotal
          });
        }
        
        // Calculate coupon discount
        if (coupon.discountType === 'percentage') {
          couponDiscount = (subtotal - totalDiscount) * (coupon.discountValue / 100);
        } else {
          couponDiscount = coupon.discountValue;
        }
        
        // Don't allow negative total
        if (couponDiscount > (subtotal - totalDiscount)) {
          couponDiscount = subtotal - totalDiscount;
        }
        
        // Update coupon usage count
        await Coupon.updateOne(
          { code: couponCode },
          { $inc: { usageCount: 1 } }
        );
      }
    }
    
    // Calculate shipping cost
    let shippingCost = 0;
    if (shippingMethod === 'express') {
      shippingCost = 15.99;
    } else if (shippingMethod === 'standard') {
      shippingCost = 5.99;
    } else if (subtotal < 50) {
      shippingCost = 5.99; // Default shipping for orders under $50
    }
    
    // Calculate tax (simplified, typically 5-10% depending on region)
    const taxRate = 0.07; // 7%
    const taxableAmount = subtotal - totalDiscount - couponDiscount;
    const tax = taxableAmount * taxRate;
    
    // Calculate total
    const total = taxableAmount + tax + shippingCost;
    
    // Create the order
    const order = await Order.create({
      guestDetails: {
        email,
        firstName,
        lastName
      },
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      paymentDetails: paymentDetails || {},
      subtotal,
      tax,
      shippingCost,
      discount: totalDiscount + couponDiscount,
      couponCode,
      total,
      status: 'pending',
      notes: notes || "",
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Guest order created'
      }]
    });
    
    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(email, {
        orderNumber: order.orderNumber,
        total: order.total,
        items: orderItems
      });
    } catch (emailError) {
      console.error("Error sending order confirmation email:", emailError);
      // Don't fail the order if email fails
    }
    
    res.status(201).json({
      message: "Guest order created successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error("Error creating guest order:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if user has permission to view this order
    if (order.userId && order.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "You don't have permission to view this order" 
      });
    }
    
    res.status(200).json({
      message: "Order fetched successfully",
      order
    });
  } catch (error) {
    console.error("Error fetching order:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all orders for current user
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    
    // Build query
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Order.countDocuments(query);
    
    res.status(200).json({
      message: "Orders fetched successfully",
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching user orders:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all orders (admin)
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.createdAt = { $gte: startDate };
    } else if (endDate) {
      query.createdAt = { $lte: endDate };
    }
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Order.countDocuments(query);
    
    res.status(200).json({
      message: "Orders fetched successfully",
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching all orders:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update order status (admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, trackingNumber, carrier, estimatedDelivery } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if status is valid
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status", 
        validStatuses 
      });
    }
    
    // Don't allow going back to processing if already shipped
    if ((order.status === 'shipped' || order.status === 'delivered') && 
        (status === 'pending' || status === 'processing')) {
      return res.status(400).json({ 
        message: "Cannot change status back to processing or pending after shipping" 
      });
    }
    
    // Don't allow changes if already cancelled or refunded unless admin is making the change
    if ((order.status === 'cancelled' || order.status === 'refunded') &&
        req.user.role !== 'admin') {
      return res.status(400).json({ 
        message: "Cannot change status of cancelled or refunded orders" 
      });
    }
    
    // Prepare update object
    const updateData = { status };
    
    // Add tracking info if provided
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    
    if (carrier) {
      updateData.carrier = carrier;
    }
    
    if (estimatedDelivery) {
      updateData.estimatedDelivery = new Date(estimatedDelivery);
    }
    
    // Add status note for the history
    updateData.statusNote = note || `Status updated to ${status}`;
    
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    
    // If order is cancelled, restore stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await restoreOrderStock(order);
    }
    
    // Send status update email to customer
    try {
      // Get user email if this is a registered user
      let customerEmail;
      
      if (order.userId) {
        const customerUser = await user.findById(order.userId);
        if (customerUser) {
          customerEmail = customerUser.email;
        }
      } else if (order.guestDetails && order.guestDetails.email) {
        customerEmail = order.guestDetails.email;
      }
      
      if (customerEmail) {
        await sendOrderStatusUpdateEmail(customerEmail, {
          orderNumber: order.orderNumber,
          status,
          trackingNumber: updateData.trackingNumber,
          carrier: updateData.carrier
        });
      }
    } catch (emailError) {
      console.error("Error sending status update email:", emailError);
      // Don't fail the update if email fails
    }
    
    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Helper function to restore stock for cancelled/refunded orders
const restoreOrderStock = async (order) => {
  for (const item of order.items) {
    const product = await Product.findById(item.productId);
    
    if (product) {
      if (item.variantId) {
        // Restore variant stock
        if (product.variants && product.variants.length > 0) {
          const variantIndex = product.variants.findIndex(
            v => v._id.toString() === item.variantId.toString()
          );
          
          if (variantIndex !== -1) {
            product.variants[variantIndex].stock += item.quantity;
            await product.save();
          } else {
            // Update separate variant collection
            await ProductVariant.updateOne(
              { _id: item.variantId },
              { $inc: { stock: item.quantity } }
            );
          }
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: item.variantId },
            { $inc: { stock: item.quantity } }
          );
        }
      } else {
        // Restore main product stock
        product.stock += item.quantity;
        await product.save();
      }
    }
  }
};

// Cancel order (customer)
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if user has permission to cancel this order
    if (order.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "You don't have permission to cancel this order" 
      });
    }
    
    // Check if order can be cancelled
    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ 
        message: "Cannot cancel orders that have been shipped or delivered" 
      });
    }
    
// Check if order can be cancelled
if (order.status === 'shipped' || order.status === 'delivered') {
    return res.status(400).json({ 
      message: "Cannot cancel orders that have been shipped or delivered" 
    });
  }
  
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return res.status(400).json({ 
      message: "Order has already been cancelled or refunded" 
    });
  }
  
  // Update order status to cancelled
  const cancelNote = reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer';
  
  const updatedOrder = await Order.findByIdAndUpdate(
    id,
    { 
      $set: { 
        status: 'cancelled',
        'statusHistory.0.status': 'cancelled', 
        'statusHistory.0.timestamp': new Date(),
        'statusHistory.0.note': cancelNote
      }
    },
    { new: true }
  );
  
  // Restore stock
  await restoreOrderStock(order);
  
  // Send cancellation email
  try {
    let customerEmail;
    
    if (order.userId) {
      const customerUser = await user.findById(order.userId);
      if (customerUser) {
        customerEmail = customerUser.email;
      }
    } else if (order.guestDetails && order.guestDetails.email) {
      customerEmail = order.guestDetails.email;
    }
    
    if (customerEmail) {
      await sendOrderStatusUpdateEmail(customerEmail, {
        orderNumber: order.orderNumber,
        status: 'cancelled',
        note: cancelNote
      });
    }
  } catch (emailError) {
    console.error("Error sending cancellation email:", emailError);
    // Don't fail the cancellation if email fails
  }
  
  res.status(200).json({
    message: "Order cancelled successfully",
    order: updatedOrder
  });
} catch (error) {
  console.error("Error cancelling order:", error.message);
  res.status(500).json({ message: "Internal Server Error" });
}
};

// Process refund (admin)
const processRefund = async (req, res) => {
try {
  const { id } = req.params;
  const { amount, reason, refundTransactionId } = req.body;
  
  if (!amount) {
    return res.status(400).json({ message: "Refund amount is required" });
  }
  
  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  
  // Validate refund amount
  if (amount <= 0 || amount > order.total) {
    return res.status(400).json({ 
      message: "Invalid refund amount. Must be greater than 0 and not exceed the order total.",
      orderTotal: order.total,
      requestedAmount: amount
    });
  }
  
  // Process refund logic would go here (payment gateway integration)
  // This is just a placeholder
  
  // Update order status and add refund details
  const refundNote = reason || 'Refund processed by admin';
  
  // If full refund, change status to refunded
  const isFullRefund = amount >= order.total;
  const newStatus = isFullRefund ? 'refunded' : 'partial-refund';
  
  const refundDetails = {
    amount,
    date: new Date(),
    transactionId: refundTransactionId || 'manual-refund',
    reason: refundNote,
    processedBy: req.user.userId
  };
  
  const updateData = {
    status: newStatus,
    refund: refundDetails,
    statusNote: refundNote
  };
  
  const updatedOrder = await Order.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  );
  
  // If full refund, restore stock
  if (isFullRefund) {
    await restoreOrderStock(order);
  }
  
  // Send refund email
  try {
    let customerEmail;
    
    if (order.userId) {
      const customerUser = await user.findById(order.userId);
      if (customerUser) {
        customerEmail = customerUser.email;
      }
    } else if (order.guestDetails && order.guestDetails.email) {
      customerEmail = order.guestDetails.email;
    }
    
    if (customerEmail) {
      await sendOrderStatusUpdateEmail(customerEmail, {
        orderNumber: order.orderNumber,
        status: newStatus,
        refundAmount: amount,
        note: refundNote
      });
    }
  } catch (emailError) {
    console.error("Error sending refund email:", emailError);
    // Don't fail the refund if email fails
  }
  
  res.status(200).json({
    message: "Refund processed successfully",
    order: updatedOrder
  });
} catch (error) {
  console.error("Error processing refund:", error.message);
  res.status(500).json({ message: "Internal Server Error" });
}
};

// Get order invoice (PDF generation)
const getOrderInvoice = async (req, res) => {
try {
  const { id } = req.params;
  const userId = req.user.userId;
  
  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  
  // Check if user has permission to view this invoice
  if (order.userId && order.userId.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: "You don't have permission to view this invoice" 
    });
  }
  
  // In a real implementation, you would generate a PDF invoice here
  // This is a placeholder response
  const invoiceData = {
    orderNumber: order.orderNumber,
    date: order.createdAt,
    customerName: order.shippingAddress.firstName + ' ' + order.shippingAddress.lastName,
    items: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    shipping: order.shippingCost,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress
  };
  
  res.status(200).json({
    message: "Invoice data retrieved successfully",
    invoice: invoiceData
  });
  
  // In a real implementation, you would send the PDF:
  // res.setHeader('Content-Type', 'application/pdf');
  // res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
  // res.send(pdfBuffer);
} catch (error) {
  console.error("Error generating invoice:", error.message);
  res.status(500).json({ message: "Internal Server Error" });
}
};

// Get order tracking information
const getOrderTracking = async (req, res) => {
try {
  const { id } = req.params;
  const userId = req.user.userId;
  
  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  
  // Check if user has permission to view this order
  if (order.userId && order.userId.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: "You don't have permission to view this tracking information" 
    });
  }
  
  if (!order.trackingNumber) {
    return res.status(404).json({ message: "No tracking information available for this order" });
  }
  
  // In a real implementation, you would integrate with a shipping carrier's API
  // This is a placeholder response
  const trackingInfo = {
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier || 'Default Carrier',
    estimatedDelivery: order.estimatedDelivery,
    status: order.status,
    statusHistory: order.statusHistory
  };
  
  res.status(200).json({
    message: "Tracking information retrieved successfully",
    tracking: trackingInfo
  });
} catch (error) {
  console.error("Error retrieving tracking information:", error.message);
  res.status(500).json({ message: "Internal Server Error" });
}
};

// Get order statistics (admin)
const getOrderStatistics = async (req, res) => {
try {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  
  // Ensure endDate is the end of the day
  endDate.setHours(23, 59, 59, 999);
  
  // Count orders by status
  const ordersByStatus = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        total: { $sum: "$total" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  // Total sales by day
  const salesByDay = await Order.aggregate([
    { 
      $match: { 
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'refunded'] } 
      } 
    },
    {
      $group: {
        _id: { 
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        },
        count: { $sum: 1 },
        revenue: { $sum: "$total" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);
  
  // Format sales by day for easier frontend processing
  const formattedSalesByDay = salesByDay.map(day => ({
    date: `${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}`,
    orders: day.count,
    revenue: day.revenue
  }));
  
  // Top selling products
  const topProducts = await Order.aggregate([
    { 
      $match: { 
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'refunded'] } 
      } 
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        productName: { $first: "$items.name" },
        count: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  // Overall statistics
  const totalOrders = await Order.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  });
  
  const totalRevenue = await Order.aggregate([
    { 
      $match: { 
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'refunded'] } 
      } 
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total" }
      }
    }
  ]);
  
  const averageOrderValue = totalRevenue.length > 0 && totalOrders > 0 
    ? totalRevenue[0].total / totalOrders 
    : 0;
  
  res.status(200).json({
    message: "Order statistics retrieved successfully",
    period: {
      startDate,
      endDate
    },
    overview: {
      totalOrders,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      averageOrderValue
    },
    ordersByStatus,
    salesByDay: formattedSalesByDay,
    topProducts
  });
} catch (error) {
  console.error("Error retrieving order statistics:", error.message);
  res.status(500).json({ message: "Internal Server Error" });
}
};

// Resend order confirmation email
const resendOrderConfirmation = async (req, res) => {
try {
  const { id } = req.params;
  const userId = req.user.userId;
  
  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  
  // Check if user has permission to resend this confirmation
  if (order.userId && order.userId.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: "You don't have permission to resend this confirmation" 
    });
  }
  
  // Get user email
  let email;
  if (order.userId) {
    const userDoc = await user.findById(order.userId);
    email = userDoc ? userDoc.email : null;
  } else if (order.guestDetails && order.guestDetails.email) {
    email = order.guestDetails.email;
  }
  
  if (!email) {
    return res.status(400).json({ 
      message: "Could not find an email address for this order" 
    });
  }
  
  // Send confirmation email
  await sendOrderConfirmationEmail(email, {
    orderNumber: order.orderNumber,
    total: order.total,
    items: order.items
  });
  
  res.status(200).json({
    message: "Order confirmation email sent successfully",
    sentTo: email
  });
} catch (error) {
  console.error("Error resending confirmation email:", error.message);
  res.status(500).json({ message: "Internal Server Error" });
}
};

export {
createOrder,
getOrderById,
getUserOrders,
getAllOrders,
updateOrderStatus,
cancelOrder,
processRefund,
getOrderInvoice,
validateCheckout,
createGuestOrder,
getOrderTracking,
getOrderStatistics,
resendOrderConfirmation
};