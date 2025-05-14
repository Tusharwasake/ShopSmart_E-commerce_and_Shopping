// notificationController.js
import { Notification } from "../models/Notification.js";
import { NotificationPreference } from "../models/NotificationPreference.js";
import { NotificationTemplate } from "../models/NotificationTemplate.js";
import { AdminNotification } from "../models/AdminNotification.js";
import { user } from "../models/User.js";
import { sendEmail } from "../services/emailService.js";
import mongoose from "mongoose";

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unread } = req.query;

    // Build query
    const query = { userId };
    if (unread === "true") {
      query.read = false;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    res.status(200).json({
      message: "Notifications fetched successfully",
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

// Get a specific notification
const getNotificationById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Mark as read when viewed
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      message: "Notification fetched successfully",
      notification,
    });
  } catch (error) {
    console.error("Error fetching notification:", error.message);
    res.status(500).json({ message: "Error fetching notification" });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      message: "Notification marked as read",
      notificationId: id,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error.message);
    res.status(500).json({ message: "Error marking notification as read" });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.updateMany(
      { userId, read: false },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    res.status(200).json({
      message: "All notifications marked as read",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error.message);
    res
      .status(500)
      .json({ message: "Error marking all notifications as read" });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      message: "Notification deleted successfully",
      notificationId: id,
    });
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    res.status(500).json({ message: "Error deleting notification" });
  }
};

// Delete all notifications
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.deleteMany({ userId });

    res.status(200).json({
      message: "All notifications deleted",
      count: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all notifications:", error.message);
    res.status(500).json({ message: "Error deleting all notifications" });
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;

    let preferences = await NotificationPreference.findOne({ userId });

    if (!preferences) {
      // Create default preferences if they don't exist
      preferences = await NotificationPreference.create({
        userId,
        email: {
          orderConfirmation: true,
          orderShipped: true,
          orderDelivered: true,
          orderCancellation: true,
          promotions: true,
          stockAlerts: false,
          priceDrops: true,
          newsletter: true,
          accountActivity: true,
        },
        push: {
          orderConfirmation: true,
          orderShipped: true,
          orderDelivered: true,
          orderCancellation: true,
          promotions: false,
          stockAlerts: true,
          priceDrops: true,
          newsletter: false,
          accountActivity: true,
        },
        sms: {
          orderConfirmation: false,
          orderShipped: false,
          orderDelivered: false,
          orderCancellation: false,
          promotions: false,
          stockAlerts: false,
          priceDrops: false,
          newsletter: false,
          accountActivity: false,
        },
      });
    }

    res.status(200).json({
      message: "Notification preferences fetched successfully",
      preferences,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching notification preferences" });
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updates = req.body;

    let preferences = await NotificationPreference.findOne({ userId });

    if (!preferences) {
      preferences = new NotificationPreference({
        userId,
        email: {},
        push: {},
        sms: {},
      });
    }

    // Update email preferences
    if (updates.email) {
      Object.keys(updates.email).forEach((key) => {
        preferences.email[key] = updates.email[key];
      });
    }

    // Update push preferences
    if (updates.push) {
      Object.keys(updates.push).forEach((key) => {
        preferences.push[key] = updates.push[key];
      });
    }

    // Update SMS preferences
    if (updates.sms) {
      Object.keys(updates.sms).forEach((key) => {
        preferences.sms[key] = updates.sms[key];
      });
    }

    preferences.updatedAt = new Date();
    await preferences.save();

    res.status(200).json({
      message: "Notification preferences updated successfully",
      preferences,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error.message);
    res
      .status(500)
      .json({ message: "Error updating notification preferences" });
  }
};

// Send a test notification (admin)
const sendTestNotification = async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      channel = "all",
      templateId,
    } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        message: "User ID, title, and message are required",
      });
    }

    // Check if user exists
    const userDoc = await user.findById(userId);

    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if template exists if provided
    let template;
    if (templateId) {
      template = await NotificationTemplate.findById(templateId);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
    }

    // Get user's notification preferences
    const preferences = await NotificationPreference.findOne({ userId });

    // Create in-app notification
    if (channel === "all" || channel === "app") {
      await Notification.create({
        userId,
        type: type || "test",
        title,
        message,
        link: req.body.link || "",
        read: false,
        createdAt: new Date(),
      });
    }

    // Send email notification
    if (
      (channel === "all" || channel === "email") &&
      (!preferences || preferences.email[type] !== false)
    ) {
      try {
        await sendEmail(userDoc.email, title, message);
      } catch (emailError) {
        console.error("Error sending email notification:", emailError.message);
      }
    }

    // Here, you would handle push and SMS notifications if you have those services

    res.status(200).json({
      message: "Test notification sent successfully",
      channels: channel === "all" ? ["app", "email"] : [channel],
    });
  } catch (error) {
    console.error("Error sending test notification:", error.message);
    res.status(500).json({ message: "Error sending test notification" });
  }
};

// Get admin notifications
const getAdminNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;

    // Build query
    const query = {};
    if (unread === "true") {
      query.read = false;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get notifications
    const notifications = await AdminNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminNotification.countDocuments(query);
    const unreadCount = await AdminNotification.countDocuments({ read: false });

    res.status(200).json({
      message: "Admin notifications fetched successfully",
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error.message);
    res.status(500).json({ message: "Error fetching admin notifications" });
  }
};

// Create notification template
const createNotificationTemplate = async (req, res) => {
  try {
    const { name, type, title, message, emailSubject, emailBody, smsText } =
      req.body;

    if (!name || !type || !title || !message) {
      return res.status(400).json({
        message: "Name, type, title, and message are required",
      });
    }

    // Check if template with same name exists
    const existingTemplate = await NotificationTemplate.findOne({ name });

    if (existingTemplate) {
      return res.status(400).json({
        message: "A template with this name already exists",
      });
    }

    const template = await NotificationTemplate.create({
      name,
      type,
      title,
      message,
      emailSubject: emailSubject || title,
      emailBody: emailBody || message,
      smsText: smsText || message.substring(0, 160),
      createdBy: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Notification template created successfully",
      template,
    });
  } catch (error) {
    console.error("Error creating notification template:", error.message);
    res.status(500).json({ message: "Error creating notification template" });
  }
};

// Update notification template
const updateNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = await NotificationTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check if name is being changed and new name exists
    if (updates.name && updates.name !== template.name) {
      const existingTemplate = await NotificationTemplate.findOne({
        name: updates.name,
        _id: { $ne: id },
      });

      if (existingTemplate) {
        return res.status(400).json({
          message: "A template with this name already exists",
        });
      }
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "createdAt" && key !== "createdBy") {
        template[key] = updates[key];
      }
    });

    template.updatedAt = new Date();
    await template.save();

    res.status(200).json({
      message: "Notification template updated successfully",
      template,
    });
  } catch (error) {
    console.error("Error updating notification template:", error.message);
    res.status(500).json({ message: "Error updating notification template" });
  }
};

// Delete notification template
const deleteNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await NotificationTemplate.findById(id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    await NotificationTemplate.findByIdAndDelete(id);

    res.status(200).json({
      message: "Notification template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification template:", error.message);
    res.status(500).json({ message: "Error deleting notification template" });
  }
};

// Get notification templates
const getNotificationTemplates = async (req, res) => {
  try {
    const { type } = req.query;

    // Build query
    const query = {};
    if (type) {
      query.type = type;
    }

    const templates = await NotificationTemplate.find(query).sort({ name: 1 });

    res.status(200).json({
      message: "Notification templates fetched successfully",
      templates,
    });
  } catch (error) {
    console.error("Error fetching notification templates:", error.message);
    res.status(500).json({ message: "Error fetching notification templates" });
  }
};

export {
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  updateNotificationPreferences,
  getNotificationPreferences,
  sendTestNotification,
  getAdminNotifications,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationTemplates,
};
