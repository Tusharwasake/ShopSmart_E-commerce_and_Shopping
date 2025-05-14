// models/VendorPayment.js
import mongoose from "mongoose";

const vendorPaymentSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "cancelled"],
    default: "pending",
  },
  description: {
    type: String,
    default: "",
  },
  paymentMethod: {
    type: String,
    default: "",
  },
  paymentDetails: {
    type: Object,
    default: {},
  },
  transactionId: {
    type: String,
    default: "",
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VendorSettlement",
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
vendorPaymentSchema.index({ vendorId: 1 });
vendorPaymentSchema.index({ status: 1 });
vendorPaymentSchema.index({ createdAt: -1 });

export const VendorPayment = mongoose.model(
  "VendorPayment",
  vendorPaymentSchema
);
