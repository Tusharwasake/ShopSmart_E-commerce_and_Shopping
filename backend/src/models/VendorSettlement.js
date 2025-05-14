// models/VendorSettlement.js
import mongoose from "mongoose";

const vendorSettlementSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  fees: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    required: true,
  },
  period: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  status: {
    type: String,
    enum: ["pending", "paid", "cancelled"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    default: "",
  },
  transactionId: {
    type: String,
    default: "",
  },
  note: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paidAt: {
    type: Date,
  },
});

// Create indexes for better performance
vendorSettlementSchema.index({ vendorId: 1 });
vendorSettlementSchema.index({ status: 1 });
vendorSettlementSchema.index({ createdAt: -1 });

export const VendorSettlement = mongoose.model(
  "VendorSettlement",
  vendorSettlementSchema
);
