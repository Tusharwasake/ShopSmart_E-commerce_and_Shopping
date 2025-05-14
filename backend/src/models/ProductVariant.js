// models/ProductVariant.js
import mongoose from "mongoose";

const variantAttributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const productVariantSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    // Removed unique: true to avoid duplicate index
  },
  price: {
    type: Number,
    required: true,
  },
  compareAtPrice: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    default: 0,
  },
  image: {
    type: String,
    default: "",
  },
  attributes: [variantAttributeSchema],
  active: {
    type: Boolean,
    default: true,
  },
  weight: {
    type: Number,
    default: 0,
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  position: {
    type: Number,
    default: 0,
  },
  barcode: {
    type: String,
    default: "",
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

// Create indexes for better performance - keeping the explicit index definition
productVariantSchema.index({ productId: 1 });
productVariantSchema.index({ sku: 1 }, { unique: true }); // Added unique: true here
productVariantSchema.index({ "attributes.name": 1, "attributes.value": 1 });

productVariantSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

export const ProductVariant = mongoose.model(
  "ProductVariant",
  productVariantSchema
);
