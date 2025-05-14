// contentController.js
import { Banner } from "../models/Banner.js";
import { Page } from "../models/Page.js";
import { Blog } from "../models/Blog.js";
import { HomeContent } from "../models/HomeContent.js";
import { FAQ } from "../models/FAQ.js";
import { NavigationMenu } from "../models/NavigationMenu.js";
import mongoose from "mongoose";
import slugify from "slugify";

// Banner management
const getBanners = async (req, res) => {
  try {
    const { location, active } = req.query;

    // Build query
    const query = {};
    if (location) {
      query.location = location;
    }
    if (active !== undefined) {
      query.active = active === "true";
    }

    const banners = await Banner.find(query).sort({ order: 1 });

    res.status(200).json({
      message: "Banners fetched successfully",
      banners,
    });
  } catch (error) {
    console.error("Error fetching banners:", error.message);
    res.status(500).json({ message: "Error fetching banners" });
  }
};

const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner fetched successfully",
      banner,
    });
  } catch (error) {
    console.error("Error fetching banner:", error.message);
    res.status(500).json({ message: "Error fetching banner" });
  }
};

const createBanner = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      buttonText,
      location,
      startDate,
      endDate,
      order,
      active,
    } = req.body;

    if (!title || !imageUrl || !location) {
      return res.status(400).json({
        message: "Title, image URL, and location are required",
      });
    }

    const banner = await Banner.create({
      title,
      subtitle: subtitle || "",
      imageUrl,
      linkUrl: linkUrl || "",
      buttonText: buttonText || "",
      location,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      order: order !== undefined ? order : 0,
      active: active !== undefined ? active : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Banner created successfully",
      banner,
    });
  } catch (error) {
    console.error("Error creating banner:", error.message);
    res.status(500).json({ message: "Error creating banner" });
  }
};

const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "createdAt") {
        if (key === "startDate" || key === "endDate") {
          banner[key] = updates[key] ? new Date(updates[key]) : null;
        } else {
          banner[key] = updates[key];
        }
      }
    });

    banner.updatedAt = new Date();

    await banner.save();

    res.status(200).json({
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
    console.error("Error updating banner:", error.message);
    res.status(500).json({ message: "Error updating banner" });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    await Banner.findByIdAndDelete(id);

    res.status(200).json({
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting banner:", error.message);
    res.status(500).json({ message: "Error deleting banner" });
  }
};

// Page management
const getPages = async (req, res) => {
  try {
    const { published } = req.query;

    // Build query
    const query = {};
    if (published !== undefined) {
      query.published = published === "true";
    }

    const pages = await Page.find(query).sort({ title: 1 });

    res.status(200).json({
      message: "Pages fetched successfully",
      pages: pages.map((page) => ({
        id: page._id,
        title: page.title,
        slug: page.slug,
        published: page.published,
        updatedAt: page.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching pages:", error.message);
    res.status(500).json({ message: "Error fetching pages" });
  }
};

const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await Page.findOne({ slug });

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Only return published pages to public
    if (!page.published) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.status(200).json({
      message: "Page fetched successfully",
      page,
    });
  } catch (error) {
    console.error("Error fetching page:", error.message);
    res.status(500).json({ message: "Error fetching page" });
  }
};

const getPageById = async (req, res) => {
  try {
    const { id } = req.params;

    const page = await Page.findById(id);

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.status(200).json({
      message: "Page fetched successfully",
      page,
    });
  } catch (error) {
    console.error("Error fetching page:", error.message);
    res.status(500).json({ message: "Error fetching page" });
  }
};

const createPage = async (req, res) => {
  try {
    const { title, content, slug, metaTitle, metaDescription, published } =
      req.body;

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    // Generate slug if not provided
    const pageSlug = slug || slugify(title, { lower: true });

    // Check for duplicate slug
    const existingPage = await Page.findOne({ slug: pageSlug });

    if (existingPage) {
      return res.status(400).json({
        message: "A page with this slug already exists",
      });
    }

    const page = await Page.create({
      title,
      content,
      slug: pageSlug,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || "",
      published: published !== undefined ? published : false,
      author: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Page created successfully",
      page,
    });
  } catch (error) {
    console.error("Error creating page:", error.message);
    res.status(500).json({ message: "Error creating page" });
  }
};

const updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, slug, metaTitle, metaDescription, published } =
      req.body;

    const page = await Page.findById(id);

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Check for duplicate slug if changing
    if (slug && slug !== page.slug) {
      const existingPage = await Page.findOne({
        slug,
        _id: { $ne: id },
      });

      if (existingPage) {
        return res.status(400).json({
          message: "A page with this slug already exists",
        });
      }
    }

    // Update fields
    if (title) page.title = title;
    if (content) page.content = content;
    if (slug) page.slug = slug;
    if (metaTitle) page.metaTitle = metaTitle;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;
    if (published !== undefined) page.published = published;

    page.updatedAt = new Date();

    await page.save();

    res.status(200).json({
      message: "Page updated successfully",
      page,
    });
  } catch (error) {
    console.error("Error updating page:", error.message);
    res.status(500).json({ message: "Error updating page" });
  }
};

const deletePage = async (req, res) => {
  try {
    const { id } = req.params;

    const page = await Page.findById(id);

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    await Page.findByIdAndDelete(id);

    res.status(200).json({
      message: "Page deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting page:", error.message);
    res.status(500).json({ message: "Error deleting page" });
  }
};

// Blog management
const getBlogs = async (req, res) => {
  try {
    const { category, tag, published, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = tag;
    }

    if (published !== undefined) {
      query.published = published === "true";
    } else {
      // By default, only return published blogs to public
      query.published = true;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("author", "username avatar");

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      message: "Blogs fetched successfully",
      blogs: blogs.map((blog) => ({
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt,
        featuredImage: blog.featuredImage,
        category: blog.category,
        tags: blog.tags,
        author: blog.author
          ? {
              id: blog.author._id,
              username: blog.author.username,
              avatar: blog.author.avatar,
            }
          : null,
        published: blog.published,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching blogs:", error.message);
    res.status(500).json({ message: "Error fetching blogs" });
  }
};

const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin } = req.query;

    const blog = await Blog.findById(id).populate("author", "username avatar");

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Only return published blogs to public unless admin request
    if (!blog.published && admin !== "true") {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({
      message: "Blog fetched successfully",
      blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error.message);
    res.status(500).json({ message: "Error fetching blog" });
  }
};

const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug }).populate(
      "author",
      "username avatar"
    );

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Only return published blogs to public
    if (!blog.published) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({
      message: "Blog fetched successfully",
      blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error.message);
    res.status(500).json({ message: "Error fetching blog" });
  }
};

const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      slug,
      featuredImage,
      category,
      tags,
      metaTitle,
      metaDescription,
      published,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    // Generate slug if not provided
    const blogSlug = slug || slugify(title, { lower: true });

    // Check for duplicate slug
    const existingBlog = await Blog.findOne({ slug: blogSlug });

    if (existingBlog) {
      return res.status(400).json({
        message: "A blog with this slug already exists",
      });
    }

    const blog = await Blog.create({
      title,
      content,
      excerpt: excerpt || content.substring(0, 150) + "...",
      slug: blogSlug,
      featuredImage: featuredImage || null,
      category: category || "Uncategorized",
      tags: tags || [],
      metaTitle: metaTitle || title,
      metaDescription:
        metaDescription || excerpt || content.substring(0, 150) + "...",
      published: published !== undefined ? published : false,
      author: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Populate author for response
    await blog.populate("author", "username avatar");

    res.status(201).json({
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    console.error("Error creating blog:", error.message);
    res.status(500).json({ message: "Error creating blog" });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check for duplicate slug if changing
    if (updates.slug && updates.slug !== blog.slug) {
      const existingBlog = await Blog.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      });

      if (existingBlog) {
        return res.status(400).json({
          message: "A blog with this slug already exists",
        });
      }
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "createdAt" && key !== "author") {
        blog[key] = updates[key];
      }
    });

    blog.updatedAt = new Date();

    await blog.save();

    // Populate author for response
    await blog.populate("author", "username avatar");

    res.status(200).json({
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Error updating blog:", error.message);
    res.status(500).json({ message: "Error updating blog" });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    await Blog.findByIdAndDelete(id);

    res.status(200).json({
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog:", error.message);
    res.status(500).json({ message: "Error deleting blog" });
  }
};

// Home content management
const getHomeContent = async (req, res) => {
  try {
    let homeContent = await HomeContent.findOne();

    if (!homeContent) {
      // Create default if not exists
      homeContent = await HomeContent.create({
        heroSection: {
          title: "Welcome to Our Store",
          subtitle: "Shop the latest products",
          imageUrl: "",
          buttonText: "Shop Now",
          buttonLink: "/products",
        },
        featuredCategories: [],
        featuredProducts: [],
        promoSections: [],
        testimonials: [],
        updatedAt: new Date(),
      });
    }

    res.status(200).json({
      message: "Home content fetched successfully",
      content: homeContent,
    });
  } catch (error) {
    console.error("Error fetching home content:", error.message);
    res.status(500).json({ message: "Error fetching home content" });
  }
};

const updateHomeContent = async (req, res) => {
  try {
    const {
      heroSection,
      featuredCategories,
      featuredProducts,
      promoSections,
      testimonials,
    } = req.body;

    let homeContent = await HomeContent.findOne();

    if (!homeContent) {
      homeContent = new HomeContent({
        createdAt: new Date(),
      });
    }

    // Update fields
    if (heroSection) homeContent.heroSection = heroSection;
    if (featuredCategories) homeContent.featuredCategories = featuredCategories;
    if (featuredProducts) homeContent.featuredProducts = featuredProducts;
    if (promoSections) homeContent.promoSections = promoSections;
    if (testimonials) homeContent.testimonials = testimonials;

    homeContent.updatedAt = new Date();

    await homeContent.save();

    res.status(200).json({
      message: "Home content updated successfully",
      content: homeContent,
    });
  } catch (error) {
    console.error("Error updating home content:", error.message);
    res.status(500).json({ message: "Error updating home content" });
  }
};

// FAQ management
const getFAQs = async (req, res) => {
  try {
    const { category } = req.query;

    // Build query
    const query = {};
    if (category) {
      query.category = category;
    }

    const faqs = await FAQ.find(query).sort({ order: 1 });

    // Get unique categories
    const categories = await FAQ.distinct("category");

    res.status(200).json({
      message: "FAQs fetched successfully",
      faqs,
      categories,
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error.message);
    res.status(500).json({ message: "Error fetching FAQs" });
  }
};

const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.status(200).json({
      message: "FAQ fetched successfully",
      faq,
    });
  } catch (error) {
    console.error("Error fetching FAQ:", error.message);
    res.status(500).json({ message: "Error fetching FAQ" });
  }
};

const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, order } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        message: "Question and answer are required",
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      category: category || "General",
      order: order !== undefined ? order : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "FAQ created successfully",
      faq,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error.message);
    res.status(500).json({ message: "Error creating FAQ" });
  }
};

const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, order } = req.body;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    // Update fields
    if (question) faq.question = question;
    if (answer) faq.answer = answer;
    if (category) faq.category = category;
    if (order !== undefined) faq.order = order;

    faq.updatedAt = new Date();

    await faq.save();

    res.status(200).json({
      message: "FAQ updated successfully",
      faq,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error.message);
    res.status(500).json({ message: "Error updating FAQ" });
  }
};

const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    await FAQ.findByIdAndDelete(id);

    res.status(200).json({
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting FAQ:", error.message);
    res.status(500).json({ message: "Error deleting FAQ" });
  }
};

// Navigation menu management
const getNavigationMenu = async (req, res) => {
  try {
    let navigationMenu = await NavigationMenu.findOne();

    if (!navigationMenu) {
      // Create default if not exists
      navigationMenu = await NavigationMenu.create({
        mainMenu: [
          { label: "Home", link: "/", order: 1 },
          { label: "Products", link: "/products", order: 2 },
          { label: "Categories", link: "/categories", order: 3 },
          { label: "Blog", link: "/blog", order: 4 },
          { label: "About", link: "/about", order: 5 },
          { label: "Contact", link: "/contact", order: 6 },
        ],
        footerMenu: [
          { label: "About Us", link: "/about", order: 1 },
          { label: "Contact", link: "/contact", order: 2 },
          { label: "Privacy Policy", link: "/privacy-policy", order: 3 },
          { label: "Terms & Conditions", link: "/terms", order: 4 },
        ],
        socialLinks: [
          { platform: "facebook", url: "#", icon: "facebook" },
          { platform: "twitter", url: "#", icon: "twitter" },
          { platform: "instagram", url: "#", icon: "instagram" },
        ],
        updatedAt: new Date(),
      });
    }

    res.status(200).json({
      message: "Navigation menu fetched successfully",
      navigationMenu,
    });
  } catch (error) {
    console.error("Error fetching navigation menu:", error.message);
    res.status(500).json({ message: "Error fetching navigation menu" });
  }
};

const updateNavigationMenu = async (req, res) => {
  try {
    const { mainMenu, footerMenu, socialLinks } = req.body;

    let navigationMenu = await NavigationMenu.findOne();

    if (!navigationMenu) {
      navigationMenu = new NavigationMenu({
        createdAt: new Date(),
      });
    }

    // Update fields
    if (mainMenu) navigationMenu.mainMenu = mainMenu;
    if (footerMenu) navigationMenu.footerMenu = footerMenu;
    if (socialLinks) navigationMenu.socialLinks = socialLinks;

    navigationMenu.updatedAt = new Date();

    await navigationMenu.save();

    res.status(200).json({
      message: "Navigation menu updated successfully",
      navigationMenu,
    });
  } catch (error) {
    console.error("Error updating navigation menu:", error.message);
    res.status(500).json({ message: "Error updating navigation menu" });
  }
};

export {
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
};
