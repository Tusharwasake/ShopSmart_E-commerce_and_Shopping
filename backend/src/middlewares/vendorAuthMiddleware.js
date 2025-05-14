// middlewares/vendorAuthMiddleware.js
const vendorAuth = (req, res, next) => {
  // Check if user is a vendor
  if (req.user.role !== "vendor") {
    return res.status(403).json({
      message: "Access denied. Vendor privileges required.",
    });
  }

  // Check if vendor has a vendorId
  if (!req.user.vendorId) {
    return res.status(403).json({
      message: "Invalid vendor account. Please contact support.",
    });
  }

  next();
};

export { vendorAuth };
