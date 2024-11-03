const express = require('express')
const router = express.Router()
const userProductsController = require('../controllers/userProductsController')


// GET Requests
router.get("/", userProductsController.products)
router.get("/filters", userProductsController.productFilters)
router.get("/sort", userProductsController.sortProducts)
router.get("/search", userProductsController.searchProducts)
router.get("/search-results", userProductsController.searchResults)
router.get("/:productID", userProductsController.product)

// POST Requests
router.post("/review", userProductsController.productReview);


// PATCH
router.patch("/wishlist/:productID", userProductsController.updateWishlist)


module.exports = router