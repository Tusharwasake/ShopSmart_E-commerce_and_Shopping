// models/SearchQuery.js
import mongoose from "mongoose";

const searchQuerySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    // index: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  resultCount: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
searchQuerySchema.index({ query: 1 });
searchQuerySchema.index({ timestamp: -1 });
searchQuerySchema.index({ count: -1 });

export const SearchQuery = mongoose.model("SearchQuery", searchQuerySchema);
