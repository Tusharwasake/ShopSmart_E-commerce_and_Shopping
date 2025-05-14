// models/Banner.js
import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ""
  },
  imageUrl: {
    type: String,
    required: true
  },
  linkUrl: {
    type: String,
    default: ""
  },
  buttonText: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    required: true,
    enum: ['home_hero', 'home_slider', 'category_header', 'product_page', 'promo_banner']
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

 updatedAt: {
    type: Date,
    default: Date.now
  }
 });
 
 bannerSchema.index({ location: 1, active: 1 });
 bannerSchema.index({ startDate: 1, endDate: 1 });
 
 export const Banner = mongoose.model('Banner', bannerSchema);