// models/HomeContent.js
import mongoose from "mongoose";

const heroSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Welcome to Our Store",
    },
    subtitle: {
      type: String,
      default: "Shop the latest products",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    buttonText: {
      type: String,
      default: "Shop Now",
    },
    buttonLink: {
      type: String,
      default: "/products",
    },
  },
  { _id: false }
);

const featuredCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const featuredProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const promoSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    buttonText: {
      type: String,
      default: "",
    },
    buttonLink: {
      type: String,
      default: "",
    },
    backgroundColor: {
      type: String,
      default: "#f8f9fa",
    },
    textColor: {
      type: String,
      default: "#212529",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const homeContentSchema = new mongoose.Schema({
  heroSection: {
    type: heroSectionSchema,
    default: () => ({}),
  },
  featuredCategories: {
    type: [featuredCategorySchema],
    default: [],
  },
  featuredProducts: {
    type: [featuredProductSchema],
    default: [],
  },
  promoSections: {
    type: [promoSectionSchema],
    default: [],
  },
  testimonials: {
    type: [testimonialSchema],
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

export const HomeContent = mongoose.model("HomeContent", homeContentSchema);
