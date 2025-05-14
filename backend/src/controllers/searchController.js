// searchController.js
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { SearchQuery } from "../models/SearchQuery.js";
import mongoose from "mongoose";

// Main search function for products
const searchProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      minPrice,
      maxPrice,
      sort = "relevance",
      order = "desc",
      page = 1,
      limit = 12,
    } = req.query;

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build the base query
    let query = {};

    // Add keyword search if provided
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
        { "variants.name": { $regex: keyword, $options: "i" } },
      ];
    }

    // Add category filter if provided
    if (category) {
      query.category = { $regex: new RegExp(category, "i") };
    }

    // Add price range filter if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Determine sort order
    const sortOptions = {};
    switch (sort) {
      case "price":
        sortOptions.price = order === "asc" ? 1 : -1;
        break;
      case "newest":
        sortOptions.createdAt = -1;
        break;
      case "rating":
        sortOptions.rating = -1;
        break;
      case "popularity":
        sortOptions.soldCount = -1;
        break;
      case "relevance":
      default:
        // For relevance, we'll use text score if keyword is provided
        if (keyword) {
          sortOptions.score = { $meta: "textScore" };
        } else {
          sortOptions.createdAt = -1;
        }
        break;
    }

    // Execute the query
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select("title price images discount stock rating category");

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Calculate aggregated data for filters
    const priceRange = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);

    const categories = await Product.aggregate([
      { $match: query },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Format the response
    const formattedProducts = products.map((product) => ({
      id: product._id,
      title: product.title,
      price: product.price,
      discountedPrice: product.discount
        ? product.price - product.price * (product.discount / 100)
        : product.price,
      discount: product.discount || 0,
      image:
        product.images && product.images.length > 0 ? product.images[0] : null,
      rating: product.rating || 0,
      category: product.category,
      inStock: product.stock > 0,
    }));

    // Record the search query for analytics (if keyword provided)
    if (keyword) {
      recordSearchQueryInternal(keyword, products.length);
    }

    res.status(200).json({
      message: "Search results fetched successfully",
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
      filters: {
        priceRange:
          priceRange.length > 0
            ? {
                min: priceRange[0].minPrice,
                max: priceRange[0].maxPrice,
              }
            : { min: 0, max: 0 },
        categories: categories.map((c) => ({
          name: c._id,
          count: c.count,
        })),
      },
    });
  } catch (error) {
    console.error("Error searching products:", error.message);
    res
      .status(500)
      .json({ message: "Error searching products", error: error.message });
  }
};

// Get search suggestions
const searchSuggestions = async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query || query.length < 2) {
      return res.status(200).json({
        suggestions: [],
      });
    }

    // Get product title suggestions
    const productSuggestions = await Product.find({
      title: { $regex: query, $options: "i" },
    })
      .select("title")
      .limit(parseInt(limit));

    // Get category suggestions
    const categorySuggestions = await Category.find({
      name: { $regex: query, $options: "i" },
    })
      .select("name")
      .limit(3);

    // Get popular search queries that match
    const querySuggestions = await SearchQuery.find({
      query: { $regex: query, $options: "i" },
      resultCount: { $gt: 0 }, // Only suggest queries that had results
    })
      .sort({ count: -1 })
      .select("query")
      .limit(3);

    // Combine and format all suggestions
    const suggestions = [
      ...productSuggestions.map((p) => ({
        type: "product",
        text: p.title,
        id: p._id,
      })),
      ...categorySuggestions.map((c) => ({
        type: "category",
        text: c.name,
        id: c._id,
      })),
      ...querySuggestions.map((q) => ({
        type: "query",
        text: q.query,
      })),
    ];

    // Remove duplicates and limit results
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map((s) => [s.text.toLowerCase(), s])).values()
    ).slice(0, parseInt(limit));

    res.status(200).json({
      suggestions: uniqueSuggestions,
    });
  } catch (error) {
    console.error("Error getting search suggestions:", error.message);
    res.status(500).json({ message: "Error getting search suggestions" });
  }
};

// Get popular searches
const getPopularSearches = async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get popular searches from the last X days
    const popularSearches = await SearchQuery.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          resultCount: { $gt: 0 }, // Only include searches with results
        },
      },
      {
        $group: {
          _id: "$query",
          count: { $sum: "$count" },
          resultCount: { $avg: "$resultCount" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      popularSearches: popularSearches.map((s) => ({
        query: s._id,
        count: s.count,
        averageResults: Math.round(s.resultCount),
      })),
    });
  } catch (error) {
    console.error("Error getting popular searches:", error.message);
    res.status(500).json({ message: "Error getting popular searches" });
  }
};

// Record search query for analytics
const recordSearchQuery = async (req, res) => {
  try {
    const { query, resultCount } = req.body;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    await recordSearchQueryInternal(query, resultCount || 0);

    res.status(200).json({
      message: "Search query recorded successfully",
    });
  } catch (error) {
    console.error("Error recording search query:", error.message);
    res.status(500).json({ message: "Error recording search query" });
  }
};

// Helper function to record search queries
const recordSearchQueryInternal = async (query, resultCount) => {
  try {
    // Normalize the query (lowercase, trim)
    const normalizedQuery = query.toLowerCase().trim();

    // Find existing query or create new one
    const existingQuery = await SearchQuery.findOne({
      query: normalizedQuery,
    });

    if (existingQuery) {
      // Update existing query
      existingQuery.count += 1;
      existingQuery.timestamp = new Date();
      existingQuery.resultCount = resultCount;
      await existingQuery.save();
    } else {
      // Create new query record
      await SearchQuery.create({
        query: normalizedQuery,
        count: 1,
        timestamp: new Date(),
        resultCount: resultCount,
      });
    }
  } catch (error) {
    console.error("Error in recordSearchQueryInternal:", error);
  }
};

// Search by category
const searchByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { sort = "newest", order = "desc", page = 1, limit = 12 } = req.query;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find category (to get subcategories if any)
    const categoryDoc = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(category, "i") } },
        { slug: category },
      ],
    });

    // Build query
    let query = {
      category: { $regex: new RegExp(category, "i") },
    };

    // If category found and has subcategories, include them in search
    if (
      categoryDoc &&
      categoryDoc.subcategories &&
      categoryDoc.subcategories.length > 0
    ) {
      const categoryNames = [
        categoryDoc.name,
        ...categoryDoc.subcategories.map((sub) => sub.name),
      ];

      query = {
        category: { $in: categoryNames.map((name) => new RegExp(name, "i")) },
      };
    }

    // Determine sort order
    const sortOptions = {};
    switch (sort) {
      case "price":
        sortOptions.price = order === "asc" ? 1 : -1;
        break;
      case "newest":
        sortOptions.createdAt = -1;
        break;
      case "rating":
        sortOptions.rating = -1;
        break;
      case "popularity":
        sortOptions.soldCount = -1;
        break;
      default:
        sortOptions.createdAt = -1;
        break;
    }

    // Execute query
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select("title price images discount stock rating category");

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Format the response
    const formattedProducts = products.map((product) => ({
      id: product._id,
      title: product.title,
      price: product.price,
      discountedPrice: product.discount
        ? product.price - product.price * (product.discount / 100)
        : product.price,
      discount: product.discount || 0,
      image:
        product.images && product.images.length > 0 ? product.images[0] : null,
      rating: product.rating || 0,
      category: product.category,
      inStock: product.stock > 0,
    }));

    res.status(200).json({
      message: `Products in category "${category}" fetched successfully`,
      category: categoryDoc
        ? {
            name: categoryDoc.name,
            description: categoryDoc.description,
            subcategories: categoryDoc.subcategories || [],
          }
        : { name: category },
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error searching by category:", error.message);
    res.status(500).json({ message: "Error searching by category" });
  }
};

// Advanced search with filters
const searchByFilter = async (req, res) => {
  try {
    const {
      keyword,
      categories,
      priceRange,
      rating,
      brands,
      attributes,
      stock,
      discount,
      sort = "relevance",
      order = "desc",
      page = 1,
      limit = 12,
    } = req.body;

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = {};

    // Add keyword search if provided
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
        { "variants.name": { $regex: keyword, $options: "i" } },
      ];
    }

    // Add category filter if provided
    if (categories && categories.length > 0) {
      query.category = { $in: categories.map((cat) => new RegExp(cat, "i")) };
    }

    // Add price range filter if provided
    if (priceRange) {
      query.price = {};
      if (priceRange.min !== undefined)
        query.price.$gte = parseFloat(priceRange.min);
      if (priceRange.max !== undefined)
        query.price.$lte = parseFloat(priceRange.max);
    }

    // Add rating filter
    if (rating) {
      query.rating = { $gte: parseInt(rating) };
    }

    // Add brand filter
    if (brands && brands.length > 0) {
      query.brand = { $in: brands.map((brand) => new RegExp(brand, "i")) };
    }

    // Add stock filter
    if (stock !== undefined) {
      query.stock = stock === true ? { $gt: 0 } : { $eq: 0 };
    }

    // Add discount filter
    if (discount !== undefined) {
      query.discount = discount === true ? { $gt: 0 } : { $eq: 0 };
    }

    // Add attribute filters
    if (attributes && Object.keys(attributes).length > 0) {
      Object.entries(attributes).forEach(([key, values]) => {
        if (values && values.length > 0) {
          // Filter products with matching attribute values
          query[`attributes.${key}`] = { $in: values };
        }
      });
    }

    // Determine sort order
    const sortOptions = {};
    switch (sort) {
      case "price":
        sortOptions.price = order === "asc" ? 1 : -1;
        break;
      case "newest":
        sortOptions.createdAt = -1;
        break;
      case "rating":
        sortOptions.rating = -1;
        break;
      case "popularity":
        sortOptions.soldCount = -1;
        break;
      case "discount":
        sortOptions.discount = -1;
        break;
      case "relevance":
      default:
        if (keyword) {
          sortOptions.score = { $meta: "textScore" };
        } else {
          sortOptions.createdAt = -1;
        }
        break;
    }

    // Execute query
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title price images discount stock rating category brand attributes"
      );

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Format the response
    const formattedProducts = products.map((product) => ({
      id: product._id,
      title: product.title,
      price: product.price,
      discountedPrice: product.discount
        ? product.price - product.price * (product.discount / 100)
        : product.price,
      discount: product.discount || 0,
      image:
        product.images && product.images.length > 0 ? product.images[0] : null,
      rating: product.rating || 0,
      category: product.category,
      brand: product.brand,
      attributes: product.attributes,
      inStock: product.stock > 0,
    }));

    res.status(200).json({
      message: "Filtered search results fetched successfully",
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error searching with filters:", error.message);
    res.status(500).json({ message: "Error searching with filters" });
  }
};

export {
  searchProducts,
  searchSuggestions,
  getPopularSearches,
  recordSearchQuery,
  searchByCategory,
  searchByFilter,
};
