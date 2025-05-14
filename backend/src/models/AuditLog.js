// models/AuditLog.js
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  details: {
    type: Object,
    default: {},
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
