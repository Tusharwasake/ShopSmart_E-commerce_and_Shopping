// models/SystemSettings.js
import mongoose from "mongoose";

const shippingOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    estimatedDays: {
      type: Number,
      default: 5,
    },
  },
  { _id: false }
);

const systemSettingsSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: true,
    default: "My E-Commerce Store",
  },
  contactEmail: {
    type: String,
    required: true,
    default: "contact@example.com",
  },
  currency: {
    type: String,
    default: "USD",
  },
  taxRate: {
    type: Number,
    default: 10,
  },
  shippingOptions: {
    type: [shippingOptionSchema],
    default: [
      { name: "Standard Shipping", price: 5.99, estimatedDays: 5 },
      { name: "Express Shipping", price: 15.99, estimatedDays: 2 },
    ],
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
  },
  allowGuestCheckout: {
    type: Boolean,
    default: true,
  },
  enableReviews: {
    type: Boolean,
    default: true,
  },
  requireReviewApproval: {
    type: Boolean,
    default: true,
  },
  enableWishlist: {
    type: Boolean,
    default: true,
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

export const SystemSettings = mongoose.model(
  "SystemSettings",
  systemSettingsSchema
);
