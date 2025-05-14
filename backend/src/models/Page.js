// models/Page.js
import mongoose from "mongoose";

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true, // This is enough — no need to add it again using .index()
  },
  content: {
    type: String,
    required: true,
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

// Remove the slug index to prevent duplication (already defined with `unique: true` above)
pageSchema.index({ published: 1 }); // This is fine to keep

export const Page = mongoose.model("Page", pageSchema);
