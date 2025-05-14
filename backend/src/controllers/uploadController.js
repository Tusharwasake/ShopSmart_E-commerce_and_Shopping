// uploadController.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Product } from "../models/Product.js";
import { user } from "../models/User.js";
import { FileUpload } from "../models/FileUpload.js";
import mongoose from "mongoose";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload single image
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Create file record in database
    const fileUpload = await FileUpload.create({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    });

    res.status(200).json({
      message: "File uploaded successfully",
      file: {
        id: fileUpload._id,
        filename: fileUpload.filename,
        originalname: fileUpload.originalname,
        url: fileUpload.url,
        size: fileUpload.size
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error.message);
    res.status(500).json({ message: "Error uploading file" });
  }
};

// Upload multiple files
const uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedFiles = [];

    // Create file records in database
    for (const file of req.files) {
      const fileUpload = await FileUpload.create({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.filename}`,
        uploadedBy: req.user.userId,
        uploadedAt: new Date()
      });

      uploadedFiles.push({
        id: fileUpload._id,
        filename: fileUpload.filename,
        originalname: fileUpload.originalname,
        url: fileUpload.url,
        size: fileUpload.size
      });
    }

    res.status(200).json({
      message: "Files uploaded successfully",
      files: uploadedFiles
    });
  } catch (error) {
    console.error("Error uploading files:", error.message);
    res.status(500).json({ message: "Error uploading files" });
  }
};

// Delete a file
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const fileUpload = await FileUpload.findById(id);

    if (!fileUpload) {
      return res.status(404).json({ message: "File not found" });
    }

    // Check if user has permission to delete this file
    if (fileUpload.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You don't have permission to delete this file" });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', '..', fileUpload.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record from database
    await FileUpload.findByIdAndDelete(id);

    res.status(200).json({
      message: "File deleted successfully",
      fileId: id
    });
  } catch (error) {
    console.error("Error deleting file:", error.message);
    res.status(500).json({ message: "Error deleting file" });
  }
};

// Get file info
const getFileInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const fileUpload = await FileUpload.findById(id);

    if (!fileUpload) {
      return res.status(404).json({ message: "File not found" });
    }

    res.status(200).json({
      message: "File info retrieved successfully",
      file: {
        id: fileUpload._id,
        filename: fileUpload.filename,
        originalname: fileUpload.originalname,
        mimetype: fileUpload.mimetype,
        size: fileUpload.size,
        url: fileUpload.url,
        uploadedAt: fileUpload.uploadedAt
      }
    });
  } catch (error) {
    console.error("Error getting file info:", error.message);
    res.status(500).json({ message: "Error getting file info" });
  }
};

// Get list of files (admin)
const getFilesList = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, user: userId } = req.query;

    // Build query
    const query = {};
    if (type) {
      query.mimetype = new RegExp(type, 'i');
    }
    if (userId) {
      query.uploadedBy = userId;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const files = await FileUpload.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'username');

    const total = await FileUpload.countDocuments(query);

    res.status(200).json({
      message: "Files retrieved successfully",
      files: files.map(file => ({
        id: file._id,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: file.url,
        uploadedBy: file.uploadedBy ? {
          id: file.uploadedBy._id,
          username: file.uploadedBy.username
        } : null,
        uploadedAt: file.uploadedAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error getting files list:", error.message);
    res.status(500).json({ message: "Error getting files list" });
  }
};

// Upload product images
const uploadProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const uploadedFiles = [];

    // Create file records and update product
    for (const file of req.files) {
      const fileUpload = await FileUpload.create({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.filename}`,
        uploadedBy: req.user.userId,
        uploadedAt: new Date(),
        relatedTo: {
          model: 'Product',
          id: productId
        }
      });

      uploadedFiles.push({
        id: fileUpload._id,
        filename: fileUpload.filename,
        originalname: fileUpload.originalname,
        url: fileUpload.url
      });

      // Add image URL to product
      if (!product.images) {
        product.images = [];
      }
      product.images.push(fileUpload.url);
    }

    await product.save();

    res.status(200).json({
      message: "Product images uploaded successfully",
      files: uploadedFiles,
      product: {
        id: product._id,
        title: product.title,
        images: product.images
      }
    });
  } catch (error) {
    console.error("Error uploading product images:", error.message);
    res.status(500).json({ message: "Error uploading product images" });
  }
};

// Upload user avatar
const uploadUserAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Create file record
    const fileUpload = await FileUpload.create({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: userId,
      uploadedAt: new Date(),
      relatedTo: {
        model: 'User',
        id: userId
      }
    });

    // Update user avatar
    const userRecord = await user.findById(userId);
    if (userRecord) {
      // Delete old avatar file if exists
      if (userRecord.avatar) {
        const oldAvatarFilename = userRecord.avatar.split('/').pop();
        const oldAvatarPath = path.join(__dirname, '..', '..', 'public', 'uploads', oldAvatarFilename);
        
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      userRecord.avatar = fileUpload.url;
      await userRecord.save();
    }

    res.status(200).json({
      message: "Avatar uploaded successfully",
      file: {
        id: fileUpload._id,
        url: fileUpload.url
      }
    });
  } catch (error) {
    console.error("Error uploading avatar:", error.message);
    res.status(500).json({ message: "Error uploading avatar" });
  }
};

// Get upload configuration (limits, allowed types, etc.)
const getUploadConfig = async (req, res) => {
  try {
    const config = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 10,
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ],
      uploadPath: '/uploads/',
      imageResizeOptions: {
        thumbnail: {
          width: 200,
          height: 200
        },
        medium: {
          width: 800,
          height: 800
        }
      }
    };

    res.status(200).json({
      message: "Upload configuration retrieved successfully",
      config
    });
  } catch (error) {
    console.error("Error getting upload config:", error.message);
    res.status(500).json({ message: "Error getting upload config" });
  }
};

export {
  uploadImage,
  uploadMultiple,
  deleteFile,
  getFileInfo,
  getFilesList,
  uploadProductImages,
  uploadUserAvatar,
  getUploadConfig
};