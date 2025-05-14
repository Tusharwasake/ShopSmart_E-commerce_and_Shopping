// import express from "express";
// import { authentication } from "../middlewares/authMiddleware.js";
// import { userProfileUpdate, getUserProfile } from "../controllers/userController.js";

// const userRoutes = express.Router();

// userRoutes.get("/profile", authentication, getUserProfile);
// userRoutes.put("/profile", authentication, userProfileUpdate);

// export { userRoutes };



// userRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserOrders,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  updateUserRole
} from "../controllers/userController.js";

const userRoutes = express.Router();

// Admin routes
userRoutes.get("/", authentication, adminAuth, getAllUsers);
userRoutes.put("/:id/role", authentication, adminAuth, updateUserRole);

// User profile routes
userRoutes.get("/:id", authentication, getUserById);
userRoutes.put("/:id", authentication, updateUser);
userRoutes.delete("/:id", authentication, deleteUser);
userRoutes.get("/:id/orders", authentication, getUserOrders);

// Address routes
userRoutes.post("/addresses", authentication, addAddress);
userRoutes.get("/addresses", authentication, getAddresses);
userRoutes.put("/addresses/:id", authentication, updateAddress);
userRoutes.delete("/addresses/:id", authentication, deleteAddress);

export { userRoutes };