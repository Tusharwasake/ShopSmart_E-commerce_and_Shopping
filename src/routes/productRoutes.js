import {
  productInsert,
  getProductsByCategory,
  searchProducts,
  addProductToCart,
  reduceCartProductQuantity,
  getAllProduct,
  wishlistProduct,
  removewishlist,
  getTotalCartPrice

} from "../controllers/productController.js";
import { Router } from "express";
import { authentication } from "../middlewares/authMiddleware.js";

const productRoutes = Router();

productRoutes.post("/insert", authentication, productInsert);
productRoutes.get("/category/:category", getProductsByCategory);
productRoutes.get("/getAllProduct", getAllProduct);
productRoutes.get("/search", searchProducts);
productRoutes.post("/addToCart", authentication, addProductToCart);
productRoutes.post("/addToCart", authentication, reduceCartProductQuantity);
productRoutes.post("/wishlist", authentication, wishlistProduct);
productRoutes.post("/removewishlist", authentication, removewishlist);
productRoutes.get("/totalCartPrice", authentication, getTotalCartPrice);

export { productRoutes };
