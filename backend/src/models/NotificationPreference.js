// models/NotificationPreference.js
import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema(
  {
    orderConfirmation: {
      type: Boolean,
      default: true,
    },
    orderShipped: {
      type: Boolean,
      default: true,
    },
    orderDelivered: {
      type: Boolean,
      default: true,
    },
    orderCancellation: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: false,
    },
    stockAlerts: {
      type: Boolean,
      default: true,
    },
    priceDrops: {
      type: Boolean,
      default: true,
    },
    newsletter: {
      type: Boolean,
      default: false,
    },
    accountActivity: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const notificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    unique: true,
  },
  email: {
    type: preferenceSchema,
    default: () => ({}),
  },
  push: {
    type: preferenceSchema,
    default: () => ({}),
  },
  sms: {
    type: preferenceSchema,
    default: () => ({}),
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
notificationPreferenceSchema.index({ userId: 1 }, { unique: true });

export const NotificationPreference = mongoose.model(
  "NotificationPreference",
  notificationPreferenceSchema
);
