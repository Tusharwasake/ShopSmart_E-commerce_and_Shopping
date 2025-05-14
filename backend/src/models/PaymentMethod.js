// models/PaymentMethod.js
import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["credit_card", "paypal", "bank_account"],
    required: true,
  },
  details: {
    type: Object,
    required: true,
  },
  billingAddress: {
    firstName: String,
    lastName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
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
paymentMethodSchema.index({ userId: 1 });
paymentMethodSchema.index({ isDefault: 1 });

export const PaymentMethod = mongoose.model(
  "PaymentMethod",
  paymentMethodSchema
);
