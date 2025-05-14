# E-Commerce Platform API Documentation

## Introduction

This documentation outlines the RESTful API endpoints for the E-Commerce Platform backend. The API provides functionality for user authentication, product management, cart operations, order processing, payment handling, and more.

## Base URL

```
http://localhost:{SERVER_PORT}
```

## Authentication

Most endpoints require authentication using JSON Web Tokens (JWT).

### Headers

Include the token in the Authorization header:

```
Authorization: Bearer {access_token}
```

## Table of Contents

- [Authentication](#authentication)
- [Products](#products)
- [Cart](#cart)
- [Wishlist](#wishlist)
- [Orders](#orders)
- [Payments](#payments)
- [Categories](#categories)
- [Reviews](#reviews)
- [Search](#search)
- [Coupons](#coupons)
- [User Management](#user-management)
- [Shipping](#shipping)
- [Content Management](#content-management)
- [Analytics](#analytics)
- [Dashboard](#dashboard)
- [Inventory Management](#inventory-management)
- [Vendor Management](#vendor-management)
- [Notifications](#notifications)
- [Tax Management](#tax-management)
- [File Upload Management](#file-upload-management)
- [Variants Management](#variants-management)

## Authentication

### Register User

```
POST /auth/register
```

Register a new user.

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "message": "Account created successfully"
}
```

### Login

```
POST /auth/login
```

Log in and get access token.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "accessToken": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "role": "string"
  }
}
```

### Logout

```
POST /auth/logout
```

Invalidate current session.

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

### Forgot Password

```
POST /auth/forgotpassword
```

Request password reset OTP.

**Request Body:**

```json
{
  "email": "string"
}
```

**Response:**

```json
{
  "message": "Password reset OTP Sent"
}
```

### Reset Password

```
POST /auth/resetpassword
```

Reset password with OTP.

**Request Body:**

```json
{
  "email": "string",
  "otp": "string",
  "newpassword": "string"
}
```

**Response:**

```json
{
  "message": "Password reset successful, you can login now"
}
```

### Refresh Token

```
POST /auth/refresh-token
```

Get a new access token using refresh token.

**Response:**

```json
{
  "accessToken": "string"
}
```

### Get Current User

```
GET /auth/me
```

Get current user details.

**Response:**

```json
{
  "username": "string",
  "email": "string",
  "role": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "zipCode": "string"
  },
  "phone": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Change Password

```
PUT /auth/change-password
```

Change the current user's password.

**Request Body:**

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response:**

```json
{
  "message": "Password changed successfully"
}
```

### Verify Email

```
POST /auth/verify-email
```

Verify user's email address.

**Request Body:**

```json
{
  "email": "string",
  "verificationCode": "string"
}
```

**Response:**

```json
{
  "message": "Email verified successfully"
}
```

### Resend Verification

```
POST /auth/resend-verification
```

Resend email verification code.

**Response:**

```json
{
  "message": "Verification email sent"
}
```

## Products

### Get All Products

```
GET /product
```

Get a list of all products.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 12)
- `sort` (optional): Sort field (default: "createdAt")
- `order` (optional): Sort order, "asc" or "desc" (default: "desc")

**Response:**

```json
{
  "message": "Products fetched successfully",
  "products": [
    {
      "id": "string",
      "title": "string",
      "price": "number",
      "images": ["string"],
      "discount": "number",
      "stock": "number",
      "rating": "number",
      "category": "string"
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Get Product by ID

```
GET /product/:id
```

Get details of a specific product.

**Response:**

```json
{
  "message": "Product fetched successfully",
  "product": {
    "id": "string",
    "title": "string",
    "price": "number",
    "description": "string",
    "category": "string",
    "images": ["string"],
    "rating": "number",
    "stock": "number",
    "sku": "string",
    "brand": "string",
    "features": ["string"],
    "specifications": "object",
    "variants": ["object"],
    "discount": "number",
    "isFeatured": "boolean",
    "isNew": "boolean",
    "onSale": "boolean",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### Create Product

```
POST /product
```

Create a new product (admin only).

**Request Body:**

```json
{
  "title": "string",
  "price": "number",
  "description": "string",
  "category": "string",
  "images": ["string"],
  "rating": "number",
  "stock": "number",
  "sku": "string",
  "brand": "string",
  "features": ["string"],
  "specifications": "object",
  "variants": ["object"],
  "discount": "number",
  "isFeatured": "boolean",
  "isNew": "boolean",
  "onSale": "boolean"
}
```

**Response:**

```json
{
  "message": "Product created successfully",
  "product": "object"
}
```

### Update Product

```
PUT /product/:id
```

Update a product (admin only).

**Request Body:**

```json
{
  "title": "string",
  "price": "number",
  "description": "string",
  "category": "string",
  "images": ["string"],
  "rating": "number",
  "stock": "number",
  "discount": "number",
  "isFeatured": "boolean",
  "isNew": "boolean",
  "onSale": "boolean"
}
```

**Response:**

```json
{
  "message": "Product updated successfully",
  "product": "object"
}
```

### Delete Product

```
DELETE /product/:id
```

Delete a product (admin only).

**Response:**

```json
{
  "message": "Product deleted successfully"
}
```

### Search Products

```
GET /product/search
```

Search for products.

**Query Parameters:**

- `keyword` (optional): Search term
- `category` (optional): Category filter
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `minRating` (optional): Minimum rating
- `brand` (optional): Brand filter
- `sort` (optional): Sort field (default: "relevance")
- `order` (optional): Sort order, "asc" or "desc" (default: "desc")
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 12)

**Response:**

```json
{
  "message": "Products fetched successfully",
  "products": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Get Featured Products

```
GET /product/featured
```

Get featured products.

**Query Parameters:**

- `limit` (optional): Number of products (default: 10)

**Response:**

```json
{
  "message": "Featured products fetched successfully",
  "products": ["object"]
}
```

## Cart

### Get Cart

```
GET /cart
```

Get current user's cart.

**Response:**

```json
{
  "message": "Cart fetched successfully",
  "cart": [
    {
      "id": "string",
      "productId": "string",
      "title": "string",
      "price": "number",
      "discountedPrice": "number",
      "discount": "number",
      "image": "string",
      "quantity": "number",
      "variant": "object",
      "stock": "number",
      "total": "number",
      "addedAt": "string"
    }
  ],
  "totalItems": "number",
  "subtotal": "number"
}
```

### Add to Cart

```
POST /cart/add
```

Add product to cart.

**Request Body:**

```json
{
  "productId": "string",
  "quantity": "number",
  "variantId": "string"
}
```

**Response:**

```json
{
  "message": "Product added to cart successfully",
  "cartSize": "number"
}
```

### Update Cart Item

```
PUT /cart/update/:itemId
```

Update quantity of product in cart.

**Request Body:**

```json
{
  "quantity": "number"
}
```

**Response:**

```json
{
  "message": "Cart item updated successfully",
  "itemId": "string",
  "newQuantity": "number"
}
```

### Remove from Cart

```
DELETE /cart/remove/:itemId
```

Remove product from cart.

**Response:**

```json
{
  "message": "Item removed from cart successfully",
  "remainingItems": "number"
}
```

### Clear Cart

```
DELETE /cart/clear
```

Clear entire cart.

**Response:**

```json
{
  "message": "Cart cleared successfully"
}
```

### Apply Coupon

```
POST /cart/coupon/apply
```

Apply coupon to cart.

**Request Body:**

```json
{
  "code": "string"
}
```

**Response:**

```json
{
  "message": "Coupon applied successfully",
  "coupon": {
    "code": "string",
    "discountType": "string",
    "discountValue": "number"
  },
  "discountAmount": "number",
  "newTotal": "number"
}
```

## Wishlist

### Get Wishlist

```
GET /wishlist
```

Get current user's wishlist.

**Response:**

```json
{
  "message": "Wishlist fetched successfully",
  "wishlist": ["object"]
}
```

### Add to Wishlist

```
POST /wishlist/add
```

Add product to wishlist.

**Request Body:**

```json
{
  "productId": "string"
}
```

**Response:**

```json
{
  "message": "Product added to wishlist",
  "wishlist": ["string"]
}
```

### Remove from Wishlist

```
DELETE /wishlist/remove/:productId
```

Remove product from wishlist.

**Response:**

```json
{
  "message": "Product removed from wishlist",
  "wishlist": ["string"]
}
```

### Check Wishlist Item

```
GET /wishlist/check/:productId
```

Check if product is in wishlist.

**Response:**

```json
{
  "inWishlist": "boolean"
}
```

## Orders

### Create Order

```
POST /orders/create
```

Create a new order from cart.

**Request Body:**

```json
{
  "shippingAddress": "object",
  "billingAddress": "object",
  "paymentMethod": "string",
  "paymentDetails": "object",
  "shippingMethod": "string",
  "notes": "string"
}
```

**Response:**

```json
{
  "message": "Order created successfully",
  "order": {
    "id": "string",
    "orderNumber": "string",
    "total": "number",
    "status": "string",
    "createdAt": "string"
  }
}
```

### Get Order by ID

```
GET /orders/:id
```

Get details of a specific order.

**Response:**

```json
{
  "message": "Order fetched successfully",
  "order": "object"
}
```

### Get User Orders

```
GET /orders/my-orders
```

Get current user's orders.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

**Response:**

```json
{
  "message": "Orders fetched successfully",
  "orders": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Cancel Order

```
POST /orders/:id/cancel
```

Cancel an order (customer).

**Request Body:**

```json
{
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Order cancelled successfully",
  "order": "object"
}
```

## Payments

### Create Payment Intent

```
POST /payments/create-intent
```

Create a payment intent (Stripe).

**Request Body:**

```json
{
  "amount": "number",
  "currency": "string",
  "paymentMethodId": "string",
  "orderId": "string"
}
```

**Response:**

```json
{
  "clientSecret": "string",
  "paymentIntentId": "string",
  "status": "string"
}
```

### Process Payment

```
POST /payments/process
```

Process a generic payment.

**Request Body:**

```json
{
  "amount": "number",
  "orderId": "string",
  "paymentMethod": "string",
  "paymentDetails": "object"
}
```

**Response:**

```json
{
  "success": "boolean",
  "message": "string",
  "paymentStatus": "string",
  "transactionId": "string",
  "orderStatus": "string"
}
```

### Get Payment Methods

```
GET /payments/methods
```

Get saved payment methods.

**Response:**

```json
{
  "message": "Payment methods fetched successfully",
  "paymentMethods": ["object"]
}
```

## Categories

### Get All Categories

```
GET /categories
```

Get all product categories.

**Response:**

```json
{
  "message": "Categories fetched successfully",
  "categories": ["object"]
}
```

### Get Category Tree

```
GET /categories/tree
```

Get hierarchical category structure.

**Response:**

```json
{
  "message": "Category tree fetched successfully",
  "categories": ["object"]
}
```

### Get Category by ID

```
GET /categories/:id
```

Get details of a specific category.

**Response:**

```json
{
  "message": "Category fetched successfully",
  "category": "object"
}
```

### Get Category Products

```
GET /categories/:id/products
```

Get products in a specific category.

**Response:**

```json
{
  "message": "Category products fetched successfully",
  "category": {
    "_id": "string",
    "name": "string",
    "description": "string"
  },
  "products": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

## Reviews

### Get Product Reviews

```
GET /reviews/product/:productId
```

Get reviews for a specific product.

**Query Parameters:**

- `sort` (optional): Sort order, "recent", "helpful", "highest", "lowest" (default: "recent")
- `rating` (optional): Filter by rating
- `verified` (optional): Filter by verified purchases
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "message": "Reviews fetched successfully",
  "reviews": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  },
  "stats": {
    "average": "number",
    "total": "number",
    "distribution": {
      "5": "number",
      "4": "number",
      "3": "number",
      "2": "number",
      "1": "number"
    }
  }
}
```

### Create Review

```
POST /reviews
```

Create a new product review.

**Request Body:**

```json
{
  "productId": "string",
  "rating": "number",
  "title": "string",
  "comment": "string",
  "images": ["string"]
}
```

**Response:**

```json
{
  "message": "Review submitted successfully and pending approval",
  "review": "object"
}
```

### Update Review

```
PUT /reviews/:id
```

Update a review.

**Request Body:**

```json
{
  "rating": "number",
  "title": "string",
  "comment": "string",
  "images": ["string"]
}
```

**Response:**

```json
{
  "message": "Review updated successfully and pending approval",
  "review": "object"
}
```

### Delete Review

```
DELETE /reviews/:id
```

Delete a review.

**Response:**

```json
{
  "message": "Review deleted successfully"
}
```

### Like Review

```
POST /reviews/:id/like
```

Mark a review as helpful.

**Response:**

```json
{
  "message": "Review marked as helpful",
  "helpfulCount": "number"
}
```

## Search

### Search Products

```
GET /search
```

Search for products.

**Query Parameters:**

- `keyword` (optional): Search term
- `category` (optional): Category filter
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `sort` (optional): Sort field (default: "relevance")
- `order` (optional): Sort order, "asc" or "desc" (default: "desc")
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 12)

**Response:**

```json
{
  "message": "Search results fetched successfully",
  "products": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  },
  "filters": {
    "priceRange": {
      "min": "number",
      "max": "number"
    },
    "categories": ["object"]
  }
}
```

### Search Suggestions

```
GET /search/suggestions
```

Get search suggestions.

**Query Parameters:**

- `query`: Search term
- `limit` (optional): Number of suggestions (default: 5)

**Response:**

```json
{
  "suggestions": [
    {
      "type": "string",
      "text": "string",
      "id": "string"
    }
  ]
}
```

### Popular Searches

```
GET /search/popular
```

Get popular search queries.

**Query Parameters:**

- `days` (optional): Time period in days (default: 7)
- `limit` (optional): Number of results (default: 10)

**Response:**

```json
{
  "popularSearches": [
    {
      "query": "string",
      "count": "number",
      "averageResults": "number"
    }
  ]
}
```

### Record Search Query

```
POST /search/record
```

Record a search query for analytics.

**Request Body:**

```json
{
  "query": "string",
  "resultCount": "number"
}
```

**Response:**

```json
{
  "message": "Search query recorded successfully"
}
```

### Search by Category

```
GET /search/category/:category
```

Search products in a specific category.

**Query Parameters:**

- `sort` (optional): Sort field (default: "newest")
- `order` (optional): Sort order, "asc" or "desc" (default: "desc")
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 12)

**Response:**

```json
{
  "message": "Products in category fetched successfully",
  "category": {
    "name": "string",
    "description": "string",
    "subcategories": ["object"]
  },
  "products": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Advanced Search with Filters

```
POST /search/filter
```

Advanced search with multiple filters.

**Request Body:**

```json
{
  "keyword": "string",
  "categories": ["string"],
  "priceRange": {
    "min": "number",
    "max": "number"
  },
  "rating": "number",
  "brands": ["string"],
  "attributes": "object",
  "stock": "boolean",
  "discount": "boolean",
  "sort": "string",
  "order": "string",
  "page": "number",
  "limit": "number"
}
```

**Response:**

```json
{
  "message": "Filtered search results fetched successfully",
  "products": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

## Coupons

### Get Active Coupons

```
GET /coupons/active
```

Get active coupons available to customers.

**Response:**

```json
{
  "message": "Active coupons fetched successfully",
  "coupons": [
    {
      "code": "string",
      "description": "string",
      "discountType": "string",
      "discountValue": "number",
      "minimumPurchase": "number",
      "maximumDiscount": "number",
      "expiryDate": "string"
    }
  ]
}
```

### Validate Coupon

```
POST /coupons/validate
```

Validate a coupon code.

**Request Body:**

```json
{
  "code": "string",
  "userId": "string",
  "cartTotal": "number"
}
```

**Response:**

```json
{
  "valid": "boolean",
  "message": "string",
  "coupon": {
    "code": "string",
    "discountType": "string",
    "discountValue": "number",
    "discountAmount": "number",
    "newTotal": "number"
  }
}
```

### Apply Coupon

```
POST /coupons/apply
```

Apply a coupon to the user's cart.

**Request Body:**

```json
{
  "code": "string",
  "cartTotal": "number"
}
```

**Response:**

```json
{
  "message": "Coupon applied successfully",
  "coupon": {
    "code": "string",
    "discountType": "string",
    "discountValue": "number",
    "discountAmount": "number",
    "newTotal": "number"
  }
}
```

## User Management

### Get All Users (Admin)

```
GET /user
```

Get all users (admin only).

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role
- `search` (optional): Search by username or email
- `sortBy` (optional): Field to sort by
- `sortOrder` (optional): Sort direction ("asc" or "desc")

**Response:**

```json
{
  "users": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Update User Role (Admin)

```
PUT /user/:id/role
```

Update a user's role (admin only).

**Request Body:**

```json
{
  "role": "string"
}
```

**Response:**

```json
{
  "message": "User role updated successfully",
  "user": "object"
}
```

### Get User by ID

```
GET /user/:id
```

Get details of a specific user.

**Response:**

```json
{
  "message": "User fetched successfully",
  "user": "object"
}
```

### Update User

```
PUT /user/:id
```

Update user information.

**Request Body:**

```json
{
  "username": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "avatar": "string",
  "preferences": "object"
}
```

**Response:**

```json
{
  "message": "User updated successfully",
  "user": "object"
}
```

### Delete User

```
DELETE /user/:id
```

Delete a user account.

**Response:**

```json
{
  "message": "User deleted successfully"
}
```

### Get User Orders

```
GET /user/:id/orders
```

Get orders for a specific user.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by order status

**Response:**

```json
{
  "orders": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Add Address

```
POST /user/addresses
```

Add a new address.

**Request Body:**

```json
{
  "title": "string",
  "firstName": "string",
  "lastName": "string",
  "addressLine1": "string",
  "addressLine2": "string",
  "city": "string",
  "state": "string",
  "postalCode": "string",
  "country": "string",
  "phone": "string",
  "isDefault": "boolean"
}
```

**Response:**

```json
{
  "message": "Address added successfully",
  "address": "object"
}
```

### Get Addresses

```
GET /user/addresses
```

Get user's saved addresses.

**Response:**

```json
{
  "message": "Addresses fetched successfully",
  "addresses": ["object"]
}
```

### Update Address

```
PUT /user/addresses/:id
```

Update an address.

**Request Body:**

```json
{
  "title": "string",
  "firstName": "string",
  "lastName": "string",
  "addressLine1": "string",
  "addressLine2": "string",
  "city": "string",
  "state": "string",
  "postalCode": "string",
  "country": "string",
  "phone": "string",
  "isDefault": "boolean"
}
```

**Response:**

```json
{
  "message": "Address updated successfully",
  "address": "object"
}
```

### Delete Address

```
DELETE /user/addresses/:id
```

Delete an address.

**Response:**

````json
{
  "message": "Address deleted successfully"
}
```user/:id
````

Update user information.

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "phone": "string",
  "address": "object"
}
```

**Response:**

```json
{
  "message": "User updated successfully",
  "user": "object"
}
```

### Add Address

```
POST /user/addresses
```

Add a new address.

**Request Body:**

```json
{
  "title": "string",
  "firstName": "string",
  "lastName": "string",
  "addressLine1": "string",
  "addressLine2": "string",
  "city": "string",
  "state": "string",
  "postalCode": "string",
  "country": "string",
  "phone": "string",
  "isDefault": "boolean"
}
```

**Response:**

```json
{
  "message": "Address added successfully",
  "address": "object"
}
```

## Shipping

### Get Shipping Methods

```
GET /shipping/methods
```

Get available shipping methods.

**Response:**

```json
{
  "message": "Shipping methods fetched successfully",
  "methods": ["object"]
}
```

### Calculate Shipping

```
POST /shipping/calculate
```

Calculate shipping cost.

**Request Body:**

```json
{
  "items": ["object"],
  "destination": "object",
  "couponCode": "string"
}
```

**Response:**

```json
{
  "message": "Shipping cost calculated successfully",
  "shippingMethods": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "cost": "number",
      "estimatedDeliveryDays": "number",
      "freeShippingEligible": "boolean"
    }
  ],
  "freeShippingThreshold": "number",
  "subtotalToFreeShipping": "number"
}
```

## Content Management

### Get Banners

```
GET /content/banners
```

Get promotional banners.

**Query Parameters:**

- `location` (optional): Filter by location
- `active` (optional): Filter by active status

**Response:**

```json
{
  "message": "Banners fetched successfully",
  "banners": ["object"]
}
```

### Get Pages

```
GET /content/pages
```

Get content pages.

**Query Parameters:**

- `published` (optional): Filter by published status

**Response:**

```json
{
  "message": "Pages fetched successfully",
  "pages": ["object"]
}
```

### Get Blogs

```
GET /content/blogs
```

Get blog posts.

**Query Parameters:**

- `category` (optional): Filter by category
- `tag` (optional): Filter by tag
- `published` (optional): Filter by published status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "message": "Blogs fetched successfully",
  "blogs": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

## Analytics (Admin)

### Get Sales Analytics

```
GET /analytics/sales
```

Get sales analytics (admin only).

**Query Parameters:**

- `startDate` (optional): Start date
- `endDate` (optional): End date
- `period` (optional): Time period, "week", "month", "year" (default: "month")
- `interval` (optional): Data granularity, "hour", "day", "week", "month" (default: "day")

**Response:**

```json
{
  "message": "Sales analytics fetched successfully",
  "period": {
    "start": "string",
    "end": "string",
    "interval": "string"
  },
  "overview": "object",
  "salesByDate": ["object"],
  "salesByPaymentMethod": ["object"],
  "salesByStatus": ["object"],
  "aovTrend": ["object"]
}
```

### Get Product Analytics

```
GET /analytics/products
```

Get product performance analytics (admin only).

**Query Parameters:**

- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**

```json
{
  "message": "Product analytics fetched successfully",
  "period": {
    "start": "string",
    "end": "string"
  },
  "overview": "object",
  "topProducts": ["object"],
  "categoryPerformance": ["object"],
  "ratingDistribution": ["object"],
  "newProducts": ["object"],
  "lowStockProducts": ["object"]
}
```

### Get Customer Analytics

```
GET /analytics/customers
```

Get customer analytics (admin only).

**Query Parameters:**

- `startDate` (optional): Start date
- `endDate` (optional): End date
- `period` (optional): Time period, "week", "month", "year" (default: "month")

**Response:**

```json
{
  "message": "Customer analytics fetched successfully",
  "period": {
    "start": "string",
    "end": "string"
  },
  "overview": "object",
  "customerAcquisition": ["object"],
  "topCustomers": ["object"],
  "retention": "object",
  "lifetime": "object"
}
```

### Get Inventory Analytics

```
GET /analytics/inventory
```

Get inventory analytics (admin only).

**Response:**

```json
{
  "message": "Inventory analytics fetched successfully",
  "overview": "object",
  "topInventoryValue": ["object"],
  "topStockedProducts": ["object"],
  "lowStockProducts": ["object"],
  "outOfStockProducts": ["object"],
  "categoryInventory": ["object"],
  "turnoverLeaders": ["object"]
}
```

### Get Marketing Analytics

```
GET /analytics/marketing
```

Get marketing analytics (admin only).

**Query Parameters:**

- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**

```json
{
  "message": "Marketing analytics fetched successfully",
  "period": {
    "start": "string",
    "end": "string"
  },
  "couponPerformance": ["object"],
  "searchAnalytics": "object",
  "conversionRates": "object",
  "reviews": "object",
  "topReviewedProducts": ["object"],
  "acquisitionSources": ["object"]
}
```

### Get Dashboard Summary

```
GET /analytics/dashboard-summary
```

Get dashboard summary (admin only).

**Response:**

```json
{
  "message": "Dashboard summary fetched successfully",
  "today": "object",
  "month": "object",
  "charts": {
    "salesTrend": ["object"]
  },
  "recentOrders": ["object"],
  "topProducts": ["object"],
  "inventoryAlerts": ["object"],
  "customers": "object",
  "orderStatus": "object"
}
```

### Get Search Analytics

```
GET /analytics/search
```

Get search analytics (admin only).

**Query Parameters:**

- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**

```json
{
  "message": "Search analytics fetched successfully",
  "period": {
    "start": "string",
    "end": "string"
  },
  "overview": "object",
  "popularSearches": ["object"],
  "zeroResultSearches": ["object"],
  "searchTrend": ["object"]
}
```

### Get Category Analytics

```
GET /analytics/categories
```

Get category analytics (admin only).

**Query Parameters:**

- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**

```json
{
  "message": "Category analytics fetched successfully",
  "period": {
    "start": "string",
    "end": "string"
  },
  "overview": "object",
  "categoryAnalytics": ["object"],
  "distribution": ["object"]
}
```

### Get Revenue Breakdown

```
GET /analytics/revenue-breakdown
```

Get revenue breakdown (admin only).

**Query Parameters:**

- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**

```json
{
  "message": "Revenue breakdown fetched successfully",
  "period": {
    "start": "string",
    "end": "string"
  },
  "summary": "object",
  "trends": {
    "daily": ["object"],
    "aov": ["object"]
  },
  "paymentMethods": ["object"],
  "discounts": "object"
}
```

### Export Analytics Report

```
GET /analytics/export
```

Export analytics report (admin only).

**Query Parameters:**

- `type`: Report type, "sales", "products", "customers", "inventory"
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**

```json
{
  "message": "Report generated successfully",
  "report": "object"
}
```

## Dashboard (Admin)

### Get Dashboard Summary

```
GET /admin/dashboard/summary
```

Get admin dashboard summary.

**Response:**

```json
{
  "message": "Dashboard summary fetched successfully",
  "summary": "object"
}
```

### Get Recent Orders

```
GET /admin/dashboard/recent-orders
```

Get recent orders for dashboard.

**Query Parameters:**

- `limit` (optional): Number of orders (default: 10)

**Response:**

```json
{
  "message": "Recent orders fetched successfully",
  "orders": ["object"]
}
```

## Inventory Management

### Get Inventory Overview

```
GET /inventory/overview
```

Get inventory overview (admin only).

**Response:**

```json
{
  "message": "Inventory overview fetched successfully",
  "overview": "object",
  "recentChanges": ["object"]
}
```

### Get Product Inventory

```
GET /inventory/product/:productId
```

Get inventory details for a specific product (admin only).

**Response:**

```json
{
  "message": "Product inventory fetched successfully",
  "inventory": "object"
}
```

### Update Product Stock

```
PUT /inventory/product/:productId
```

Update stock for a product (admin only).

**Request Body:**

```json
{
  "stock": "number",
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Product stock updated successfully",
  "product": "object"
}
```

### Bulk Update Stock

```
POST /inventory/bulk-update
```

Bulk update stock for multiple products (admin only).

**Request Body:**

```json
{
  "updates": [
    {
      "productId": "string",
      "variantId": "string",
      "stock": "number"
    }
  ],
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Bulk stock update completed",
  "results": ["object"],
  "successCount": "number",
  "failureCount": "number"
}
```

### Get Low Stock Products

```
GET /inventory/low-stock
```

Get products with low stock (admin only).

**Query Parameters:**

- `threshold` (optional): Low stock threshold (default: 10)
- `includeOutOfStock` (optional): Include out of stock products
- `category` (optional): Filter by category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "message": "Low stock items fetched successfully",
  "threshold": "number",
  "products": ["object"],
  "variants": ["object"],
  "pagination": "object"
}
```

### Get Inventory History

```
GET /inventory/history
```

Get inventory change history (admin only).

**Query Parameters:**

- `productId` (optional): Filter by product
- `variantId` (optional): Filter by variant
- `type` (optional): Filter by change type
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "message": "Inventory history fetched successfully",
  "history": ["object"],
  "pagination": "object"
}
```

### Create Inventory Adjustment

```
POST /inventory/adjustment
```

Create inventory adjustment (admin only).

**Request Body:**

```json
{
  "productId": "string",
  "variantId": "string",
  "adjustmentType": "string",
  "quantity": "number",
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Inventory adjustment completed successfully",
  "adjustment": "object"
}
```

### Get Inventory Statistics

```
GET /inventory/stats
```

Get inventory statistics (admin only).

**Response:**

```json
{
  "message": "Inventory statistics fetched successfully",
  "statistics": "object"
}
```

### Get Variant Inventory

```
GET /inventory/variant/:variantId
```

Get inventory details for a specific variant (admin only).

**Response:**

```json
{
  "message": "Variant inventory fetched successfully",
  "inventory": "object"
}
```

### Update Variant Stock

```
PUT /inventory/variant/:variantId
```

Update stock for a variant (admin only).

**Request Body:**

```json
{
  "stock": "number",
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Variant stock updated successfully",
  "variant": "object"
}
```

### Bulk Update Stock

```
POST /inventory/bulk-update
```

Bulk update stock for multiple products (admin only).

**Request Body:**

```json
{
  "updates": [
    {
      "productId": "string",
      "variantId": "string",
      "stock": "number"
    }
  ],
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Bulk stock update completed",
  "results": ["object"],
  "successCount": "number",
  "failureCount": "number"
}
```

### Get Low Stock Products

```
GET /inventory/low-stock
```

Get products with low stock (admin only).

**Query Parameters:**

- `threshold` (optional): Low stock threshold (default: 10)
- `includeOutOfStock` (optional): Include out of stock products
- `category` (optional): Filter by category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "message": "Low stock items fetched successfully",
  "threshold": "number",
  "products": ["object"],
  "variants": ["object"],
  "pagination": "object"
}
```

### Get Inventory History

```
GET /inventory/history
```

Get inventory change history (admin only).

**Query Parameters:**

- `productId` (optional): Filter by product
- `variantId` (optional): Filter by variant
- `type` (optional): Filter by change type
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "message": "Inventory history fetched successfully",
  "history": ["object"],
  "pagination": "object"
}
```

### Create Inventory Adjustment

```
POST /inventory/adjustment
```

Create inventory adjustment (admin only).

**Request Body:**

```json
{
  "productId": "string",
  "variantId": "string",
  "adjustmentType": "string",
  "quantity": "number",
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Inventory adjustment completed successfully",
  "adjustment": "object"
}
```

### Get Inventory Statistics

```
GET /inventory/stats
```

Get inventory statistics (admin only).

**Response:**

```json
{
  "message": "Inventory statistics fetched successfully",
  "statistics": "object"
}
```

### Get Variant Inventory

```
GET /inventory/variant/:variantId
```

Get inventory details for a specific variant (admin only).

**Response:**

```json
{
  "message": "Variant inventory fetched successfully",
  "inventory": "object"
}
```

### Update Variant Stock

```
PUT /inventory/variant/:variantId
```

Update stock for a variant (admin only).

**Request Body:**

```json
{
  "stock": "number",
  "reason": "string"
}
```

**Response:**

````json
{
  "message": "Variant stock updated successfully",
  "variant": "object"
}
```message": "Inventory overview fetched successfully",
  "overview": "object",
  "recentChanges": ["object"]
}
````

### Get Product Inventory

```
GET /inventory/product/:productId
```

Get inventory details for a specific product (admin only).

**Response:**

```json
{
  "message": "Product inventory fetched successfully",
  "inventory": "object"
}
```

### Update Product Stock

```
PUT /inventory/product/:productId
```

Update stock for a product (admin only).

**Request Body:**

```json
{
  "stock": "number",
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Product stock updated successfully",
  "product": "object"
}
```

## Vendor Management

### Get All Vendors

```
GET /api/vendors
```

Get all vendors.

**Response:**

```json
{
  "message": "Vendors fetched successfully",
  "vendors": ["object"]
}
```

### Get Vendor by ID

```
GET /api/vendors/:id
```

Get a specific vendor.

**Response:**

```json
{
  "message": "Vendor fetched successfully",
  "vendor": "object"
}
```

### Register as Vendor

```
POST /api/vendors/register
```

Register current user as a vendor.

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "categories": ["string"],
  "address": "object",
  "businessInfo": "object",
  "phone": "string",
  "email": "string"
}
```

**Response:**

```json
{
  "message": "Vendor registration submitted successfully",
  "vendor": "object"
}
```

### Get Vendor Products

```
GET /api/vendors/:id/products
```

Get products by a specific vendor.

**Response:**

```json
{
  "message": "Vendor products fetched successfully",
  "products": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Get Vendor Dashboard

```
GET /api/vendors/dashboard
```

Get vendor dashboard data.

**Response:**

```json
{
  "message": "Vendor dashboard fetched successfully",
  "stats": {
    "sales": "object",
    "products": "object",
    "orders": "object"
  },
  "recentOrders": ["object"],
  "topProducts": ["object"]
}
```

### Update Vendor Profile

```
PUT /api/vendors/profile
```

Update vendor profile.

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "logo": "string",
  "banner": "string",
  "categories": ["string"],
  "address": "object",
  "businessInfo": "object",
  "phone": "string",
  "email": "string"
}
```

**Response:**

```json
{
  "message": "Vendor profile updated successfully",
  "vendor": "object"
}
```

### Add Vendor Product

```
POST /api/vendors/products
```

Add a product as a vendor.

**Request Body:**

```json
{
  "title": "string",
  "price": "number",
  "description": "string",
  "category": "string",
  "images": ["string"],
  "stock": "number",
  "sku": "string",
  "brand": "string",
  "features": ["string"],
  "specifications": "object",
  "variants": ["object"],
  "discount": "number"
}
```

**Response:**

```json
{
  "message": "Product added successfully",
  "product": "object"
}
```

### Update Vendor Product

```
PUT /api/vendors/products/:id
```

Update a vendor product.

**Request Body:**

```json
{
  "title": "string",
  "price": "number",
  "description": "string",
  "category": "string",
  "images": ["string"],
  "stock": "number",
  "discount": "number"
}
```

**Response:**

```json
{
  "message": "Product updated successfully",
  "product": "object"
}
```

### Delete Vendor Product

```
DELETE /api/vendors/products/:id
```

Delete a vendor product.

**Response:**

```json
{
  "message": "Product deleted successfully"
}
```

### Get Vendor Orders

```
GET /api/vendors/orders
```

Get orders for vendor products.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

**Response:**

```json
{
  "message": "Vendor orders fetched successfully",
  "orders": ["object"],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

### Update Order Status (Vendor)

```
PUT /api/vendors/orders/:id/status
```

Update order status for vendor's product.

**Request Body:**

```json
{
  "status": "string",
  "note": "string",
  "trackingNumber": "string",
  "carrier": "string"
}
```

**Response:**

```json
{
  "message": "Order status updated successfully",
  "order": "object"
}
```

### Get Vendor Payments

```
GET /api/vendors/payments
```

Get vendor payment history.

**Response:**

```json
{
  "message": "Vendor payments fetched successfully",
  "payments": ["object"],
  "pagination": "object"
}
```

### Get Vendor Reviews

```
GET /api/vendors/reviews
```

Get reviews for vendor products.

**Response:**

```json
{
  "message": "Vendor reviews fetched successfully",
  "reviews": ["object"],
  "pagination": "object"
}
```

### Get Vendor Statistics

```
GET /api/vendors/statistics
```

Get vendor performance statistics.

**Response:**

```json
{
  "message": "Vendor statistics fetched successfully",
  "statistics": {
    "sales": "object",
    "products": "object",
    "orders": "object",
    "customers": "object"
  }
}
```
