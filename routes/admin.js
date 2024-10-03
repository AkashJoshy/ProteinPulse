const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");


// ADMIN REQUESTS
// GET REQUESTS
router.get("/", adminController.login);
router.get("/dashboard", adminController.dashboard);
router.get("/customers", adminController.getCustomers);
// router.get('/edit-customer/:userID', adminController.viewCustomer)
router.get("/category", adminController.getCategories);
router.get("/category/query", adminController.categoryQuery);
router.get("/add-category", adminController.addCategory);
router.get("/edit-category/:categoryID", adminController.editCategory);
router.get("/products", adminController.getProducts);
router.get("/add-product", adminController.addProduct);
router.get("/edit-product/:productID", adminController.editProduct);
router.get("/products/sort", adminController.sortProducts);
router.get("/orders", adminController.getOrders);
router.get("/orders/view-details/:orderID", adminController.viewOrder);
router.get("/orders/:filter", adminController.orderSorting);
router.get("/coupon-management", adminController.couponPage);
router.get("/sale-reports", adminController.salesReports);
router.get("/get-sales-reports", adminController.getSalesReports);
router.get("/download-sales-reports", adminController.downloadSalesReport);
router.get("/carousel-management", adminController.getCarousels);
router.get("/add-carousel", adminController.viewAddCarousel);
router.get("/offer-management", adminController.offerPage);
router.get("/settings", adminController.settings);
router.get("/logout/:adminID", adminController.logout);


// POST REQUESTS
router.post("/", adminController.doLogin);
router.post("/add-category", adminController.saveAddCategory);
router.post("/add-product", adminController.saveProduct);
router.post("/product/update-stock", adminController.updateProductStock);
router.post("/add-coupon", adminController.addCoupon);
router.post("/add-offers", adminController.addOffers);
router.post("/edit-category", adminController.saveEditCategory);


// PUT REQUESTS
router.put("/edit-product", adminController.updateProduct);
router.put("/delete-customer", adminController.softDeleteCustomer);
router.put("/restore-customer", adminController.restoreCustomer);
router.put("/orders/update-status", adminController.updateOrderStatus);


// DELETE REQUESTS
router.delete("/delete-product", adminController.deleteProduct);
router.delete("/delete-coupon/:couponID", adminController.deleteCoupon);
router.delete("/delete-offer/:offerID", adminController.deleteOffer);
router.delete("/delete-category/:categoryID", adminController.deleteCategory);


module.exports = router;
