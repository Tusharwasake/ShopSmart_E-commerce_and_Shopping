import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
  images: {
    type: [String],
    required: true,
  },
  // Add these fields to your Product model
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
  },
  commission: {
    type: Number,
    default: 10, // 10% commission
  },
  vendorPrice: {
    type: Number,
  },
  isApproved: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Product = mongoose.model("Product", productSchema);

export { Product };
