// controllers/variantController.js
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import mongoose from "mongoose";

// Get all variants for a product
const getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    const variants = await ProductVariant.find({ productId }).sort({
      position: 1,
    });

    res.status(200).json({
      message: "Product variants fetched successfully",
      variants,
    });
  } catch (error) {
    console.error("Error fetching variants:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get variant by ID
const getVariantById = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await ProductVariant.findById(id);

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    res.status(200).json({
      message: "Variant fetched successfully",
      variant,
    });
  } catch (error) {
    console.error("Error fetching variant:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create new variant
const createVariant = async (req, res) => {
  try {
    const {
      productId,
      name,
      sku,
      price,
      compareAtPrice,
      stock,
      image,
      attributes,
      weight,
      dimensions,
      barcode,
    } = req.body;

    if (!productId || !name || !sku || price === undefined) {
      return res.status(400).json({
        message:
          "Missing required fields: productId, name, sku, and price are required",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if SKU is unique
    const existingSku = await ProductVariant.findOne({ sku });

    if (existingSku) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    // Find highest position value to place new variant at end
    const highestPosition = await ProductVariant.findOne({ productId })
      .sort({ position: -1 })
      .select("position");

    const position = highestPosition ? highestPosition.position + 1 : 0;

    const newVariant = await ProductVariant.create({
      productId,
      name,
      sku,
      price,
      compareAtPrice: compareAtPrice || 0,
      stock: stock || 0,
      image: image || "",
      attributes: attributes || [],
      weight: weight || 0,
      dimensions: dimensions || { length: 0, width: 0, height: 0 },
      position,
      barcode: barcode || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Variant created successfully",
      variant: newVariant,
    });
  } catch (error) {
    console.error("Error creating variant:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update variant
const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      sku,
      price,
      compareAtPrice,
      stock,
      image,
      attributes,
      active,
      weight,
      dimensions,
      barcode,
    } = req.body;

    const variant = await ProductVariant.findById(id);

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Check if SKU is unique if it's being changed
    if (sku && sku !== variant.sku) {
      const existingSku = await ProductVariant.findOne({
        sku,
        _id: { $ne: id },
      });

      if (existingSku) {
        return res.status(400).json({ message: "SKU already exists" });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (sku) updates.sku = sku;
    if (price !== undefined) updates.price = price;
    if (compareAtPrice !== undefined) updates.compareAtPrice = compareAtPrice;
    if (stock !== undefined) updates.stock = stock;
    if (image !== undefined) updates.image = image;
    if (attributes) updates.attributes = attributes;
    if (active !== undefined) updates.active = active;
    if (weight !== undefined) updates.weight = weight;
    if (dimensions) updates.dimensions = dimensions;
    if (barcode !== undefined) updates.barcode = barcode;

    updates.updatedAt = new Date();

    const updatedVariant = await ProductVariant.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({
      message: "Variant updated successfully",
      variant: updatedVariant,
    });
  } catch (error) {
    console.error("Error updating variant:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete variant
const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await ProductVariant.findById(id);

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Check if this variant is the only one for the product
    const variantCount = await ProductVariant.countDocuments({
      productId: variant.productId,
    });

    if (variantCount <= 1) {
      return res.status(400).json({
        message:
          "Cannot delete the only variant of a product. A product must have at least one variant.",
      });
    }

    await ProductVariant.findByIdAndDelete(id);

    res.status(200).json({
      message: "Variant deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting variant:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update variant positions (for drag and drop reordering)
const updateVariantPositions = async (req, res) => {
  try {
    const { positions } = req.body;

    if (!Array.isArray(positions)) {
      return res.status(400).json({
        message: "Positions must be an array of {id, position} objects",
      });
    }

    const updates = positions.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { position: item.position, updatedAt: new Date() } },
      },
    }));

    await ProductVariant.bulkWrite(updates);

    res.status(200).json({
      message: "Variant positions updated successfully",
    });
  } catch (error) {
    console.error("Error updating variant positions:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Bulk update variant stock
const bulkUpdateVariantStock = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        message: "Updates must be an array of {id, stock} objects",
      });
    }

    const bulkOps = updates.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { stock: item.stock, updatedAt: new Date() } },
      },
    }));

    const result = await ProductVariant.bulkWrite(bulkOps);

    res.status(200).json({
      message: "Variant stock updated successfully",
      updated: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating variant stock:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get low stock variants
const getLowStockVariants = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const variants = await ProductVariant.find({
      stock: { $lte: threshold },
      active: true,
    })
      .sort({ stock: 1 })
      .skip(skip)
      .limit(limit)
      .populate("productId", "title");

    const total = await ProductVariant.countDocuments({
      stock: { $lte: threshold },
      active: true,
    });

    res.status(200).json({
      message: "Low stock variants fetched successfully",
      variants,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching low stock variants:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export {
  getProductVariants,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  updateVariantPositions,
  bulkUpdateVariantStock,
  getLowStockVariants,
};
