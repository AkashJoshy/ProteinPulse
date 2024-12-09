const express = require('express')
const router = express.Router()
const userProductsController = require('../controllers/userProductsController')
const userAuthController = require('../middlewares/userAuthMiddleware')


// GET Requests
router.get("/", userAuthController.authHandler, userProductsController.products)
router.get("/filters", userProductsController.productFilters)
router.get("/sort", userProductsController.sortProducts)
router.get("/search", userProductsController.searchProducts)
router.get("/search-results", userAuthController.authHandler, userProductsController.searchResults)
router.get("/:productID", userAuthController.authHandler, userProductsController.product)

// POST Requests
router.post("/add-review", userAuthController.authHandler, userProductsController.productReview);

// PATCH
router.patch("/wishlist/:productID", userProductsController.updateWishlist)


module.exports = router