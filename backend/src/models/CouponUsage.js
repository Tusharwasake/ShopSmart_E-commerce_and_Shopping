// models/CouponUsage.js
import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  usedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
couponUsageSchema.index({ couponId: 1 });
couponUsageSchema.index({ userId: 1 });
couponUsageSchema.index({ usedAt: -1 });

export const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);
