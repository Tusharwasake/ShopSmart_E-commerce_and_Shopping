import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetpassword,
  logout,
} from "../controllers/authController.js";

const authRoutes = express.Router();

// Authentication Routes
authRoutes.post("/register", registerUser);
authRoutes.post("/login", loginUser);
authRoutes.post("/forgotpassword", forgotPassword);
authRoutes.post("/resetpassword", resetpassword);
authRoutes.post("logout", authentication, logout);

export { authRoutes };
