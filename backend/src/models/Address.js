// models/Address.js
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    default: "Home",
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  addressLine1: {
    type: String,
    required: true,
  },
  addressLine2: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    default: "",
  },
  postalCode: {
    type: String,
    default: "",
  },
  country: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
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
addressSchema.index({ userId: 1 });
addressSchema.index({ isDefault: 1 });

// Update timestamp on change
addressSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

export const Address = mongoose.model("Address", addressSchema);
