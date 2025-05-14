// import { Product } from "../models/product.js";
// import { user } from "../models/User.js";

// const productInsert = async (req, res) => {

//   const { title, price, description, category, images, rating, stock } = req.body;

//   if (
//     !title ||
//     !price ||
//     !description ||
//     !category ||
//     !images ||
//     !rating ||
//     !stock
//   ) {
//     return res.status(400).json({
//       message: "Missing product details check!",
//     });
//   }

//   if (!Array.isArray(images)) {
//     images = [images];
//   }

//   const payload = {
//     title,
//     price,
//     description,
//     category,
//     images: Array.isArray(images) ? images : [images],
//     rating,
//     stock,
//   };

//   try {
//     const newProduct = await Product.create(payload);
//     res.status(201).json({
//       message: "product insert successfully",
//       product: newProduct,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const getProductsByCategory = async (req, res) => {
//   try {

//     const category = req.params.category;
//     console.log(category);

//     const value = decodeURIComponent(category);

//     if (!value) {
//       return res.status(401).json({ message: "Category is required" });
//     }

//     const fetchProduct = await Product.find({
//       category: { $regex: new RegExp(value, "i") },
//     });

//     if (!fetchProduct.length) {
//       return res
//         .status(404)
//         .json({ message: "No products found for this category." });
//     }

//     res.status(200).json({
//       message: `All ${value} category fetched successfully`,
//       product: fetchProduct,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const searchProducts = async (req, res) => {
//   try {
//     let { keyword, category, minprice, maxprice, minRating } = req.query;

//     // build search query
//     let query = {};

//     if (keyword) {
//       query.$or = [
//         { title: { $regex: keyword, $options: "i" } },
//         { description: { $regex: keyword, $options: "i" } },
//       ];
//     }

//     if (category) {
//       query.category = { $regex: new RegExp(category, "i") };
//     }

//     if (minprice || maxprice) {
//       query.price = {};
//       if (minprice) query.price.$gte = parseInt(minprice);
//       if (maxprice) query.price.$lte = parseInt(maxprice);
//     }

//     // min rating filter

//     if (minRating) {
//       query.rating = { $gte: parseInt(minRating) };
//     }

//     // fetch product

//     const products = await Product.find(query);

//     if (products.length === 0) {
//       return res.status(404).json({ message: "No products found." });
//     }

//     return res.status(200).json({
//       message: "Products fetched successfully",
//       products,
//     });
//   } catch (error) {
//     console.error("Error searching for products:", error.message);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const addProductToCart = async (req, res) => {
//   const userId = req.user.userId;

//   try {
//     const { productId, quantity } = req.body;

//     const userFetch = await user.findById(userId);
//     if (!userFetch) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (quantity <= 0) {
//       return res
//         .status(400)
//         .json({ message: "Quantity must be greater than 0" });
//     }

//     if (!productId || !quantity) {
//       return res
//         .status(401)
//         .json({ message: "ProductId and Quantity is not available" });
//     }
//     const productFetch = await Product.findOne({ _id: productId }).populate();

//     if (!productFetch) {
//       return res.status(404).json({ message: "No products found." });
//     }

//     if (productFetch.stock < quantity) {
//       return res.status(400).json({ message: "Not enough stock Avaliable" });
//     }

//     const existingCartItem = userFetch.cart.find(
//       (item) => item.productId.toString() == productId
//     );
//     console.log(productFetch);

//     if (existingCartItem) {
//       existingCartItem.quantity += quantity;
//     } else {
//       userFetch.cart.push({ productId, quantity });
//     }

//     productFetch.stock -= quantity;

//     await userFetch.save();
//     await productFetch.save();

//     res.status(200).json({
//       message: "product added to cart Successful",
//       cart: userFetch.cart,
//     });
//   } catch (error) {
//     console.error("Error cart add to products:", error.message);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const reduceCartProductQuantity = async (req, res) => {
//   try {
//     const { userId, productId, newQuantity } = req.body;

//     if (newQuantity < 0)
//       return res.status(400).json({ message: "Quantity must be at least 1." });

//     const userFetch = await user.findById(userId);
//     if (!userFetch) return res.status(404).json({ message: "User not found" });

//     const product = await Product.findById(productId);
//     if (!product) return res.status(404).json({ message: "Product not found" });

//     if (cartItemIndex === -1)
//       return res.status(404).json({ message: "Product not found in cart" });

//     const cartItem = userFetch.cart[cartItemIndex];

//     if (newQuantity >= cartItem.quantity) {
//       return res
//         .status(400)
//         .json({ message: "Use update quantity API instead of reduce." });
//     }

//     const difference = cartItem.quantity - newQuantity;
//     product.stock += difference;

//     if (newQuantity === 0) {
//       userFetch.cart.splice(cartItemIndex, 1);
//     } else {
//       cartItem.quantity = newQuantity;
//     }

//     await user.save();
//     await product.save();

//     return res.status(200).json({
//       message:
//         newQuantity === 0
//           ? "Product removed from cart"
//           : `Cart updated: Product quantity reduced to ${newQuantity}`,
//       cart: userFetch.cart,
//     });
//   } catch (error) {
//     console.error("Error reducing cart quantity:", error.message);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const getAllProduct = async (req, res) => {
//   try {
//     const productFetch = await Product.find({});

//     return res.status(200).json({
//       message: "Product data fetch Successful!",
//       productFetch,
//       cart: user.cart,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const wishlistProduct = async (req, res) => {
//   const userId = req.user.userId;
//   if (!userId) {
//     return res.status(404).json({ message: "user not found" });
//   }

//   try {
//     const { productId } = req.body;
//     if (!productId) {
//       return res.status(404).json({ message: "product id was not provided" });
//     }
//     // console.log(productId);
//     const productFetch = await Product.findOne({ _id: productId });

//     if (!productFetch) {
//       return res.status(404).json({ message: "product not found" });
//     }

//     const userFetch = await user.findOne({ _id: userId });
//     console.log(userFetch);

//     const existingWishlist = userFetch.wishlist.find((item) => {
//       return item.toString() === productId;
//     });

//     if (existingWishlist) {
//       return res
//         .status(400)
//         .json({ message: "User Already exist in Wishlist" });
//     } else {
//       userFetch.wishlist.push(productId);
//     }

//     userFetch.save();

//     return res.status(200).json({
//       message: "product added to wish list",
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const removewishlist = async (req, res) => {
//   const userId = req.user.userId;
//   if (!userId) {
//     return res.status(400).json({ message: "User ID not found" });
//   }
//   try {
//     const { productId } = req.body;
//     if (!productId) {
//       return res.status(400).json({ message: "Product ID not found" });
//     }

//     const userFetch = await user.findOne({ _id: userId });
//     console.log(userFetch.wishlist);
//     const wishlist = userFetch.wishlist;

//     const productIndex = wishlist.findIndex((id) => {
//       return id.toString() === productId;
//     });

//     console.log(productIndex);

//     if (productIndex === -1) {
//       return res.status(400).json({ message: "Product not found in wishlist" });
//     }

//     wishlist.splice(productIndex, 1);

//     await userFetch.save();

//     return res.status(200).json({
//       message: "Product removed from wishlist",
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const getTotalCartPrice = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     if (!userId)
//       return res.status(400).json({ message: "User ID is required" });

//     const userFetch = await user.findById(userId).populate({
//       path: "cart.productId",
//       model: "Product",
//       select: "title price",
//     });

//     if (!userFetch) return res.status(404).json({ message: "User not found" });

//     if (!userFetch.cart.length) {
//       return res
//         .status(200)
//         .json({ message: "Cart is empty", totalCartPrice: 0 });
//     }

//     let totalCartPrice = 0;

//     const cartItems = userFetch.cart
//       .map((item) => {
//         if (item.productId && item.productId.price) {
//           const itemTotal = item.productId.price * item.quantity;
//           totalCartPrice += itemTotal;
//           return {
//             productId: item.productId._id,
//             title: item.productId.title,
//             price: item.productId.price,
//             quantity: item.quantity,
//             itemTotal,
//           };
//         }
//         return null;
//       })
//       .filter((item) => item !== null);

//     return res.status(200).json({
//       message: "Total cart price calculated",
//       cart: cartItems,
//       totalCartPrice,
//     });
//   } catch (error) {
//     console.error("Error calculating total cart price:", error.message);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// export {
//   productInsert,
//   getProductsByCategory,
//   searchProducts,
//   addProductToCart,
//   reduceCartProductQuantity,
//   getAllProduct,
//   wishlistProduct,
//   removewishlist,
//   getTotalCartPrice,
// };

// productController.js
import { Product } from "../models/Product.js";
import { user } from "../models/User.js";
import { Review } from "../models/Review.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { Order } from "../models/Order.js";
import mongoose from "mongoose";

// Create a new product
const productInsert = async (req, res) => {
  const {
    title,
    price,
    description,
    category,
    images,
    rating,
    stock,
    sku,
    brand,
    features,
    specifications,
    variants,
    discount,
    isFeatured,
    isNew,
    onSale,
  } = req.body;

  if (!title || !price || !description || !category || !images) {
    return res.status(400).json({
      message: "Missing required product details!",
    });
  }

  const payload = {
    title,
    price,
    description,
    category,
    images: Array.isArray(images) ? images : [images],
    rating: rating || 0,
    stock: stock || 0,
    sku: sku || generateSKU(title, category),
    brand: brand || "",
    features: features || [],
    specifications: specifications || {},
    variants: variants || [],
    discount: discount || 0,
    isFeatured: isFeatured || false,
    isNew: isNew || true,
    onSale: onSale || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const newProduct = await Product.create(payload);
    res.status(201).json({
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Generate a SKU
const generateSKU = (title, category) => {
  const titlePrefix = title.substring(0, 3).toUpperCase();
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${titlePrefix}-${categoryPrefix}-${randomNum}`;
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate({
      path: "reviews",
      populate: {
        path: "user",
        select: "username avatar",
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;

    const value = decodeURIComponent(category);

    if (!value) {
      return res.status(400).json({ message: "Category is required" });
    }

    const sortOptions = {};
    sortOptions[sort] = order;

    const fetchProducts = await Product.find({
      category: { $regex: new RegExp(value, "i") },
    })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments({
      category: { $regex: new RegExp(value, "i") },
    });

    if (!fetchProducts.length) {
      return res
        .status(404)
        .json({ message: "No products found for this category." });
    }

    res.status(200).json({
      message: `Products in ${value} category fetched successfully`,
      products: fetchProducts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products by category:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      price,
      description,
      category,
      images,
      rating,
      stock,
      sku,
      brand,
      features,
      specifications,
      discount,
      isFeatured,
      isNew,
      onSale,
    } = req.body;

    const updates = {};
    if (title) updates.title = title;
    if (price !== undefined) updates.price = price;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (images) {
      updates.images = Array.isArray(images) ? images : [images];
    }
    if (rating !== undefined) updates.rating = rating;
    if (stock !== undefined) updates.stock = stock;
    if (sku) updates.sku = sku;
    if (brand) updates.brand = brand;
    if (features) updates.features = features;
    if (specifications) updates.specifications = specifications;
    if (discount !== undefined) updates.discount = discount;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;
    if (isNew !== undefined) updates.isNew = isNew;
    if (onSale !== undefined) updates.onSale = onSale;

    updates.updatedAt = new Date();

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Also delete related data like reviews, variants, etc.
    await Review.deleteMany({ product: id });
    await ProductVariant.deleteMany({ product: id });

    res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    let {
      keyword,
      category,
      minPrice,
      maxPrice,
      minRating,
      brand,
      sort,
      order,
      page,
      limit,
    } = req.query;

    // Pagination
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;
    const skip = (page - 1) * limit;

    // Sorting
    sort = sort || "createdAt";
    order = order === "asc" ? 1 : -1;

    const sortOptions = {};
    sortOptions[sort] = order;

    // Build search query
    let query = {};

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { brand: { $regex: keyword, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: new RegExp(category, "i") };
    }

    if (brand) {
      query.brand = { $regex: new RegExp(brand, "i") };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Min rating filter
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Fetch products
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found." });
    }

    return res.status(200).json({
      message: "Products fetched successfully",
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error searching for products:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Add product to cart
const addProductToCart = async (req, res) => {
  const userId = req.user.userId;

  try {
    const { productId, quantity, variantId } = req.body;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ message: "ProductId and Quantity are required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be greater than 0" });
    }

    const productFetch = await Product.findById(productId);

    if (!productFetch) {
      return res.status(404).json({ message: "Product not found." });
    }

    // If variant specified, check variant stock
    let selectedVariant;
    if (variantId) {
      selectedVariant = productFetch.variants.find(
        (v) => v._id.toString() === variantId
      );

      if (!selectedVariant) {
        return res.status(404).json({ message: "Variant not found." });
      }

      if (selectedVariant.stock < quantity) {
        return res.status(400).json({
          message: "Not enough variant stock available",
          availableStock: selectedVariant.stock,
        });
      }
    } else if (productFetch.stock < quantity) {
      return res.status(400).json({
        message: "Not enough stock available",
        availableStock: productFetch.stock,
      });
    }

    // Check if product already in cart
    const cartItemIndex = userFetch.cart.findIndex((item) => {
      if (variantId) {
        return (
          item.productId.toString() === productId &&
          item.variantId &&
          item.variantId.toString() === variantId
        );
      }
      return item.productId.toString() === productId && !item.variantId;
    });

    if (cartItemIndex !== -1) {
      // Update quantity if product already in cart
      userFetch.cart[cartItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      const cartItem = {
        productId,
        quantity,
        addedAt: new Date(),
      };

      if (variantId) {
        cartItem.variantId = variantId;
      }

      userFetch.cart.push(cartItem);
    }

    // Update stock
    if (variantId && selectedVariant) {
      selectedVariant.stock -= quantity;
    } else {
      productFetch.stock -= quantity;
    }

    await userFetch.save();
    await productFetch.save();

    // Populate cart with product details
    await user.populate(userFetch, {
      path: "cart.productId",
      select: "title price images",
    });

    res.status(200).json({
      message: "Product added to cart successfully",
      cart: userFetch.cart,
    });
  } catch (error) {
    console.error("Error adding product to cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Reduce cart quantity
const reduceCartQuantity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity, variantId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (quantity < 0) {
      return res.status(400).json({ message: "Quantity must be at least 0" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find cart item
    const cartItemIndex = userFetch.cart.findIndex((item) => {
      if (variantId) {
        return (
          item.productId.toString() === productId &&
          item.variantId &&
          item.variantId.toString() === variantId
        );
      }
      return item.productId.toString() === productId && !item.variantId;
    });

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const cartItem = userFetch.cart[cartItemIndex];
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate quantity difference
    const qtyDifference = cartItem.quantity - quantity;

    // Update stock
    if (variantId) {
      const variantIndex = product.variants.findIndex(
        (v) => v._id.toString() === variantId
      );

      if (variantIndex !== -1) {
        product.variants[variantIndex].stock += qtyDifference;
      }
    } else {
      product.stock += qtyDifference;
    }

    // Update or remove cart item
    if (quantity === 0) {
      userFetch.cart.splice(cartItemIndex, 1);
    } else {
      cartItem.quantity = quantity;
    }

    await userFetch.save();
    await product.save();

    // Populate cart with product details
    await user.populate(userFetch, {
      path: "cart.productId",
      select: "title price images",
    });

    return res.status(200).json({
      message:
        quantity === 0 ? "Product removed from cart" : "Cart quantity updated",
      cart: userFetch.cart,
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { variantId } = req.query;

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find cart item
    const cartItemIndex = userFetch.cart.findIndex((item) => {
      if (variantId) {
        return (
          item.productId.toString() === productId &&
          item.variantId &&
          item.variantId.toString() === variantId
        );
      }
      return item.productId.toString() === productId && !item.variantId;
    });

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const cartItem = userFetch.cart[cartItemIndex];
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Restore stock
    if (variantId) {
      const variantIndex = product.variants.findIndex(
        (v) => v._id.toString() === variantId
      );

      if (variantIndex !== -1) {
        product.variants[variantIndex].stock += cartItem.quantity;
      }
    } else {
      product.stock += cartItem.quantity;
    }

    // Remove from cart
    userFetch.cart.splice(cartItemIndex, 1);

    await userFetch.save();
    await product.save();

    res.status(200).json({
      message: "Product removed from cart",
      cart: userFetch.cart,
    });
  } catch (error) {
    console.error("Error removing from cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Restore stock for all items
    for (const item of userFetch.cart) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (item.variantId) {
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === item.variantId.toString()
          );

          if (variantIndex !== -1) {
            product.variants[variantIndex].stock += item.quantity;
          }
        } else {
          product.stock += item.quantity;
        }
        await product.save();
      }
    }

    // Clear cart
    userFetch.cart = [];
    await userFetch.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      cart: [],
    });
  } catch (error) {
    console.error("Error clearing cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId).populate({
      path: "cart.productId",
      select: "title price images stock discount variants",
    });

    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.cart.length) {
      return res.status(200).json({
        message: "Cart is empty",
        cart: [],
        totalItems: 0,
        subtotal: 0,
      });
    }

    // Transform cart data for response
    const cartItems = [];
    let subtotal = 0;

    for (const item of userFetch.cart) {
      if (!item.productId) continue;

      let price = item.productId.price;
      let variantInfo = null;

      // Handle variant pricing
      if (
        item.variantId &&
        item.productId.variants &&
        item.productId.variants.length > 0
      ) {
        const variant = item.productId.variants.find(
          (v) => v._id.toString() === item.variantId.toString()
        );

        if (variant) {
          if (variant.price) {
            price = variant.price;
          }
          variantInfo = {
            id: variant._id,
            name: variant.name,
            sku: variant.sku,
            attributes: variant.attributes,
          };
        }
      }

      // Apply discount if any
      const discount = item.productId.discount || 0;
      const discountedPrice = price - price * (discount / 100);

      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;

      cartItems.push({
        id: item._id,
        productId: item.productId._id,
        title: item.productId.title,
        price: price,
        discountedPrice: discountedPrice,
        discount: discount,
        image:
          item.productId.images && item.productId.images.length > 0
            ? item.productId.images[0]
            : null,
        quantity: item.quantity,
        variant: variantInfo,
        stock:
          item.variantId && variantInfo
            ? item.productId.variants.find(
                (v) => v._id.toString() === item.variantId.toString()
              )?.stock
            : item.productId.stock,
        total: itemTotal,
        addedAt: item.addedAt,
      });
    }

    res.status(200).json({
      message: "Cart fetched successfully",
      cart: cartItems,
      totalItems: cartItems.length,
      subtotal: subtotal,
    });
  } catch (error) {
    console.error("Error fetching cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;

    const sortOptions = {};
    sortOptions[sort] = order;

    const products = await Product.find({})
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments();

    return res.status(200).json({
      message: "Products fetched successfully",
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Add product to wishlist
const wishlistProduct = async (req, res) => {
  const userId = req.user.userId;

  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const productFetch = await Product.findById(productId);
    if (!productFetch) {
      return res.status(404).json({ message: "Product not found" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.wishlist) {
      userFetch.wishlist = [];
    }

    // Check if product already in wishlist
    const existingInWishlist = userFetch.wishlist.some(
      (item) => item.toString() === productId
    );

    if (existingInWishlist) {
      return res.status(400).json({
        message: "Product already in wishlist",
      });
    }

    userFetch.wishlist.push(productId);
    await userFetch.save();

    return res.status(200).json({
      message: "Product added to wishlist",
      wishlist: userFetch.wishlist,
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove from wishlist
const removeWishlist = async (req, res) => {
  const userId = req.user.userId;

  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.wishlist) {
      return res.status(404).json({ message: "Wishlist is empty" });
    }

    const productIndex = userFetch.wishlist.findIndex(
      (id) => id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in wishlist" });
    }

    userFetch.wishlist.splice(productIndex, 1);
    await userFetch.save();

    return res.status(200).json({
      message: "Product removed from wishlist",
      wishlist: userFetch.wishlist,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId).populate({
      path: "wishlist",
      select: "title price images rating stock discount",
    });

    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Wishlist fetched successfully",
      wishlist: userFetch.wishlist || [],
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Calculate total cart price
const getTotalCartPrice = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId).populate({
      path: "cart.productId",
      select: "title price discount variants",
    });

    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.cart.length) {
      return res.status(200).json({
        message: "Cart is empty",
        totalCartPrice: 0,
        items: 0,
      });
    }

    let totalCartPrice = 0;
    let itemCount = 0;

    const cartDetails = [];

    for (const item of userFetch.cart) {
      if (!item.productId) continue;

      let price = item.productId.price;
      let variantName = null;

      // Handle variant pricing
      if (
        item.variantId &&
        item.productId.variants &&
        item.productId.variants.length > 0
      ) {
        const variant = item.productId.variants.find(
          (v) => v._id.toString() === item.variantId.toString()
        );

        if (variant) {
          if (variant.price) {
            price = variant.price;
          }
          variantName = variant.name;
        }
      }

      // Apply discount if any
      const discount = item.productId.discount || 0;
      const discountedPrice = price - price * (discount / 100);

      const itemTotal = discountedPrice * item.quantity;
      totalCartPrice += itemTotal;
      itemCount += item.quantity;

      cartDetails.push({
        productId: item.productId._id,
        title: item.productId.title,
        variant: variantName,
        price: price,
        discountedPrice: discountedPrice,
        discount: discount,
        quantity: item.quantity,
        itemTotal: itemTotal,
      });
    }

    return res.status(200).json({
      message: "Total cart price calculated",
      items: itemCount,
      cart: cartDetails,
      subtotal: totalCartPrice,
      tax: Math.round(totalCartPrice * 0.05 * 100) / 100, // Example 5% tax
      shipping: 0, // You can calculate this based on your rules
      totalCartPrice: Math.round(totalCartPrice * 1.05 * 100) / 100, // With tax
    });
  } catch (error) {
    console.error("Error calculating total cart price:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get product reviews
const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const reviews = await Review.find({ product: id })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ product: id });

    res.status(200).json({
      message: "Reviews fetched successfully",
      reviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create product review
const createProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating is required and must be between 1 and 5",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      product: id,
      user: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    // Create review
    const review = await Review.create({
      user: userId,
      product: id,
      rating,
      title: title || "",
      comment: comment || "",
      createdAt: new Date(),
    });

    // Update product average rating
    const allReviews = await Review.find({ product: id });
    const averageRating =
      allReviews.reduce((sum, item) => sum + item.rating, 0) /
      allReviews.length;

    product.rating = Math.round(averageRating * 10) / 10;
    product.reviewCount = allReviews.length;

    await product.save();

    const populatedReview = await Review.findById(review._id).populate(
      "user",
      "username avatar"
    );

    res.status(201).json({
      message: "Review added successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.error("Error adding review:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update product review
const updateProductReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user.userId;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user owns the review or is admin
    if (review.user.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You don't have permission to update this review",
      });
    }

    // Update review
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5",
        });
      }
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    if (title !== undefined) {
      review.title = title;
    }

    review.updatedAt = new Date();
    await review.save();

    // Update product average rating
    const productId = review.product;
    const allReviews = await Review.find({ product: productId });
    const averageRating =
      allReviews.reduce((sum, item) => sum + item.rating, 0) /
      allReviews.length;

    const product = await Product.findById(productId);
    if (product) {
      product.rating = Math.round(averageRating * 10) / 10;
      await product.save();
    }

    const updatedReview = await Review.findById(reviewId).populate(
      "user",
      "username avatar"
    );

    res.status(200).json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error updating review:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete product review
const deleteProductReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Check if user owns the review or is admin
    if (review.user.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You don't have permission to delete this review",
      });
    }

    const productId = review.product;

    await Review.findByIdAndDelete(reviewId);

    // Update product average rating
    const allReviews = await Review.find({ product: productId });

    const product = await Product.findById(productId);
    if (product) {
      if (allReviews.length > 0) {
        const averageRating =
          allReviews.reduce((sum, item) => sum + item.rating, 0) /
          allReviews.length;
        product.rating = Math.round(averageRating * 10) / 10;
      } else {
        product.rating = 0;
      }

      product.reviewCount = allReviews.length;
      await product.save();
    }

    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const featuredProducts = await Product.find({
      isFeatured: true,
    })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      message: "Featured products fetched successfully",
      products: featuredProducts,
    });
  } catch (error) {
    console.error("Error fetching featured products:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get related products
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find products in the same category
    const relatedProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
    })
      .sort({ rating: -1 })
      .limit(limit);

    res.status(200).json({
      message: "Related products fetched successfully",
      products: relatedProducts,
    });
  } catch (error) {
    console.error("Error fetching related products:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get best sellers
const getBestSellers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Using aggregation to count products in orders
    const bestSellers = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          count: { $sum: "$items.quantity" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const productIds = bestSellers.map((item) => item._id);

    // Get full product details
    const products = await Product.find({
      _id: { $in: productIds },
    });

    // Sort products to match the bestSellers order
    const sortedProducts = productIds
      .map((id) =>
        products.find((product) => product._id.toString() === id.toString())
      )
      .filter(Boolean);

    res.status(200).json({
      message: "Best selling products fetched successfully",
      products: sortedProducts,
    });
  } catch (error) {
    console.error("Error fetching best sellers:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get new arrivals
const getNewArrivals = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 10;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const newProducts = await Product.find({
      createdAt: { $gte: dateThreshold },
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      message: "New arrivals fetched successfully",
      products: newProducts,
    });
  } catch (error) {
    console.error("Error fetching new arrivals:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get products on sale
const getProductsOnSale = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const saleProducts = await Product.find({
      discount: { $gt: 0 },
    })
      .sort({ discount: -1 })
      .limit(limit);

    res.status(200).json({
      message: "Products on sale fetched successfully",
      products: saleProducts,
    });
  } catch (error) {
    console.error("Error fetching products on sale:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Bulk update stock (admin)
const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        message: "Updates must be an array of product stock updates",
      });
    }

    const results = [];

    for (const item of updates) {
      const { productId, stock, variantId } = item;

      if (!productId || stock === undefined) {
        results.push({
          productId,
          success: false,
          message: "Product ID and stock are required",
        });
        continue;
      }

      try {
        const product = await Product.findById(productId);

        if (!product) {
          results.push({
            productId,
            success: false,
            message: "Product not found",
          });
          continue;
        }

        if (variantId) {
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId
          );

          if (variantIndex === -1) {
            results.push({
              productId,
              variantId,
              success: false,
              message: "Variant not found",
            });
            continue;
          }

          product.variants[variantIndex].stock = stock;
          results.push({
            productId,
            variantId,
            success: true,
            previousStock: product.variants[variantIndex].stock,
            currentStock: stock,
          });
        } else {
          const previousStock = product.stock;
          product.stock = stock;
          results.push({
            productId,
            success: true,
            previousStock,
            currentStock: stock,
          });
        }

        await product.save();
      } catch (error) {
        results.push({
          productId,
          success: false,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Bulk stock update completed",
      results,
    });
  } catch (error) {
    console.error("Error in bulk stock update:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Upload product images
const uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "No files were uploaded." });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const imageFiles = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    // Process and save image files
    // This is a placeholder for your actual image processing logic
    const imageUrls = [];

    for (const file of imageFiles) {
      // In a real implementation, you would:
      // 1. Generate a unique filename
      // 2. Save the file to your storage (local, S3, etc.)
      // 3. Get the public URL

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `/uploads/products/${fileName}`;

      // Simulate moving the file
      // file.mv(`./public${filePath}`);

      imageUrls.push(filePath);
    }

    // Update product with new images
    if (!product.images) {
      product.images = imageUrls;
    } else {
      product.images = [...product.images, ...imageUrls];
    }

    await product.save();

    res.status(200).json({
      message: "Product images uploaded successfully",
      images: imageUrls,
      product: {
        id: product._id,
        title: product.title,
        images: product.images,
      },
    });
  } catch (error) {
    console.error("Error uploading product images:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get product variants
const getProductVariants = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product variants fetched successfully",
      variants: product.variants || [],
    });
  } catch (error) {
    console.error("Error fetching product variants:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create product variant
const createProductVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, price, stock, attributes } = req.body;

    if (!name || !attributes) {
      return res.status(400).json({
        message: "Variant name and attributes are required",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newVariant = {
      _id: new mongoose.Types.ObjectId(),
      name,
      sku: sku || `${product.sku}-${name.substring(0, 3).toUpperCase()}`,
      price: price || product.price,
      stock: stock || 0,
      attributes: attributes || {},
      createdAt: new Date(),
    };

    if (!product.variants) {
      product.variants = [newVariant];
    } else {
      // Check for duplicate variant
      const duplicateVariant = product.variants.find(
        (v) => v.name === name || (sku && v.sku === sku)
      );

      if (duplicateVariant) {
        return res.status(400).json({
          message: "A variant with this name or SKU already exists",
        });
      }

      product.variants.push(newVariant);
    }

    await product.save();

    res.status(201).json({
      message: "Product variant created successfully",
      variant: newVariant,
    });
  } catch (error) {
    console.error("Error creating product variant:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update product variant
const updateProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const { name, sku, price, stock, attributes } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.variants) {
      return res
        .status(404)
        .json({ message: "No variants found for this product" });
    }

    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === variantId
    );

    if (variantIndex === -1) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Update variant
    if (name) product.variants[variantIndex].name = name;
    if (sku) product.variants[variantIndex].sku = sku;
    if (price !== undefined) product.variants[variantIndex].price = price;
    if (stock !== undefined) product.variants[variantIndex].stock = stock;
    if (attributes) product.variants[variantIndex].attributes = attributes;

    product.variants[variantIndex].updatedAt = new Date();

    await product.save();

    res.status(200).json({
      message: "Product variant updated successfully",
      variant: product.variants[variantIndex],
    });
  } catch (error) {
    console.error("Error updating product variant:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete product variant
const deleteProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.variants) {
      return res
        .status(404)
        .json({ message: "No variants found for this product" });
    }

    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === variantId
    );

    if (variantIndex === -1) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Check if this variant is in any user's cart
    const usersWithVariantInCart = await user.countDocuments({
      "cart.productId": id,
      "cart.variantId": variantId,
    });

    if (usersWithVariantInCart > 0) {
      return res.status(400).json({
        message: "Cannot delete variant that is in users' carts",
        usersAffected: usersWithVariantInCart,
      });
    }

    // Remove the variant
    product.variants.splice(variantIndex, 1);
    await product.save();

    res.status(200).json({
      message: "Product variant deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product variant:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const addProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating is required and must be between 1 and 5",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      product: id,
      user: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    // Create review
    const review = await Review.create({
      user: userId,
      product: id,
      rating,
      title: title || "",
      comment: comment || "",
      createdAt: new Date(),
    });

    // Update product average rating
    const allReviews = await Review.find({ product: id });
    const averageRating =
      allReviews.reduce((sum, item) => sum + item.rating, 0) /
      allReviews.length;

    product.rating = Math.round(averageRating * 10) / 10;
    product.reviewCount = allReviews.length;

    await product.save();

    const populatedReview = await Review.findById(review._id).populate(
      "user",
      "username avatar"
    );

    res.status(201).json({
      message: "Review added successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.error("Error adding review:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export {
  productInsert,
  getProductById,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  searchProducts,
  addProductToCart,
  reduceCartQuantity,
  removeFromCart,
  clearCart,
  getCart,
  getAllProducts,
  wishlistProduct,
  removeWishlist,
  getWishlist,
  getTotalCartPrice,
  getProductReviews,
  createProductReview,
  updateProductReview,
  deleteProductReview,
  getFeaturedProducts,
  getRelatedProducts,
  getBestSellers,
  getNewArrivals,
  getProductsOnSale,
  bulkUpdateStock,
  uploadProductImages,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  addProductReview,
};
