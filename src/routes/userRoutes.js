import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { userProfileUpdate, getUserProfile } from "../controllers/userController.js";

const userRoutes = express.Router();

userRoutes.get("/profile", authentication, getUserProfile);
userRoutes.put("/profile", authentication, userProfileUpdate);

export { userRoutes };
