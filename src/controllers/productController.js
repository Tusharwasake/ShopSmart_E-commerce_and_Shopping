import { Product } from "../models/product.js";

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
    images,
    rating,
    stock,
    images,
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

export { productInsert, getProductsByCategory };
