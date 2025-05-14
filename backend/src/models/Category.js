// models/Category.js
import mongoose from "mongoose";

const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["text", "number", "boolean", "select"],
    default: "text",
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: {
    type: [String],
    default: [],
  },
  filterable: {
    type: Boolean,
    default: true,
  },
  unit: String,
});

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // unique index defined here
  },
  slug: {
    type: String,
    required: true,
    unique: true, // unique index defined here
  },
  description: {
    type: String,
    default: "",
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
  image: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
  attributes: {
    type: [attributeSchema],
    default: [],
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

// Only text index added for search — no duplicates
categorySchema.index({ name: "text", description: "text" });

export const Category = mongoose.model("Category", categorySchema);
