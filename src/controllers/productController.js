import { Product } from "../models/product.js";
import { user } from "../models/User.js";

const productInsert = async (req, res) => {
  const { title, price, description, category, images, rating, stock } =
    req.body;

  if (
    !title ||
    !price ||
    !description ||
    !category ||
    !images ||
    !rating ||
    !stock
  ) {
    return res.status(400).json({
      message: "Missing product details check!",
    });
  }

  if (!Array.isArray(images)) {
    images = [images];
  }

  const payload = {
    title,
    price,
    description,
    category,
    images: Array.isArray(images) ? images : [images],
    rating,
    stock,
  };

  try {
    const newProduct = await Product.create(payload);
    res.status(201).json({
      message: "product insert successfully",
      product: newProduct,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    console.log(category);

    const value = decodeURIComponent(category);

    if (!value) {
      return res.status(401).json({ message: "Category is required" });
    }

    const fetchProduct = await Product.find({
      category: { $regex: new RegExp(value, "i") },
    });

    if (!fetchProduct.length) {
      return res
        .status(404)
        .json({ message: "No products found for this category." });
    }

    res.status(200).json({
      message: `All ${value} category fetched successfully`,
      product: fetchProduct,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const searchProducts = async (req, res) => {
  try {
    let { keyword, category, minprice, maxprice, minRating } = req.query;

    // build search query
    let query = {};

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: new RegExp(category, "i") };
    }

    if (minprice || maxprice) {
      query.price = {};
      if (minprice) query.price.$gte = parseFloat(minprice);
      if (maxprice) query.price.$lte = parseFloat(maxprice);
    }

    // min rating filter

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // fetch product

    const products = await Product.findOne(query);

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found." });
    }

    return res.status(200).json({
      message: "Products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Error searching for products:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const addProductToCart = async (req, res) => {
  const userId = req.user.userId;

  try {
    const { productId, quantity } = req.body;

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be greater than 0" });
    }

    if (!productId || !quantity) {
      return res
        .status(401)
        .json({ message: "ProductId and Quantity is not available" });
    }
    const productFetch = await Product.findOne({ _id: productId }).populate();

    if (!productFetch) {
      return res.status(404).json({ message: "No products found." });
    }

    if (productFetch.stock < quantity) {
      return res.status(400).json({ message: "Not enough stock Avaliable" });
    }

    const existingCartItem = userFetch.cart.find(
      (item) => item.productId.toString() == productId
    );
    console.log(productFetch);

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
    } else {
      userFetch.cart.push({ productId, quantity });
    }

    productFetch.stock -= quantity;

    await userFetch.save();
    await productFetch.save();

    res.status(200).json({
      message: "product added to cart Successful",
      cart: userFetch.cart,
    });
  } catch (error) {
    console.error("Error cart add to products:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const reduceCartProductQuantity = async (req, res) => {
  try {
    const { userId, productId, newQuantity } = req.body;

    if (newQuantity < 0)
      return res.status(400).json({ message: "Quantity must be at least 1." });

    const userFetch = await user.findById(userId);
    if (!userFetch) return res.status(404).json({ message: "User not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (cartItemIndex === -1)
      return res.status(404).json({ message: "Product not found in cart" });

    const cartItem = userFetch.cart[cartItemIndex];

    if (newQuantity >= cartItem.quantity) {
      return res
        .status(400)
        .json({ message: "Use update quantity API instead of reduce." });
    }

    const difference = cartItem.quantity - newQuantity;
    product.stock += difference;

    if (newQuantity === 0) {
      userFetch.cart.splice(cartItemIndex, 1);
    } else {
      cartItem.quantity = newQuantity;
    }

    await user.save();
    await product.save();

    return res.status(200).json({
      message:
        newQuantity === 0
          ? "Product removed from cart"
          : `Cart updated: Product quantity reduced to ${newQuantity}`,
      cart: userFetch.cart,
    });
  } catch (error) {
    console.error("Error reducing cart quantity:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllProduct = async (req, res) => {
  try {
    const productFetch = await Product.find({});

    return res.status(200).json({
      message: "Product data fetch Successful!",
      productFetch,
      cart: user.cart,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const wishlistProduct = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return res.status(404).json({ message: "user not found" });
  }

  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(404).json({ message: "product id was not provided" });
    }
    // console.log(productId);
    const productFetch = await Product.findOne({ _id: productId });

    if (!productFetch) {
      return res.status(404).json({ message: "product not found" });
    }

    const userFetch = await user.findOne({ _id: userId });
    console.log(userFetch);

    const existingWishlist = userFetch.wishlist.find((item) => {
      return item.toString() === productId;
    });

    if (existingWishlist) {
      return res
        .status(400)
        .json({ message: "User Already exist in Wishlist" });
    } else {
      userFetch.wishlist.push(productId);
    }

    userFetch.save();

    return res.status(200).json({
      message: "product added to wish list",
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const removewishlist = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return res.status(400).json({ message: "User ID not found" });
  }
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "Product ID not found" });
    }

    const userFetch = await user.findOne({ _id: userId });
    console.log(userFetch.wishlist); // Changed from cart to wishlist
    const wishlist = userFetch.wishlist;

    const productIndex = wishlist.findIndex((id) => {
      return id.toString() === productId;
    });

    console.log(productIndex);

    if (productIndex === -1) {
      return res.status(400).json({ message: "Product not found in wishlist" });
    }

    wishlist.splice(productIndex, 1); // Removing the product from wishlist

    await userFetch.save();

    return res.status(200).json({
      message: "Product removed from wishlist",
    });
  } catch (error) {
    console.error(error); // Logging the error for debugging
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getTotalCartPrice = async (req, res) => {
  try {
    const userId = req.user.userId; // Extract user ID from the request
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    // 1️⃣ Fetch User and Populate Cart Products
    const userFetch = await user.findById(userId).populate({
      path: "cart.productId",
      model: "Product", // Ensure the correct model is referenced
      select: "title price",
    });

    

    if (!userFetch) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Check if Cart is Empty
    if (!userFetch.cart.length) {
      return res
        .status(200)
        .json({ message: "Cart is empty", totalCartPrice: 0 });
    }

    // 3️⃣ Calculate Total Price
    let totalCartPrice = 0;

    const cartItems = userFetch.cart
      .map((item) => {
        if (item.productId && item.productId.price) {
          const itemTotal = item.productId.price * item.quantity;
          totalCartPrice += itemTotal;
          return {
            productId: item.productId._id,
            title: item.productId.title,
            price: item.productId.price,
            quantity: item.quantity,
            itemTotal,
          };
        }
        return null;
      })
      .filter((item) => item !== null); // Remove null values if productId is missing

    return res.status(200).json({
      message: "Total cart price calculated",
      cart: cartItems,
      totalCartPrice,
    });
  } catch (error) {
    console.error("Error calculating total cart price:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export {
  productInsert,
  getProductsByCategory,
  searchProducts,
  addProductToCart,
  reduceCartProductQuantity,
  getAllProduct,
  wishlistProduct,
  removewishlist,
  getTotalCartPrice,
};
