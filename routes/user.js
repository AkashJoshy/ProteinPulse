const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userAuthController = require('../middlewares/userAuthMiddleware')

// USER REQUESTS
// GET REQUESTS
router.get("/", userController.homePage);
router.get("/login", userAuthController.authHandler, userController.Login);
router.get("/auth/google", userController.googleLogin);
router.get("/google/callback", userController.googleCallback);
router.get("/signup", userController.signup);
router.get("/verify-email", userController.emailVerify);
router.get("/resend-signup-otp", userController.resendOtp);
router.get("/forgot-password", userController.forgotPassword);
router.get("/reset-password", userController.resetPassword);
router.get("/brands", userAuthController.authHandler, userController.getBrands)
router.get("/user-categories/:categoryName", userAuthController.authHandler, userController.categories);
router.get("/order-checkout", userAuthController.authHandler, userController.orderCheckout)
router.get("/dashboard/orders/download-invoice", userController.downloadInvoice)
router.get("/logout", userController.logout);

router.get('/testing', userController.testing)

// POST REQUESTS
router.post("/signup", userController.doSignup);
router.post("/login", userController.doLogin);
router.post("/forgot-password", userController.checkEmailForPassword);
router.post("/update-password", userController.recoveredPassword);
router.post("/order-pre-checkout", userAuthController.authHandler, userController.orderPreCheckout)
router.post("/place-order", userController.placeOrder)

// PUT REQUESTS
router.put("/verify-otp", userController.otpVerify);
router.put("/dashboard/orders/cancel-order", userController.cancelOrder);
router.put("/dashboard/orders/cancel-product", userController.cancelProduct);
router.put("/verify-payment", userController.verifyPaymentRazorpay)
router.put("/dashboard/orders/retry-payment", userController.retryPayment);


// DELETE REQUESTS


module.exports = router;
