// models/InventoryHistory.js
import mongoose from "mongoose";

const inventoryHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  variantName: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    enum: ["increase", "decrease", "adjustment"],
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  newStock: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    default: "",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
inventoryHistorySchema.index({ productId: 1 });
inventoryHistorySchema.index({ variantId: 1 });
inventoryHistorySchema.index({ timestamp: -1 });
inventoryHistorySchema.index({ type: 1 });

export const InventoryHistory = mongoose.model(
  "InventoryHistory",
  inventoryHistorySchema
);
