// models/NavigationMenu.js
import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    parent: {
      type: String,
      default: null,
    },
    children: {
      type: [Object],
      default: [],
    },
  },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const navigationMenuSchema = new mongoose.Schema({
  mainMenu: {
    type: [menuItemSchema],
    default: [],
  },
  footerMenu: {
    type: [menuItemSchema],
    default: [],
  },
  socialLinks: {
    type: [socialLinkSchema],
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

export const NavigationMenu = mongoose.model(
  "NavigationMenu",
  navigationMenuSchema
);
