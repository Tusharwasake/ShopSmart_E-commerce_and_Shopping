// models/Transaction.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "usd",
  },
  paymentProvider: {
    type: String,
    required: true,
  },
  paymentMethodId: {
    type: String,
  },
  providerTransactionId: {
    type: String,
  },
  paymentDetails: {
    type: Object,
    default: {},
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "refunded"],
    default: "pending",
  },
  failureReason: {
    type: String,
  },
  refundId: {
    type: String,
  },
  refundAmount: {
    type: Number,
  },
  refundReason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
transactionSchema.index({ userId: 1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ providerTransactionId: 1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
