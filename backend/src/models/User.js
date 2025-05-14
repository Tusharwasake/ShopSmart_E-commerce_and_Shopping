// models/User.js
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "productVariant",
      default: null,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const savedItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "productVariant",
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    // Remove unique: true from here since we're defining it in the index below
  },
  role: {
    type: String,
    required: true,
    enum: ["user", "admin"],
    default: "user",
  },

  address: {
    street: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    zipCode: {
      type: String,
    },
  },

  phone: { type: String },

  cart: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
      },
      quantity: {
        type: Number,
        default: 1,
      },
    },
  ],

  wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
    },
  ],

  // Save for later items
  savedItems: {
    type: [savedItemSchema],
    default: [],
  },

  // Used coupon history
  usedCoupons: [
    {
      code: String,
      usedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  otp: {
    type: String,
    default: null,
  },

  otpExpires: {
    type: Date,
    default: null,
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

// Create indexes with options in one place only
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 });

// Update timestamp on changes
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const user = mongoose.model("user", userSchema);

export { user };
