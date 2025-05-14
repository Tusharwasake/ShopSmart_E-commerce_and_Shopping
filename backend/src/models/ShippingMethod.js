// models/ShippingMethod.js
import mongoose from "mongoose";

const shippingMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  zones: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingZone",
      required: true,
    },
  ],
  baseRate: {
    type: Number,
    default: 0,
  },
  rateType: {
    type: String,
    enum: ["flat", "weight", "percentage"],
    default: "flat",
  },
  weightRate: {
    type: Number,
    default: 0,
  },
  percentageRate: {
    type: Number,
    default: 0,
  },
  minimumRate: {
    type: Number,
    default: 0,
  },
  freeShippingThreshold: {
    type: Number,
    default: 0,
  },
  estimatedDeliveryDays: {
    type: Number,
    default: 3,
  },
  active: {
    type: Boolean,
    default: true,
  },
  position: {
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

// Create indexes for better performance
shippingMethodSchema.index({ active: 1 });
shippingMethodSchema.index({ position: 1 });
shippingMethodSchema.index({ zones: 1 });

export const ShippingMethod = mongoose.model(
  "ShippingMethod",
  shippingMethodSchema
);
