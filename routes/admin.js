const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminAuthHandler = require('../middlewares/adminAuthMiddleware')

// ADMIN REQUESTS
// GET REQUESTS
router.get("/", adminController.login)
router.get("/dashboard", adminAuthHandler.authHandler, adminController.dashboard);
router.get("/customers", adminAuthHandler.authHandler, adminController.getCustomers);
router.get("/category", adminAuthHandler.authHandler, adminController.getCategories);
router.get("/category/query", adminController.categoryQuery);
router.get("/add-category", adminAuthHandler.authHandler, adminController.addCategory);
router.get("/edit-category/:categoryID", adminAuthHandler.authHandler, adminController.editCategory);
router.get("/products", adminAuthHandler.authHandler, adminController.getProducts);
router.get("/add-product", adminAuthHandler.authHandler, adminController.addProduct);
router.get("/edit-product/:productID", adminAuthHandler.authHandler, adminController.editProduct);
router.get("/products/sort", adminController.sortProducts);
router.get("/orders", adminAuthHandler.authHandler, adminController.getOrders);
router.get("/orders/view-details/:orderID", adminAuthHandler.authHandler, adminController.viewOrder);
router.get("/orders/:filter", adminController.orderSorting);
router.get("/coupon-management", adminAuthHandler.authHandler, adminController.couponPage);
router.get("/sale-reports", adminAuthHandler.authHandler, adminController.salesReports);
router.get("/sales-chart", adminController.salesChart);
router.get("/get-sales-reports", adminController.getSalesReports);
router.get("/download-sales-reports", adminController.downloadSalesReport);
router.get("/carousel-management", adminAuthHandler.authHandler, adminController.getCarousels);
router.get("/add-carousel", adminAuthHandler.authHandler, adminController.viewAddCarousel);
router.get("/offer-management", adminAuthHandler.authHandler, adminController.offerPage);
router.get("/settings", adminAuthHandler.authHandler, adminController.settings);
router.get("/logout/:adminID", adminAuthHandler.authHandler, adminController.logout);


// POST REQUESTS
router.post("/", adminController.doLogin);
router.post("/add-category", adminAuthHandler.authHandler, adminController.saveAddCategory);
router.post("/add-product", adminAuthHandler.authHandler, adminController.saveProduct);
router.put("/product/update-stock", adminController.updateProductStock);
router.post("/add-coupon", adminAuthHandler.authHandler, adminController.addCoupon);
router.post("/add-offers", adminController.addOffers);
router.post("/edit-category", adminAuthHandler.authHandler, adminController.saveEditCategory);


// PUT REQUESTS
router.put("/edit-product", adminAuthHandler.authHandler, adminController.updateProduct);
router.put("/product/delete-image/:prodID/:imageUrl", adminController.deleteProductImage);
router.put("/delete-customer", adminController.softDeleteCustomer);
router.put("/restore-customer", adminController.restoreCustomer);
router.put("/orders/update-status", adminController.updateOrderStatus);
router.put("/orders/update-product-status", adminController.updateOrderProductStatus);


// DELETE REQUESTS
router.delete("/delete-product", adminController.deleteProduct);
router.delete("/delete-coupon/:couponID", adminController.deleteCoupon);
router.delete("/delete-offer/:offerID", adminController.deleteOffer);
router.delete("/delete-category/:categoryID", adminController.deleteCategory);


module.exports = router;
