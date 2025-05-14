// uploadRoutes.js
import express from "express";
import multer from "multer";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  uploadImage,
  uploadMultiple,
  deleteFile,
  getFileInfo,
  getFilesList,
  uploadProductImages,
  uploadUserAvatar,
  getUploadConfig,
} from "../controllers/uploadController.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

const uploadRoutes = express.Router();

// General upload routes
uploadRoutes.post(
  "/image",
  authentication,
  upload.single("image"),
  uploadImage
);
uploadRoutes.post(
  "/multiple",
  authentication,
  upload.array("images", 10),
  uploadMultiple
);
uploadRoutes.delete("/:id", authentication, deleteFile);
uploadRoutes.get("/:id", authentication, getFileInfo);
uploadRoutes.get("/", authentication, adminAuth, getFilesList);
uploadRoutes.get("/config", authentication, getUploadConfig);

// Specific upload routes
uploadRoutes.post(
  "/product/:productId",
  authentication,
  adminAuth,
  upload.array("images", 10),
  uploadProductImages
);
uploadRoutes.post(
  "/avatar",
  authentication,
  upload.single("avatar"),
  uploadUserAvatar
);

export { uploadRoutes };
