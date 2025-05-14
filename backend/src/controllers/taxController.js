// taxController.js
import { TaxRate } from "../models/TaxRate.js";
import { TaxZone } from "../models/TaxZone.js";
import { TaxSettings } from "../models/TaxSettings.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";

// Get all tax rates
const getTaxRates = async (req, res) => {
  try {
    const taxRates = await TaxRate.find()
      .sort({ priority: 1 })
      .populate("zoneId");

    res.status(200).json({
      message: "Tax rates fetched successfully",
      taxRates,
    });
  } catch (error) {
    console.error("Error fetching tax rates:", error.message);
    res.status(500).json({ message: "Error fetching tax rates" });
  }
};

// Get tax rate by ID
const getTaxRateById = async (req, res) => {
  try {
    const { id } = req.params;

    const taxRate = await TaxRate.findById(id).populate("zoneId");

    if (!taxRate) {
      return res.status(404).json({ message: "Tax rate not found" });
    }

    res.status(200).json({
      message: "Tax rate fetched successfully",
      taxRate,
    });
  } catch (error) {
    console.error("Error fetching tax rate:", error.message);
    res.status(500).json({ message: "Error fetching tax rate" });
  }
};

// Create a new tax rate
const createTaxRate = async (req, res) => {
  try {
    const {
      name,
      rate,
      zoneId,
      productCategories,
      isCompound,
      priority,
      active,
    } = req.body;

    if (!name || rate === undefined) {
      return res.status(400).json({
        message: "Name and rate are required",
      });
    }

    // Validate rate (percentage)
    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        message: "Rate must be between 0 and 100",
      });
    }

    // Check if zone exists if provided
    if (zoneId) {
      const zone = await TaxZone.findById(zoneId);
      if (!zone) {
        return res.status(404).json({ message: "Tax zone not found" });
      }
    }

    const taxRate = await TaxRate.create({
      name,
      rate,
      zoneId: zoneId || null,
      productCategories: productCategories || [],
      isCompound: isCompound || false,
      priority: priority || 0,
      active: active !== undefined ? active : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Tax rate created successfully",
      taxRate,
    });
  } catch (error) {
    console.error("Error creating tax rate:", error.message);
    res.status(500).json({ message: "Error creating tax rate" });
  }
};

// Update tax rate
const updateTaxRate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const taxRate = await TaxRate.findById(id);

    if (!taxRate) {
      return res.status(404).json({ message: "Tax rate not found" });
    }

    // Validate rate if provided
    if (
      updates.rate !== undefined &&
      (updates.rate < 0 || updates.rate > 100)
    ) {
      return res.status(400).json({
        message: "Rate must be between 0 and 100",
      });
    }

    // Check if zone exists if changed
    if (updates.zoneId && updates.zoneId !== taxRate.zoneId?.toString()) {
      const zone = await TaxZone.findById(updates.zoneId);
      if (!zone) {
        return res.status(404).json({ message: "Tax zone not found" });
      }
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "createdAt") {
        taxRate[key] = updates[key];
      }
    });

    taxRate.updatedAt = new Date();

    await taxRate.save();

    res.status(200).json({
      message: "Tax rate updated successfully",
      taxRate,
    });
  } catch (error) {
    console.error("Error updating tax rate:", error.message);
    res.status(500).json({ message: "Error updating tax rate" });
  }
};

// Delete tax rate
const deleteTaxRate = async (req, res) => {
  try {
    const { id } = req.params;

    const taxRate = await TaxRate.findById(id);

    if (!taxRate) {
      return res.status(404).json({ message: "Tax rate not found" });
    }

    await TaxRate.findByIdAndDelete(id);

    res.status(200).json({
      message: "Tax rate deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tax rate:", error.message);
    res.status(500).json({ message: "Error deleting tax rate" });
  }
};

// Calculate tax for an order
const calculateTax = async (req, res) => {
  try {
    const { items, shippingAddress, shippingCost, couponDiscount } = req.body;

    if (!items || !items.length || !shippingAddress) {
      return res.status(400).json({
        message: "Items and shipping address are required",
      });
    }

    // Get tax settings
    const settings = await TaxSettings.findOne();

    // Default tax settings if none found
    const taxSettings = settings || {
      pricesIncludeTax: false,
      calculateTaxBasedOn: "shipping",
      shippingTaxClass: "standard",
      roundTaxAtSubtotal: true,
    };

    // Get applicable tax zone based on shipping address
    const taxZone = await findTaxZoneByAddress(shippingAddress);

    // Get tax rates applicable to this zone
    const taxRates = await TaxRate.find({
      active: true,
      $or: [
        { zoneId: taxZone?._id },
        { zoneId: null }, // Global tax rates with no zone
      ],
    }).sort({ priority: 1 });

    // No tax if no applicable rates
    if (taxRates.length === 0) {
      return res.status(200).json({
        message: "No applicable tax rates found",
        taxCalculation: {
          subtotal: calculateSubtotal(items),
          taxableAmount: calculateSubtotal(items),
          taxAmount: 0,
          taxDetails: [],
        },
      });
    }

    // Prepare items with their categories for tax calculation
    const itemsWithCategories = await getItemsWithCategories(items);

    // Calculate taxes
    const taxCalculation = calculateTaxes(
      itemsWithCategories,
      taxRates,
      taxSettings,
      shippingCost || 0,
      couponDiscount || 0
    );

    res.status(200).json({
      message: "Tax calculated successfully",
      taxCalculation,
    });
  } catch (error) {
    console.error("Error calculating tax:", error.message);
    res.status(500).json({ message: "Error calculating tax" });
  }
};

// Helper function to find tax zone by address
const findTaxZoneByAddress = async (address) => {
  const { country, state, postalCode } = address;

  // First try to find a zone with postal code match
  if (country && postalCode) {
    const postalCodeZone = await TaxZone.findOne({
      "locations.country": country,
      "locations.postalCodes": { $regex: postalCode },
    });

    if (postalCodeZone) {
      return postalCodeZone;
    }
  }

  // Then try with country and state
  if (country && state) {
    const stateZone = await TaxZone.findOne({
      "locations.country": country,
      "locations.states": state,
    });

    if (stateZone) {
      return stateZone;
    }
  }

  // Finally try with just country
  if (country) {
    const countryZone = await TaxZone.findOne({
      "locations.country": country,
      "locations.states": { $exists: false, $size: 0 },
      "locations.postalCodes": { $exists: false, $size: 0 },
    });

    return countryZone;
  }

  return null;
};

// Helper function to get items with their categories
const getItemsWithCategories = async (items) => {
  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } }).select(
    "_id category"
  );

  return items.map((item) => {
    const product = products.find(
      (p) => p._id.toString() === item.productId.toString()
    );
    return {
      ...item,
      category: product ? product.category : null,
    };
  });
};

// Helper function to calculate subtotal
const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

// Helper function to calculate taxes
const calculateTaxes = (
  items,
  taxRates,
  taxSettings,
  shippingCost = 0,
  couponDiscount = 0
) => {
  const subtotal = calculateSubtotal(items);
  let taxableAmount = subtotal - couponDiscount;
  let totalTax = 0;
  const taxDetails = [];

  // Calculate tax for each applicable rate
  for (const taxRate of taxRates) {
    // Skip compound taxes for first pass
    if (taxRate.isCompound) continue;

    // Filter items based on categories if tax rate has category restrictions
    let rateItems = items;
    if (taxRate.productCategories && taxRate.productCategories.length > 0) {
      rateItems = items.filter((item) =>
        taxRate.productCategories.includes(item.category)
      );
    }

    // Calculate taxable amount for this rate
    let rateTaxableAmount = rateItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Add shipping to taxable amount if applicable
    if (
      taxSettings.calculateTaxBasedOn === "shipping" &&
      (!taxRate.productCategories ||
        taxRate.productCategories.includes(taxSettings.shippingTaxClass))
    ) {
      rateTaxableAmount += shippingCost;
    }

    // Apply proportion of coupon discount if any
    if (couponDiscount > 0 && subtotal > 0) {
      const discountProportion = rateTaxableAmount / subtotal;
      rateTaxableAmount -= couponDiscount * discountProportion;
    }

    // Skip if no taxable amount
    if (rateTaxableAmount <= 0) continue;

    // Calculate tax for this rate
    const taxAmount = (rateTaxableAmount * taxRate.rate) / 100;

    // Add to total and details
    totalTax += taxAmount;
    taxDetails.push({
      rateId: taxRate._id,
      name: taxRate.name,
      rate: taxRate.rate,
      taxableAmount: rateTaxableAmount,
      taxAmount,
      isCompound: false,
    });
  }

  // Now calculate compound taxes
  for (const taxRate of taxRates) {
    if (!taxRate.isCompound) continue;

    // Filter items based on categories if tax rate has category restrictions
    let rateItems = items;
    if (taxRate.productCategories && taxRate.productCategories.length > 0) {
      rateItems = items.filter((item) =>
        taxRate.productCategories.includes(item.category)
      );
    }

    // Calculate taxable amount for this rate
    let rateTaxableAmount = rateItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Add shipping to taxable amount if applicable
    if (
      taxSettings.calculateTaxBasedOn === "shipping" &&
      (!taxRate.productCategories ||
        taxRate.productCategories.includes(taxSettings.shippingTaxClass))
    ) {
      rateTaxableAmount += shippingCost;
    }

    // Apply proportion of coupon discount if any
    if (couponDiscount > 0 && subtotal > 0) {
      const discountProportion = rateTaxableAmount / subtotal;
      rateTaxableAmount -= couponDiscount * discountProportion;
    }

    // For compound tax, add the tax amounts from previous non-compound rates
    rateTaxableAmount += totalTax;

    // Skip if no taxable amount
    if (rateTaxableAmount <= 0) continue;

    // Calculate tax for this rate
    const taxAmount = (rateTaxableAmount * taxRate.rate) / 100;

    // Add to total and details
    totalTax += taxAmount;
    taxDetails.push({
      rateId: taxRate._id,
      name: taxRate.name,
      rate: taxRate.rate,
      taxableAmount: rateTaxableAmount,
      taxAmount,
      isCompound: true,
    });
  }

  // Round if required
  if (taxSettings.roundTaxAtSubtotal) {
    totalTax = Math.round(totalTax * 100) / 100;
  }

  return {
    subtotal,
    taxableAmount,
    taxAmount: totalTax,
    taxDetails,
  };
};

// Get all tax zones
const getTaxZones = async (req, res) => {
  try {
    const taxZones = await TaxZone.find().sort({ name: 1 });

    res.status(200).json({
      message: "Tax zones fetched successfully",
      taxZones,
    });
  } catch (error) {
    console.error("Error fetching tax zones:", error.message);
    res.status(500).json({ message: "Error fetching tax zones" });
  }
};

// Get tax zone by ID
const getTaxZoneById = async (req, res) => {
  try {
    const { id } = req.params;

    const taxZone = await TaxZone.findById(id);

    if (!taxZone) {
      return res.status(404).json({ message: "Tax zone not found" });
    }

    res.status(200).json({
      message: "Tax zone fetched successfully",
      taxZone,
    });
  } catch (error) {
    console.error("Error fetching tax zone:", error.message);
    res.status(500).json({ message: "Error fetching tax zone" });
  }
};

// Create a new tax zone
const createTaxZone = async (req, res) => {
  try {
    const { name, description, locations } = req.body;

    if (!name || !locations || !locations.length) {
      return res.status(400).json({
        message: "Name and at least one location are required",
      });
    }

    // Validate locations
    for (const location of locations) {
      if (!location.country) {
        return res.status(400).json({
          message: "Country is required for each location",
        });
      }
    }

    const taxZone = await TaxZone.create({
      name,
      description: description || "",
      locations,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Tax zone created successfully",
      taxZone,
    });
  } catch (error) {
    console.error("Error creating tax zone:", error.message);
    res.status(500).json({ message: "Error creating tax zone" });
  }
};

// Update tax zone
const updateTaxZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, locations } = req.body;

    const taxZone = await TaxZone.findById(id);

    if (!taxZone) {
      return res.status(404).json({ message: "Tax zone not found" });
    }

    // Update fields
    if (name) taxZone.name = name;
    if (description !== undefined) taxZone.description = description;
    if (locations) {
      // Validate locations
      for (const location of locations) {
        if (!location.country) {
          return res.status(400).json({
            message: "Country is required for each location",
          });
        }
      }
      taxZone.locations = locations;
    }

    taxZone.updatedAt = new Date();

    await taxZone.save();

    res.status(200).json({
      message: "Tax zone updated successfully",
      taxZone,
    });
  } catch (error) {
    console.error("Error updating tax zone:", error.message);
    res.status(500).json({ message: "Error updating tax zone" });
  }
};

// Delete tax zone
const deleteTaxZone = async (req, res) => {
  try {
    const { id } = req.params;

    const taxZone = await TaxZone.findById(id);

    if (!taxZone) {
      return res.status(404).json({ message: "Tax zone not found" });
    }

    // Check if this zone is used by any tax rates
    const taxRatesUsingZone = await TaxRate.countDocuments({ zoneId: id });

    if (taxRatesUsingZone > 0) {
      return res.status(400).json({
        message: `This tax zone is used by ${taxRatesUsingZone} tax rates. Please update or delete those tax rates first.`,
      });
    }

    await TaxZone.findByIdAndDelete(id);

    res.status(200).json({
      message: "Tax zone deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tax zone:", error.message);
    res.status(500).json({ message: "Error deleting tax zone" });
  }
};

// Get tax settings
const getTaxSettings = async (req, res) => {
  try {
    let settings = await TaxSettings.findOne();

    if (!settings) {
      // Create default settings if not found
      settings = await TaxSettings.create({
        pricesIncludeTax: false,
        calculateTaxBasedOn: "shipping",
        shippingTaxClass: "standard",
        roundTaxAtSubtotal: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.status(200).json({
      message: "Tax settings fetched successfully",
      settings,
    });
  } catch (error) {
    console.error("Error fetching tax settings:", error.message);
    res.status(500).json({ message: "Error fetching tax settings" });
  }
};

// Update tax settings
const updateTaxSettings = async (req, res) => {
  try {
    const {
      pricesIncludeTax,
      calculateTaxBasedOn,
      shippingTaxClass,
      roundTaxAtSubtotal,
    } = req.body;

    let settings = await TaxSettings.findOne();

    if (!settings) {
      settings = new TaxSettings({
        createdAt: new Date(),
      });
    }

    // Update fields
    if (pricesIncludeTax !== undefined)
      settings.pricesIncludeTax = pricesIncludeTax;
    if (calculateTaxBasedOn) settings.calculateTaxBasedOn = calculateTaxBasedOn;
    if (shippingTaxClass) settings.shippingTaxClass = shippingTaxClass;
    if (roundTaxAtSubtotal !== undefined)
      settings.roundTaxAtSubtotal = roundTaxAtSubtotal;

    settings.updatedAt = new Date();

    await settings.save();

    res.status(200).json({
      message: "Tax settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Error updating tax settings:", error.message);
    res.status(500).json({ message: "Error updating tax settings" });
  }
};

// Get tax report
const getTaxReport = async (req, res) => {
  try {
    const { startDate, endDate, zoneId } = req.query;

    // Validate date range
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build query
    const query = {
      createdAt: { $gte: start, $lte: end },
      status: { $nin: ["cancelled", "refunded"] },
    };

    // Get all orders in date range
    const orders = await Order.find(query);

    let taxByRate = {};
    let taxByCountry = {};
    let totalTax = 0;
    let totalSales = 0;

    // Process each order
    for (const order of orders) {
      // Skip orders without tax
      if (!order.tax || order.tax === 0) continue;

      // Get zone for this order if filter is applied
      if (zoneId) {
        const zone = await findTaxZoneByAddress(order.shippingAddress);
        if (!zone || zone._id.toString() !== zoneId) continue;
      }

      totalTax += order.tax;
      totalSales += order.total;

      // Aggregate by country
      const country = order.shippingAddress.country;
      if (!taxByCountry[country]) {
        taxByCountry[country] = {
          country,
          orderCount: 0,
          taxAmount: 0,
          salesAmount: 0,
        };
      }

      taxByCountry[country].orderCount += 1;
      taxByCountry[country].taxAmount += order.tax;
      taxByCountry[country].salesAmount += order.total;

      // Aggregate by tax rate if details available
      if (order.taxDetails) {
        for (const detail of order.taxDetails) {
          const rateId = detail.rateId.toString();

          if (!taxByRate[rateId]) {
            taxByRate[rateId] = {
              rateId,
              name: detail.name,
              rate: detail.rate,
              taxAmount: 0,
              orderCount: 0,
            };
          }

          taxByRate[rateId].taxAmount += detail.taxAmount;
          taxByRate[rateId].orderCount += 1;
        }
      }
    }

    res.status(200).json({
      message: "Tax report generated successfully",
      report: {
        period: {
          startDate: start,
          endDate: end,
        },
        summary: {
          totalTax,
          totalSales,
          taxPercentage: totalSales > 0 ? (totalTax / totalSales) * 100 : 0,
          orderCount: orders.length,
        },
        taxByRate: Object.values(taxByRate),
        taxByCountry: Object.values(taxByCountry),
      },
    });
  } catch (error) {
    console.error("Error generating tax report:", error.message);
    res.status(500).json({ message: "Error generating tax report" });
  }
};

export {
  getTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  calculateTax,
  getTaxZones,
  getTaxZoneById,
  createTaxZone,
  updateTaxZone,
  deleteTaxZone,
  getTaxSettings,
  updateTaxSettings,
  getTaxReport,
};
