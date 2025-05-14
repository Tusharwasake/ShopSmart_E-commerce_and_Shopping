// models/Blog.js
import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: {
    type: String,
    default: "",
  },
  featuredImage: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    default: "Uncategorized",
  },
  tags: {
    type: [String],
    default: [],
  },
  metaTitle: {
    type: String,
    default: "",
  },
  metaDescription: {
    type: String,
    default: "",
  },
  published: {
    type: Boolean,
    default: false,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
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

blogSchema.index({ published: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ createdAt: -1 });

export const Blog = mongoose.model("Blog", blogSchema);
