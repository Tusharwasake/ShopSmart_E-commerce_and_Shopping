// reviewController.js
import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";
import { user } from "../models/User.js";
import { Order } from "../models/Order.js";
import mongoose from "mongoose";

// Get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      sort = "recent",
      rating,
      verified,
      page = 1,
      limit = 10,
    } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Build query
    const query = {
      product: productId,
      status: "approved", // Only return approved reviews
    };

    // Filter by rating if provided
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Filter by verified purchases if requested
    if (verified === "true") {
      query.verifiedPurchase = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Determine sort order
    const sortOptions = {};
    switch (sort) {
      case "helpful":
        sortOptions.helpfulCount = -1;
        break;
      case "highest":
        sortOptions.rating = -1;
        break;
      case "lowest":
        sortOptions.rating = 1;
        break;
      case "recent":
      default:
        sortOptions.createdAt = -1;
        break;
    }

    // Get reviews
    const reviews = await Review.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "username avatar");

    // Get total count for pagination
    const total = await Review.countDocuments(query);

    // Calculate review statistics
    const stats = await Review.aggregate([
      {
        $match: {
          product: mongoose.Types.ObjectId.createFromHexString(productId),
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    // Format reviews
    const formattedReviews = reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      user: {
        id: review.user?._id,
        username: review.user?.username || "Anonymous",
        avatar: review.user?.avatar,
      },
      verifiedPurchase: review.verifiedPurchase,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      helpful: review.helpfulCount || 0,
      images: review.images || [],
    }));

    res.status(200).json({
      message: "Reviews fetched successfully",
      reviews: formattedReviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats:
        stats.length > 0
          ? {
              average: parseFloat(stats[0].avgRating.toFixed(1)),
              total: stats[0].totalReviews,
              distribution: {
                5: stats[0].rating5,
                4: stats[0].rating4,
                3: stats[0].rating3,
                2: stats[0].rating2,
                1: stats[0].rating1,
              },
            }
          : {
              average: 0,
              total: 0,
              distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            },
    });
  } catch (error) {
    console.error("Error fetching product reviews:", error.message);
    res.status(500).json({ message: "Error fetching product reviews" });
  }
};

// Get a single review by ID
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate("user", "username avatar")
      .populate("product", "title images");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Only return approved reviews or if the requester is the author
    const userId = req.user?.userId;
    if (
      review.status !== "approved" &&
      review.user?._id.toString() !== userId &&
      req.user?.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view this review" });
    }

    res.status(200).json({
      message: "Review fetched successfully",
      review: {
        id: review._id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        user: {
          id: review.user?._id,
          username: review.user?.username || "Anonymous",
          avatar: review.user?.avatar,
        },
        product: {
          id: review.product?._id,
          title: review.product?.title,
          image: review.product?.images?.[0] || null,
        },
        verifiedPurchase: review.verifiedPurchase,
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        helpful: review.helpfulCount || 0,
        images: review.images || [],
      },
    });
  } catch (error) {
    console.error("Error fetching review:", error.message);
    res.status(500).json({ message: "Error fetching review" });
  }
};

// Create a new review
const createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, rating, title, comment, images } = req.body;

    if (!productId || !rating) {
      return res
        .status(400)
        .json({ message: "Product ID and rating are required" });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
    });

    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    // Check if user has purchased the product (for verified purchase badge)
    const hasOrdered = await Order.findOne({
      userId,
      "items.productId": productId,
      status: { $in: ["delivered", "completed"] },
    });

    // Create the review
    const newReview = await Review.create({
      user: userId,
      product: productId,
      rating,
      title: title || "",
      comment: comment || "",
      verifiedPurchase: !!hasOrdered,
      images: images || [],
      status: "pending", // Reviews require approval
      createdAt: new Date(),
    });

    // Update product rating
    await updateProductRating(productId);

    res.status(201).json({
      message: "Review submitted successfully and pending approval",
      review: {
        id: newReview._id,
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
        verifiedPurchase: newReview.verifiedPurchase,
        status: newReview.status,
        createdAt: newReview.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating review:", error.message);
    res.status(500).json({ message: "Error creating review" });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { rating, title, comment, images } = req.body;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user is the author or admin
    if (review.user.toString() !== userId && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this review" });
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Prepare updates
    const updates = {};
    if (rating !== undefined) updates.rating = rating;
    if (title !== undefined) updates.title = title;
    if (comment !== undefined) updates.comment = comment;
    if (images !== undefined) updates.images = images;

    // Set status back to pending if content changed
    if (Object.keys(updates).length > 0) {
      updates.status = "pending";
      updates.updatedAt = new Date();
    }

    // Update the review
    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    // Update product rating
    await updateProductRating(review.product);

    res.status(200).json({
      message: "Review updated successfully and pending approval",
      review: {
        id: updatedReview._id,
        rating: updatedReview.rating,
        title: updatedReview.title,
        comment: updatedReview.comment,
        status: updatedReview.status,
        updatedAt: updatedReview.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating review:", error.message);
    res.status(500).json({ message: "Error updating review" });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user is the author or admin
    if (review.user.toString() !== userId && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this review" });
    }

    // Delete the review
    await Review.findByIdAndDelete(id);

    // Update product rating
    await updateProductRating(review.product);

    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error.message);
    res.status(500).json({ message: "Error deleting review" });
  }
};

// Get reviews by current user
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's reviews
    const reviews = await Review.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("product", "title images");

    // Get total count for pagination
    const total = await Review.countDocuments({ user: userId });

    // Format reviews
    const formattedReviews = reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      product: {
        id: review.product?._id,
        title: review.product?.title,
        image: review.product?.images?.[0] || null,
      },
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      images: review.images || [],
    }));

    res.status(200).json({
      message: "User reviews fetched successfully",
      reviews: formattedReviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error.message);
    res.status(500).json({ message: "Error fetching user reviews" });
  }
};

// Get review statistics for a product
const getReviewStats = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Calculate review statistics
    const stats = await Review.aggregate([
      {
        $match: {
          product: mongoose.Types.ObjectId.createFromHexString(productId),
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          verifiedCount: { $sum: { $cond: ["$verifiedPurchase", 1, 0] } },
        },
      },
    ]);

    // Get review with most helpful votes
    const topReview = await Review.findOne({
      product: productId,
      status: "approved",
    })
      .sort({ helpfulCount: -1 })
      .populate("user", "username avatar");

    res.status(200).json({
      message: "Review statistics fetched successfully",
      stats:
        stats.length > 0
          ? {
              average: parseFloat(stats[0].avgRating.toFixed(1)),
              total: stats[0].totalReviews,
              verifiedCount: stats[0].verifiedCount,
              distribution: {
                5: stats[0].rating5,
                4: stats[0].rating4,
                3: stats[0].rating3,
                2: stats[0].rating2,
                1: stats[0].rating1,
              },
              percentages: {
                5:
                  stats[0].totalReviews > 0
                    ? Math.round(
                        (stats[0].rating5 / stats[0].totalReviews) * 100
                      )
                    : 0,
                4:
                  stats[0].totalReviews > 0
                    ? Math.round(
                        (stats[0].rating4 / stats[0].totalReviews) * 100
                      )
                    : 0,
                3:
                  stats[0].totalReviews > 0
                    ? Math.round(
                        (stats[0].rating3 / stats[0].totalReviews) * 100
                      )
                    : 0,
                2:
                  stats[0].totalReviews > 0
                    ? Math.round(
                        (stats[0].rating2 / stats[0].totalReviews) * 100
                      )
                    : 0,
                1:
                  stats[0].totalReviews > 0
                    ? Math.round(
                        (stats[0].rating1 / stats[0].totalReviews) * 100
                      )
                    : 0,
              },
            }
          : {
              average: 0,
              total: 0,
              verifiedCount: 0,
              distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
              percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            },
      topReview: topReview
        ? {
            id: topReview._id,
            rating: topReview.rating,
            title: topReview.title,
            comment: topReview.comment,
            user: {
              id: topReview.user?._id,
              username: topReview.user?.username || "Anonymous",
              avatar: topReview.user?.avatar,
            },
            verifiedPurchase: topReview.verifiedPurchase,
            helpful: topReview.helpfulCount || 0,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching review statistics:", error.message);
    res.status(500).json({ message: "Error fetching review statistics" });
  }
};

// Mark a review as helpful
const likeReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user already liked this review
    if (review.helpfulBy && review.helpfulBy.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have already marked this review as helpful" });
    }

    // Initialize helpfulBy array if it doesn't exist
    if (!review.helpfulBy) {
      review.helpfulBy = [];
    }

    // Add user to helpfulBy array
    review.helpfulBy.push(userId);

    // Update helpful count
    review.helpfulCount = review.helpfulBy.length;

    await review.save();

    res.status(200).json({
      message: "Review marked as helpful",
      helpfulCount: review.helpfulCount,
    });
  } catch (error) {
    console.error("Error marking review as helpful:", error.message);
    res.status(500).json({ message: "Error marking review as helpful" });
  }
};

// Remove helpful mark from a review
const unlikeReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user has liked this review
    if (!review.helpfulBy || !review.helpfulBy.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have not marked this review as helpful" });
    }

    // Remove user from helpfulBy array
    review.helpfulBy = review.helpfulBy.filter(
      (id) => id.toString() !== userId
    );

    // Update helpful count
    review.helpfulCount = review.helpfulBy.length;

    await review.save();

    res.status(200).json({
      message: "Helpful mark removed",
      helpfulCount: review.helpfulCount,
    });
  } catch (error) {
    console.error("Error removing helpful mark:", error.message);
    res.status(500).json({ message: "Error removing helpful mark" });
  }
};

// Report a review
const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    if (!reason) {
      return res
        .status(400)
        .json({ message: "Reason for reporting is required" });
    }

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user already reported this review
    if (
      review.reportedBy &&
      review.reportedBy.some((report) => report.user.toString() === userId)
    ) {
      return res
        .status(400)
        .json({ message: "You have already reported this review" });
    }

    // Initialize reportedBy array if it doesn't exist
    if (!review.reportedBy) {
      review.reportedBy = [];
    }

    // Add report
    review.reportedBy.push({
      user: userId,
      reason,
      date: new Date(),
    });

    // Mark as reported
    review.isReported = true;

    await review.save();

    res.status(200).json({
      message: "Review reported successfully",
    });
  } catch (error) {
    console.error("Error reporting review:", error.message);
    res.status(500).json({ message: "Error reporting review" });
  }
};

// Get reported reviews (admin)
const getReportedReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get reported reviews
    const reviews = await Review.find({ isReported: true })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "username email")
      .populate("product", "title");

    // Get total count for pagination
    const total = await Review.countDocuments({ isReported: true });

    // Format reviews
    const formattedReviews = reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      user: {
        id: review.user?._id,
        username: review.user?.username || "Anonymous",
        email: review.user?.email,
      },
      product: {
        id: review.product?._id,
        title: review.product?.title,
      },
      reports: review.reportedBy || [],
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }));

    res.status(200).json({
      message: "Reported reviews fetched successfully",
      reviews: formattedReviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching reported reviews:", error.message);
    res.status(500).json({ message: "Error fetching reported reviews" });
  }
};

// Approve a review (admin)
const approveReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Update status
    review.status = "approved";
    review.updatedAt = new Date();

    // Clear reports if any
    review.isReported = false;
    review.reportedBy = [];

    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    res.status(200).json({
      message: "Review approved successfully",
    });
  } catch (error) {
    console.error("Error approving review:", error.message);
    res.status(500).json({ message: "Error approving review" });
  }
};

// Reject a review (admin)
const rejectReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Update status
    review.status = "rejected";
    review.rejectionReason = reason || "Violated review guidelines";
    review.updatedAt = new Date();

    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    res.status(200).json({
      message: "Review rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting review:", error.message);
    res.status(500).json({ message: "Error rejecting review" });
  }
};

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    // Calculate average rating from approved reviews
    const stats = await Review.aggregate([
      {
        $match: {
          product: mongoose.Types.ObjectId.createFromHexString(
            productId.toString()
          ),
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    // Update product rating
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        $set: {
          rating: parseFloat(stats[0].avgRating.toFixed(1)),
          reviewCount: stats[0].totalReviews,
        },
      });
    } else {
      // No approved reviews, reset rating
      await Product.findByIdAndUpdate(productId, {
        $set: {
          rating: 0,
          reviewCount: 0,
        },
      });
    }
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

export {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getReviewById,
  getUserReviews,
  getReviewStats,
  likeReview,
  unlikeReview,
  reportReview,
  getReportedReviews,
  approveReview,
  rejectReview,
};
