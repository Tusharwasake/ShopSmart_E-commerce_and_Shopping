// models/ShippingZone.js
import mongoose from "mongoose";

const shippingZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  countries: {
    type: [String],
    required: true,
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
shippingZoneSchema.index({ countries: 1 });

export const ShippingZone = mongoose.model("ShippingZone", shippingZoneSchema);
