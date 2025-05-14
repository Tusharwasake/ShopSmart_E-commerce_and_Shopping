// categoryController.js
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });

    res.status(200).json({
      message: "Categories fetched successfully",
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get category tree
const getCategoryTree = async (req, res) => {
  try {
    // Get all root categories (those without a parent)
    const rootCategories = await Category.find({ parent: null }).sort({
      name: 1,
    });

    // Function to recursively build the category tree
    const buildCategoryTree = async (categories) => {
      const result = [];

      for (const category of categories) {
        // Find children for this category
        const children = await Category.find({ parent: category._id }).sort({
          name: 1,
        });

        const categoryObj = {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          icon: category.icon,
        };

        if (children.length > 0) {
          categoryObj.children = await buildCategoryTree(children);
        }

        result.push(categoryObj);
      }

      return result;
    };

    const categoryTree = await buildCategoryTree(rootCategories);

    res.status(200).json({
      message: "Category tree fetched successfully",
      categories: categoryTree,
    });
  } catch (error) {
    console.error("Error fetching category tree:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category fetched successfully",
      category,
    });
  } catch (error) {
    console.error("Error fetching category:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, slug, description, parent, image, icon, attributes } =
      req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check for duplicate name
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });
    }

    // Generate slug if not provided
    const categorySlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    // Check for duplicate slug
    const existingSlug = await Category.findOne({ slug: categorySlug });

    if (existingSlug) {
      return res
        .status(400)
        .json({ message: "Category with this slug already exists" });
    }

    // Check if parent exists if provided
    if (parent) {
      const parentCategory = await Category.findById(parent);

      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const newCategory = await Category.create({
      name,
      slug: categorySlug,
      description: description || "",
      parent: parent || null,
      image: image || "",
      icon: icon || "",
      attributes: attributes || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, parent, image, icon, attributes } =
      req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check for circular reference
    if (parent && parent.toString() === id) {
      return res
        .status(400)
        .json({ message: "Category cannot be its own parent" });
    }

    // If updating parent, check if new parent exists
    if (parent) {
      const parentCategory = await Category.findById(parent);

      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found" });
      }

      // Check if new parent would create a circular reference
      const checkCircular = async (parentId, targetId) => {
        if (parentId.toString() === targetId.toString()) {
          return true;
        }

        const parent = await Category.findById(parentId);
        if (parent && parent.parent) {
          return checkCircular(parent.parent, targetId);
        }

        return false;
      };

      if (await checkCircular(parent, id)) {
        return res
          .status(400)
          .json({ message: "Circular category reference detected" });
      }
    }

    // Check for duplicate name
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "Category with this name already exists" });
      }
    }

    // Check for duplicate slug
    if (slug && slug !== category.slug) {
      const existingSlug = await Category.findOne({
        _id: { $ne: id },
        slug,
      });

      if (existingSlug) {
        return res
          .status(400)
          .json({ message: "Category with this slug already exists" });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (slug) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (parent !== undefined) updates.parent = parent;
    if (image !== undefined) updates.image = image;
    if (icon !== undefined) updates.icon = icon;
    if (attributes !== undefined) updates.attributes = attributes;

    updates.updatedAt = new Date();

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if category has subcategories
    const hasSubcategories = await Category.findOne({ parent: id });

    if (hasSubcategories) {
      return res.status(400).json({
        message:
          "Cannot delete category with subcategories. Please delete or reassign subcategories first.",
      });
    }

    // Check if products are using this category
    const productsUsingCategory = await Product.countDocuments({
      category: id,
    });

    if (productsUsingCategory > 0) {
      return res.status(400).json({
        message: `Cannot delete category with ${productsUsingCategory} products. Please reassign products first.`,
      });
    }

    await Category.findByIdAndDelete(id);

    res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get category products
const getCategoryProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;

    // Check if category exists
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Get all subcategory IDs recursively
    const getAllSubcategoryIds = async (categoryId) => {
      const subcategories = await Category.find({ parent: categoryId });

      let ids = [categoryId];

      for (const subcategory of subcategories) {
        const subIds = await getAllSubcategoryIds(subcategory._id);
        ids = [...ids, ...subIds];
      }

      return ids;
    };

    const categoryIds = await getAllSubcategoryIds(id);

    // Prepare sorting options
    const sortOptions = {};
    sortOptions[sort] = order;

    // Get products in category and subcategories
    const products = await Product.find({
      category: { $in: categoryIds },
    })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments({
      category: { $in: categoryIds },
    });

    res.status(200).json({
      message: "Category products fetched successfully",
      category: {
        _id: category._id,
        name: category.name,
        description: category.description,
      },
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching category products:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all subcategories
const getAllSubcategories = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find immediate subcategories
    const subcategories = await Category.find({ parent: id }).sort({ name: 1 });

    res.status(200).json({
      message: "Subcategories fetched successfully",
      category: {
        _id: category._id,
        name: category.name,
      },
      subcategories,
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get category attributes
const getCategoryAttributes = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Get all parent categories to inherit their attributes
    const getParentAttributes = async (categoryId) => {
      const category = await Category.findById(categoryId);

      if (!category || !category.parent) {
        return category?.attributes || [];
      }

      const parentAttributes = await getParentAttributes(category.parent);
      return [...(category.attributes || []), ...parentAttributes];
    };

    // Combine category's own attributes with inherited attributes
    const inheritedAttributes = await getParentAttributes(category.parent);
    const allAttributes = [
      ...(category.attributes || []),
      ...inheritedAttributes,
    ];

    // Remove duplicates
    const uniqueAttributes = Array.from(
      new Map(allAttributes.map((attr) => [attr.name, attr])).values()
    );

    res.status(200).json({
      message: "Category attributes fetched successfully",
      category: {
        _id: category._id,
        name: category.name,
      },
      attributes: uniqueAttributes,
    });
  } catch (error) {
    console.error("Error fetching category attributes:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  getCategoryTree,
  getAllSubcategories,
  getCategoryAttributes,
};
