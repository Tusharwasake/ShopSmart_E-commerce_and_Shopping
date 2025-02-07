import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { userProfileUpdate } from "../controllers/userController.js";

const userRoutes = express.Router();

userRoutes.get("/profile", authentication, userProfileUpdate);
userRoutes.put("/profile", authentication, userProfileUpdate);

export { userRoutes };
