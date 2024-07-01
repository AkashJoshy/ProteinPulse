const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
// const authHandler = require('../middlewares/authMiddleware')

// USER REQUESTS
// GET REQUESTS
router.get("/", userController.homePage);
router.get("/login", userController.Login);
router.get("/auth/google", userController.googleLogin);
router.get("/google/callback", userController.googleCallback);
router.get("/signup", userController.signup);
router.get("/verify-email", userController.emailVerify);
router.get("/forgot-password", userController.forgotPassword);
router.get("/reset-password", userController.resetPassword);
router.get("/products", userController.products);
router.get("/dashboard", userController.dashboard);
router.get("/dashboard/account-details", userController.accountDetails);
router.get("/dashboard/address", userController.accountAddress);
router.get("/dashboard/address/saved-address", userController.viewAddresses);
router.get("/dashboard/address/add-address", userController.addAddress);
router.get("/address/edit-address/:addressType/:addressID", userController.getAddressEdit)
router.get("/dashboard/wishlist", userController.wishlist);
router.get("/dashboard/orders", userController.myOrders);
router.get("/dashboard/orders/edit-orders/:orderID", userController.viewOrderDetails);
router.get("/user-categories/:categoryName", userController.categories);
router.get("/product/:productID", userController.product);
router.get("/products/filters", userController.productFilters);
router.get("/products/sort", userController.sortProducts);
router.get("/products/search-results", userController.searchResults);
router.get("/products/search", userController.searchProducts);
router.get("/dashboard/my-cart", userController.myCart);
router.get("/dashboard/wallet", userController.wallet);
router.get("/logout", userController.logout);

router.get("/sample", userController.sample);

// POST REQUESTS
router.post("/signup", userController.doSignup);
router.post("/login", userController.doLogin);
router.post("/verify-otp", userController.otpVerify);
router.post("/forgot-password", userController.checkEmailForPassword);
router.post("/dashboard/address/add-address", userController.saveAddress);
router.post("/update-password", userController.recoveredPassword);
router.post("/product/review", userController.productReview);
router.post("/order-pre-checkout", userController.orderPreCheckout)
router.post("/order-checkout", userController.orderCheckout)
router.post("/address/update-address", userController.updateAddress)

// PUT REQUESTS
router.put("/product/add-to-cart", userController.addToCart);
router.put("/dashboard/account-details/update-user-details", userController.updateUserDetails);
router.put("/dashboard/account-details/change-profile-picture", userController.updateUserProfilePic);
router.put("/dashboard/account-details/change-password", userController.changePassword);
router.put("/address/delete-address", userController.deleteAddress)
router.put("/dashboard/orders/cancel-order", userController.cancelOrder);
router.put("/delete-cart-product", userController.deleteCartProduct);
router.put("/update-cart-product-quantity", userController.updateCartProductQuantity)

// DELETE REQUESTS

module.exports = router;
