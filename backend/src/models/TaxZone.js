// models/TaxZone.js
import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
    },
    states: {
      type: [String],
      default: [],
    },
    postalCodes: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const taxZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  locations: {
    type: [locationSchema],
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
taxZoneSchema.index({ "locations.country": 1 });
taxZoneSchema.index({ "locations.states": 1 });
taxZoneSchema.index({ "locations.postalCodes": 1 });

export const TaxZone = mongoose.model("TaxZone", taxZoneSchema);
