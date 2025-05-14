// contentRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  getPages,
  getPageBySlug,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  getBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  getHomeContent,
  updateHomeContent,
  getFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getNavigationMenu,
  updateNavigationMenu,
} from "../controllers/contentController.js";

const contentRoutes = express.Router();

// Public banner routes
contentRoutes.get("/banners", getBanners);
contentRoutes.get("/banners/:id", getBannerById);

// Admin banner routes
contentRoutes.post("/banners", authentication, adminAuth, createBanner);
contentRoutes.put("/banners/:id", authentication, adminAuth, updateBanner);
contentRoutes.delete("/banners/:id", authentication, adminAuth, deleteBanner);

// Public page routes
contentRoutes.get("/pages", getPages);
contentRoutes.get("/pages/slug/:slug", getPageBySlug);

// Admin page routes
contentRoutes.get("/pages/:id", authentication, adminAuth, getPageById);
contentRoutes.post("/pages", authentication, adminAuth, createPage);
contentRoutes.put("/pages/:id", authentication, adminAuth, updatePage);
contentRoutes.delete("/pages/:id", authentication, adminAuth, deletePage);

// Public blog routes
contentRoutes.get("/blogs", getBlogs);
contentRoutes.get("/blogs/id/:id", getBlogById);
contentRoutes.get("/blogs/slug/:slug", getBlogBySlug);

// Admin blog routes
contentRoutes.post("/blogs", authentication, adminAuth, createBlog);
contentRoutes.put("/blogs/:id", authentication, adminAuth, updateBlog);
contentRoutes.delete("/blogs/:id", authentication, adminAuth, deleteBlog);

// Home content routes
contentRoutes.get("/home", getHomeContent);
contentRoutes.put("/home", authentication, adminAuth, updateHomeContent);

// FAQ routes
contentRoutes.get("/faqs", getFAQs);
contentRoutes.get("/faqs/:id", getFAQById);
contentRoutes.post("/faqs", authentication, adminAuth, createFAQ);
contentRoutes.put("/faqs/:id", authentication, adminAuth, updateFAQ);
contentRoutes.delete("/faqs/:id", authentication, adminAuth, deleteFAQ);

// Navigation menu routes
contentRoutes.get("/navigation", getNavigationMenu);
contentRoutes.put(
  "/navigation",
  authentication,
  adminAuth,
  updateNavigationMenu
);

export { contentRoutes };
