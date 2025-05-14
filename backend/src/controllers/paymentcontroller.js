// paymentController.js
import { user } from "../models/User.js";
import { Order } from "../models/Order.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { Transaction } from "../models/Transaction.js";
import Stripe from "stripe";
import "dotenv/config";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Create payment intent (Stripe)
const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, currency = "usd", paymentMethodId, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    // Convert amount to cents/smallest currency unit
    const amountInCents = Math.round(amount * 100);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      payment_method: paymentMethodId || undefined,
      confirm: paymentMethodId ? true : false,
      customer: req.user.stripeCustomerId || undefined,
      metadata: {
        userId,
        orderId,
      },
    });

    // Create transaction record
    await Transaction.create({
      userId,
      orderId,
      amount,
      currency,
      paymentProvider: "stripe",
      paymentMethodId,
      providerTransactionId: paymentIntent.id,
      status: paymentIntent.status,
      createdAt: new Date(),
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error.message);
    res
      .status(500)
      .json({
        message: "Error processing payment request",
        error: error.message,
      });
  }
};

// Process payment (generic non-Stripe)
const processPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, orderId, paymentMethod, paymentDetails } = req.body;

    if (!amount || !orderId || !paymentMethod) {
      return res.status(400).json({
        message: "Amount, orderId, and paymentMethod are required",
      });
    }

    // Validate payment method
    if (
      !["credit_card", "paypal", "bank_transfer", "cash_on_delivery"].includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // Verify the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.userId.toString() !== userId) {
      return res.status(403).json({
        message: "You don't have permission to pay for this order",
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: "Payment can only be processed for pending orders",
      });
    }

    // Process payment based on method (this is a simplified example)
    let paymentStatus = "pending";
    let transactionId = `TRANS-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    if (paymentMethod === "cash_on_delivery") {
      paymentStatus = "pending"; // Payment will be collected upon delivery
    } else if (paymentMethod === "bank_transfer") {
      paymentStatus = "pending"; // Need to wait for bank confirmation
    } else {
      // Credit card and PayPal would typically involve a third-party API
      paymentStatus = "completed"; // For demonstration
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      orderId,
      amount: order.total,
      currency: "usd", // or get from request
      paymentProvider: paymentMethod,
      providerTransactionId: transactionId,
      paymentDetails,
      status: paymentStatus,
      createdAt: new Date(),
    });

    // Update order status if payment is completed
    if (paymentStatus === "completed") {
      order.status = "processing";
      order.paymentStatus = "paid";
      order.statusHistory.push({
        status: "processing",
        timestamp: new Date(),
        note: "Payment received, order being processed",
      });
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      paymentStatus,
      transactionId: transaction._id,
      orderStatus: order.status,
    });
  } catch (error) {
    console.error("Error processing payment:", error.message);
    res
      .status(500)
      .json({ message: "Error processing payment", error: error.message });
  }
};

// Handle webhook events from payment providers
const handlePaymentWebhook = async (req, res) => {
  const payload = req.body;
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;
    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;
      await handleFailedPayment(failedPayment);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
};

// Helper function to handle successful payments
const handleSuccessfulPayment = async (paymentIntent) => {
  try {
    const { userId, orderId } = paymentIntent.metadata;

    if (!orderId) return;

    // Update transaction status
    await Transaction.updateOne(
      { providerTransactionId: paymentIntent.id },
      {
        $set: {
          status: "completed",
          updatedAt: new Date(),
        },
      }
    );

    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
      order.status = "processing";
      order.paymentStatus = "paid";
      order.statusHistory.push({
        status: "processing",
        timestamp: new Date(),
        note: "Payment received, order being processed",
      });
      await order.save();
    }
  } catch (error) {
    console.error("Error handling successful payment:", error);
  }
};

// Helper function to handle failed payments
const handleFailedPayment = async (paymentIntent) => {
  try {
    const { userId, orderId } = paymentIntent.metadata;

    if (!orderId) return;

    // Update transaction status
    await Transaction.updateOne(
      { providerTransactionId: paymentIntent.id },
      {
        $set: {
          status: "failed",
          failureReason:
            paymentIntent.last_payment_error?.message || "Payment failed",
          updatedAt: new Date(),
        },
      }
    );

    // Update order status if needed
    const order = await Order.findById(orderId);
    if (order && order.status === "pending") {
      order.paymentStatus = "failed";
      order.statusHistory.push({
        status: order.status,
        timestamp: new Date(),
        note:
          "Payment failed: " +
          (paymentIntent.last_payment_error?.message || "Unknown error"),
      });
      await order.save();
    }
  } catch (error) {
    console.error("Error handling failed payment:", error);
  }
};

// Get saved payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;

    const paymentMethods = await PaymentMethod.find({ userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      message: "Payment methods fetched successfully",
      paymentMethods,
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error.message);
    res.status(500).json({ message: "Error fetching payment methods" });
  }
};

// Add payment method
const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, details, billingAddress, isDefault } = req.body;

    if (!type || !details) {
      return res
        .status(400)
        .json({ message: "Payment method type and details are required" });
    }

    // Validate payment method type
    if (!["credit_card", "paypal", "bank_account"].includes(type)) {
      return res.status(400).json({ message: "Invalid payment method type" });
    }

    // Mask sensitive data
    let maskedDetails = { ...details };

    if (type === "credit_card" && details.cardNumber) {
      maskedDetails.cardNumber = details.cardNumber.replace(
        /\d(?=\d{4})/g,
        "*"
      );
    } else if (type === "bank_account" && details.accountNumber) {
      maskedDetails.accountNumber = details.accountNumber.replace(
        /\d(?=\d{4})/g,
        "*"
      );
    }

    // If this is default, unset any existing default
    if (isDefault) {
      await PaymentMethod.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const paymentMethod = await PaymentMethod.create({
      userId,
      type,
      details: maskedDetails,
      billingAddress,
      isDefault: isDefault || false,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Payment method added successfully",
      paymentMethod,
    });
  } catch (error) {
    console.error("Error adding payment method:", error.message);
    res.status(500).json({ message: "Error adding payment method" });
  }
};

// Update payment method
const updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { billingAddress, isDefault } = req.body;

    const paymentMethod = await PaymentMethod.findOne({ _id: id, userId });

    if (!paymentMethod) {
      return res.status(404).json({ message: "Payment method not found" });
    }

    // Prepare updates
    const updates = {};

    if (billingAddress) updates.billingAddress = billingAddress;
    if (isDefault !== undefined) updates.isDefault = isDefault;

    // If setting as default, unset any existing default
    if (isDefault) {
      await PaymentMethod.updateMany(
        { userId, _id: { $ne: id }, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    updates.updatedAt = new Date();

    const updatedPaymentMethod = await PaymentMethod.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({
      message: "Payment method updated successfully",
      paymentMethod: updatedPaymentMethod,
    });
  } catch (error) {
    console.error("Error updating payment method:", error.message);
    res.status(500).json({ message: "Error updating payment method" });
  }
};

// Delete payment method
const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findOne({ _id: id, userId });

    if (!paymentMethod) {
      return res.status(404).json({ message: "Payment method not found" });
    }

    // Check if this is the only payment method
    const count = await PaymentMethod.countDocuments({ userId });

    if (count <= 1) {
      return res.status(400).json({
        message:
          "Cannot delete the only payment method. Please add another payment method first.",
      });
    }

    // If deleting the default payment method, set another one as default
    if (paymentMethod.isDefault) {
      const anotherPaymentMethod = await PaymentMethod.findOne({
        userId,
        _id: { $ne: id },
      });

      if (anotherPaymentMethod) {
        anotherPaymentMethod.isDefault = true;
        await anotherPaymentMethod.save();
      }
    }

    await PaymentMethod.findByIdAndDelete(id);

    res.status(200).json({
      message: "Payment method deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment method:", error.message);
    res.status(500).json({ message: "Error deleting payment method" });
  }
};

// Get user's payment transactions
const getTransactions = async (req, res) => {
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

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("orderId", "orderNumber");

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      message: "Transactions fetched successfully",
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: "Error fetching transactions" });
  }
};

// Get transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const transaction = await Transaction.findById(id).populate(
      "orderId",
      "orderNumber items total"
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Check if user has permission to view this transaction
    if (transaction.userId.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You don't have permission to view this transaction",
      });
    }

    res.status(200).json({
      message: "Transaction fetched successfully",
      transaction,
    });
  } catch (error) {
    console.error("Error fetching transaction:", error.message);
    res.status(500).json({ message: "Error fetching transaction" });
  }
};

// Get payment statistics (admin)
const getPaymentStatistics = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    // Ensure endDate is end of day
    endDate.setHours(23, 59, 59, 999);

    // Transactions by status
    const transactionsByStatus = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Transactions by payment provider
    const transactionsByProvider = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$paymentProvider",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Daily transaction volume
    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "completed",
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
          volume: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format daily transactions for easier frontend processing
    const formattedDailyTransactions = dailyTransactions.map((day) => ({
      date: `${day._id.year}-${day._id.month
        .toString()
        .padStart(2, "0")}-${day._id.day.toString().padStart(2, "0")}`,
      count: day.count,
      volume: day.volume,
    }));

    // Overall statistics
    const totalTransactions = await Transaction.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const successfulTransactions = await Transaction.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
    });

    const totalRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const successRate =
      totalTransactions > 0
        ? (successfulTransactions / totalTransactions) * 100
        : 0;

    res.status(200).json({
      message: "Payment statistics retrieved successfully",
      period: {
        startDate,
        endDate,
      },
      overview: {
        totalTransactions,
        successfulTransactions,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        successRate: successRate.toFixed(2),
      },
      transactionsByStatus,
      transactionsByProvider,
      dailyTransactions: formattedDailyTransactions,
    });
  } catch (error) {
    console.error("Error retrieving payment statistics:", error.message);
    res.status(500).json({ message: "Error retrieving payment statistics" });
  }
};

export {
  createPaymentIntent,
  processPayment,
  handlePaymentWebhook,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getTransactions,
  getTransactionById,
  getPaymentStatistics,
};
