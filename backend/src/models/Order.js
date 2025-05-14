// models/Order.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  image: {
    type: String,
    default: "",
  },
  attributes: {
    type: Object,
    default: {},
  },
  variant: {
    type: String,
    default: null,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const addressSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      default: "",
    },
    postalCode: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    transactionId: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  guestDetails: {
    email: String,
    firstName: String,
    lastName: String,
    phone: String,
  },
  orderNumber: {
    type: String,
    required: true,
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: addressSchema,
    required: true,
  },
  billingAddress: {
    type: addressSchema,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  paymentDetails: {
    type: Object,
    default: {},
  },
  subtotal: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    default: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  couponCode: {
    type: String,
    default: "",
  },
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partial-refund",
    ],
    default: "pending",
  },
  statusHistory: [statusHistorySchema],
  notes: {
    type: String,
    default: "",
  },
  trackingNumber: {
    type: String,
    default: "",
  },
  carrier: {
    type: String,
    default: "",
  },
  estimatedDelivery: Date,
  refund: refundSchema,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  taxDetails: [{
    rateId: mongoose.Schema.Types.ObjectId,
    name: String,
    rate: Number,
    taxableAmount: Number,
    taxAmount: Number,
    isCompound: Boolean
  }],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "guestDetails.email": 1 });


// Generate unique order number
orderSchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    // Find the highest order number and increment
    const lastOrder = await this.constructor
      .findOne()
      .sort({ orderNumber: -1 });

    if (lastOrder) {
      // Extract the numeric part and increment
      const lastNumber = parseInt(lastOrder.orderNumber.replace("ORD", ""));
      this.orderNumber = `ORD${(lastNumber + 1).toString().padStart(6, "0")}`;
    } else {
      // First order
      this.orderNumber = "ORD000001";
    }

    // Add to status history
    if (!this.statusHistory || this.statusHistory.length === 0) {
      this.statusHistory = [
        {
          status: this.status,
          timestamp: new Date(),
          note: "Order created",
        },
      ];
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Add status change to history
orderSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.status) {
    const newStatus = update.$set.status;
    const order = await this.model.findOne(this.getQuery());

    if (order && order.status !== newStatus) {
      update.$push = update.$push || {};
      update.$push.statusHistory = {
        status: newStatus,
        timestamp: new Date(),
        note: update.$set.statusNote || `Status changed to ${newStatus}`,
      };

      delete update.$set.statusNote;
    }
  }

  if (update.$set) {
    update.$set.updatedAt = new Date();
  }

  next();
});

export const Order = mongoose.model("Order", orderSchema);
