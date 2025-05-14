// models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    default: "",
  },
  comment: {
    type: String,
    default: "",
  },
  images: [String],
  verifiedPurchase: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: String,
  helpfulCount: {
    type: Number,
    default: 0,
  },
  helpfulBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  isReported: {
    type: Boolean,
    default: false,
  },
  reportedBy: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
      reason: String,
      date: Date,
    },
  ],
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
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ helpfulCount: -1 });
reviewSchema.index({ isReported: 1 });

// Ensure one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);
