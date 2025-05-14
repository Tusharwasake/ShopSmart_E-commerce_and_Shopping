// models/TaxRate.js
import mongoose from "mongoose";

const taxRateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaxZone",
    default: null,
  },
  productCategories: {
    type: [String],
    default: [],
  },
  isCompound: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: Number,
    default: 0,
  },
  active: {
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

// Create indexes for better performance
taxRateSchema.index({ zoneId: 1 });
taxRateSchema.index({ active: 1 });
taxRateSchema.index({ priority: 1 });
taxRateSchema.index({ productCategories: 1 });

export const TaxRate = mongoose.model("TaxRate", taxRateSchema);
