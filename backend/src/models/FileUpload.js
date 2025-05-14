// models/FileUpload.js
import mongoose from "mongoose";

const fileUploadSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalname: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  relatedTo: {
    model: {
      type: String,
      enum: ["Product", "User", "Category", "Banner", "Blog"],
      default: null,
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
});

// Create indexes for better performance
fileUploadSchema.index({ uploadedBy: 1 });
fileUploadSchema.index({ uploadedAt: -1 });
fileUploadSchema.index({ mimetype: 1 });
fileUploadSchema.index({ "relatedTo.model": 1, "relatedTo.id": 1 });

export const FileUpload = mongoose.model("FileUpload", fileUploadSchema);
