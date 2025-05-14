// models/TaxSettings.js
import mongoose from "mongoose";

const taxSettingsSchema = new mongoose.Schema({
  pricesIncludeTax: {
    type: Boolean,
    default: false,
  },
  calculateTaxBasedOn: {
    type: String,
    enum: ["shipping", "billing"],
    default: "shipping",
  },
  shippingTaxClass: {
    type: String,
    default: "standard",
  },
  roundTaxAtSubtotal: {
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

export const TaxSettings = mongoose.model("TaxSettings", taxSettingsSchema);
