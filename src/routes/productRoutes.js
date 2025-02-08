import {
  productInsert,
  getProductsByCategory,
} from "../controllers/productController.js";
import { Router } from "express";
import { authentication } from "../middlewares/authMiddleware.js";

const productRoutes = Router();

productRoutes.post("/insert", authentication, productInsert);
productRoutes.get("/category/:category", getProductsByCategory);

export { productRoutes };
