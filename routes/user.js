const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userAuthController = require('../middlewares/userAuthMiddleware')

// USER REQUESTS
// GET REQUESTS
router.get("/", userController.homePage);
router.get("/login", userAuthController.authHandler, userController.Login);
// router.get("/login", userController.Login);
router.get("/auth/google", userController.googleLogin);
router.get("/google/callback", userController.googleCallback);
router.get("/signup", userController.signup);
router.get("/verify-email", userController.emailVerify);
router.get("/resend-signup-otp", userController.resendOtp);
router.get("/forgot-password", userController.forgotPassword);
router.get("/reset-password", userController.resetPassword);
router.get("/user-categories/:categoryName", userAuthController.authHandler, userController.categories);
router.get("/order-checkout", userAuthController.authHandler, userController.orderCheckout)
router.get("/logout", userController.logout);


// POST REQUESTS
router.post("/signup", userController.doSignup);
router.post("/login", userController.doLogin);
router.post("/forgot-password", userController.checkEmailForPassword);
router.post("/update-password", userController.recoveredPassword);
router.post("/order-pre-checkout", userController.orderPreCheckout)
router.post("/place-order", userController.placeOrder)
router.post("/verify-payment", userController.verifyPaymentRazorpay)

// PUT REQUESTS
router.put("/verify-otp", userController.otpVerify);
router.put("/dashboard/orders/cancel-order", userController.cancelOrder);
router.put("/dashboard/orders/cancel-product", userController.cancelProduct);


// DELETE REQUESTS


module.exports = router;
