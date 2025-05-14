// models/NotificationTemplate.js
import mongoose from "mongoose";

const notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  emailSubject: {
    type: String,
    default: "",
  },
  emailBody: {
    type: String,
    default: "",
  },
  smsText: {
    type: String,
    default: "",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
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
notificationTemplateSchema.index({ name: 1 }, { unique: true });
notificationTemplateSchema.index({ type: 1 });

export const NotificationTemplate = mongoose.model(
  "NotificationTemplate",
  notificationTemplateSchema
);
