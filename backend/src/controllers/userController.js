// userController.js
import { user } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Address } from "../models/Address.js";
import { ObjectId } from "mongodb";

// Admin: Get all users
const getAllUsers = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter and sort options
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const sortOptions = {};
    if (req.query.sortBy) {
      sortOptions[req.query.sortBy] = req.query.sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }

    const users = await user
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Remove sensitive information
    const sanitizedUsers = users.map((u) => {
      const { password, otp, otpExpires, refreshToken, ...userInfo } = u;
      return userInfo;
    });

    const total = await user.countDocuments(filter);

    res.status(200).json({
      users: sanitizedUsers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the requesting user has permission
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You don't have permission to access this user profile",
      });
    }

    const userRecord = await user.findOne({ _id: new ObjectId(id) });

    if (!userRecord) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove sensitive information
    const { password, otp, otpExpires, refreshToken, ...userInfo } = userRecord;

    res.status(200).json(userInfo);
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, firstName, lastName, phone, avatar, preferences } =
      req.body;

    // Check if the requesting user has permission
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You don't have permission to update this user profile",
      });
    }

    // Validate input
    const updates = {};
    if (username) updates.username = username;
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;
    if (preferences) updates.preferences = preferences;

    const updatedUser = await user.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove sensitive information
    const { password, otp, otpExpires, refreshToken, ...userInfo } =
      updatedUser;

    res.status(200).json({
      message: "User updated successfully",
      user: userInfo,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the requesting user has permission
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this user" });
    }

    const deletedUser = await user.findOneAndDelete({ _id: new ObjectId(id) });

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete related data (addresses, etc.)
    await address.deleteMany({ userId: id });

    // Note: You might want to handle orders and other user data differently
    // e.g., anonymize rather than delete

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the requesting user has permission
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You don't have permission to access these orders" });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter options
    const filter = { userId: id };
    if (req.query.status) filter.status = req.query.status;

    const userOrders = await order
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await order.countDocuments(filter);

    res.status(200).json({
      orders: userOrders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add address
const addAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      firstName,
      lastName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !addressLine1 ||
      !city ||
      !country ||
      !phone
    ) {
      return res
        .status(400)
        .json({ message: "Missing required address fields" });
    }

    const newAddress = {
      userId,
      title: title || "Home",
      firstName,
      lastName,
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      state: state || "",
      postalCode: postalCode || "",
      country,
      phone,
      isDefault: isDefault || false,
      createdAt: new Date(),
    };

    // If this is set as default, unset any existing default
    if (newAddress.isDefault) {
      await address.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const result = await address.insertOne(newAddress);

    res.status(201).json({
      message: "Address added successfully",
      address: { ...newAddress, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get addresses
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userAddresses = await address
      .find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();

    res.status(200).json(userAddresses);
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      title,
      firstName,
      lastName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault,
    } = req.body;

    const addressRecord = await address.findOne({
      _id: new ObjectId(id),
      userId,
    });

    if (!addressRecord) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Prepare updates
    const updates = {};
    if (title) updates.title = title;
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (addressLine1) updates.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updates.addressLine2 = addressLine2;
    if (city) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (postalCode !== undefined) updates.postalCode = postalCode;
    if (country) updates.country = country;
    if (phone) updates.phone = phone;
    if (isDefault !== undefined) updates.isDefault = isDefault;

    // If this is set as default, unset any existing default
    if (updates.isDefault) {
      await address.updateMany(
        { userId, _id: { $ne: new ObjectId(id) }, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const updatedAddress = await address.findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    res.status(200).json({
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await address.findOneAndDelete({
      _id: new ObjectId(id),
      userId,
    });

    if (!result) {
      return res.status(404).json({ message: "Address not found" });
    }

    // If the deleted address was the default, set another as default if available
    if (result.isDefault) {
      const firstAddress = await address.findOne({ userId });
      if (firstAddress) {
        await address.updateOne(
          { _id: firstAddress._id },
          { $set: { isDefault: true } }
        );
      }
    }

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Update user role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["customer", "admin", "vendor"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await user.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove sensitive information
    const { password, otp, otpExpires, refreshToken, ...userInfo } =
      updatedUser;

    res.status(200).json({
      message: "User role updated successfully",
      user: userInfo,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserOrders,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  updateUserRole,
};
