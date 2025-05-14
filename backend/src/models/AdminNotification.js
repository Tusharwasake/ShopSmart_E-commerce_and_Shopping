// models/AdminNotification.js
import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["order", "user", "product", "review", "inventory", "system"],
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String,
    default: "",
  },
  details: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
adminNotificationSchema.index({ read: 1 });
adminNotificationSchema.index({ type: 1 });
adminNotificationSchema.index({ createdAt: -1 });

export const AdminNotification = mongoose.model(
  "AdminNotification",
  adminNotificationSchema
);
