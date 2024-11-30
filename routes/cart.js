const express = require('express')
const router = express.Router()
const cartController = require('../controllers/cartController')
const userAuthController = require('../middlewares/userAuthMiddleware')

// GET Requests
router.get("/", userAuthController.authHandler, cartController.myCart);

// PUT Requests
router.put("/add-product", cartController.addToCart);
router.put("/delete-product", cartController.deleteCartProduct);
router.put("/update-product-quantity", cartController.updateCartProductQuantity)

// PATCH Requests
router.patch("/apply-coupon/:couponCode", cartController.applyCoupon);
router.patch("/remove-coupon/:couponCode", cartController.removeCoupon);


module.exports = router