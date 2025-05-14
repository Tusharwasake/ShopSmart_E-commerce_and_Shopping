import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetpassword,
  logout,
  refreshToken,
  getCurrentUser,
  changePassword,
  verifyEmail,
  resendVerification
} from "../controllers/authController.js";

const authRoutes = express.Router();

// Authentication Routes
authRoutes.post("/register", registerUser);
authRoutes.post("/login", loginUser);
authRoutes.post("/logout", authentication, logout);
authRoutes.post("/forgotpassword", forgotPassword);
authRoutes.post("/resetpassword", resetpassword);
authRoutes.post("/refresh-token", refreshToken);
authRoutes.get("/me", authentication, getCurrentUser);
authRoutes.put("/change-password", authentication, changePassword);
authRoutes.post("/verify-email", verifyEmail);
authRoutes.post("/resend-verification", authentication, resendVerification);

export { authRoutes };
