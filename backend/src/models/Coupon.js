// models/Coupon.js
import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    // Remove unique: true from here since we're defining it in the index below
    uppercase: true,
  },
  description: {
    type: String,
    default: "",
  },
  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  minimumPurchase: {
    type: Number,
    default: 0,
  },
  maxDiscount: {
    type: Number,
    default: null,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  oneTimeUse: {
    type: Boolean,
    default: false,
  },
  usageLimitPerUser: {
    type: Number,
    default: null,
  },
  usageLimit: {
    type: Number,
    default: null,
  },
  usageCount: {
    type: Number,
    default: 0,
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

// Create indexes with options in one place only
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ active: 1 });

// Update timestamp on changes
couponSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Coupon = mongoose.model("Coupon", couponSchema);
