// models/Vendor.js
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const businessInfoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["individual", "company", "nonprofit"],
      default: "individual",
    },
    taxId: String,
    registrationNumber: String,
    documents: [String],
  },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  {
    platform: String,
    url: String,
  },
  { _id: false }
);

const policySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["return", "shipping", "privacy", "terms"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const ratingSchema = new mongoose.Schema(
  {
    average: {
      type: Number,
      default: 0,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    default: "",
  },
  banner: {
    type: String,
    default: "",
  },
  categories: {
    type: [String],
    required: true,
  },
  phone: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  address: {
    type: addressSchema,
    required: true,
  },
  businessInfo: {
    type: businessInfoSchema,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending",
  },
  adminNote: {
    type: String,
    default: "",
  },
  rating: {
    type: ratingSchema,
    default: () => ({}),
  },
  socialLinks: {
    type: [socialLinkSchema],
    default: [],
  },
  policies: {
    type: [policySchema],
    default: [],
  },
  commissionRate: {
    type: Number,
    default: 10, // 10% commission
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
vendorSchema.index({ name: 1 });
vendorSchema.index({ slug: 1 }, { unique: true });
vendorSchema.index({ status: 1 });
vendorSchema.index({ categories: 1 });
vendorSchema.index({ "rating.average": -1 });

export const Vendor = mongoose.model("Vendor", vendorSchema);
