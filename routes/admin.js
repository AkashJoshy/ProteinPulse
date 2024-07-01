const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// ADMIN REQUESTS
// GET REQUESTS
router.get("/", adminController.login);
router.get("/home-page", adminController.homePage);
router.get("/customers", adminController.getCustomers);
// router.get('/edit-customer/:userID', adminController.viewCustomer)
router.get("/category", adminController.getCategories);
router.get("/add-category", adminController.addCategory);
router.get("/edit-category/:categoryID", adminController.editCategory);
router.get("/products", adminController.getProducts);
router.get("/add-product", adminController.addProduct);
router.get("/edit-product/:productID", adminController.editProduct);
router.get("/products/sort", adminController.sortProducts);
router.get("/orders", adminController.getOrders);
router.get("/orders/:filter", adminController.orderSorting);
router.get("/settings", adminController.settings);
router.get("/logout/:adminID", adminController.logout);

// POST REQUESTS
router.post("/", adminController.doLogin);
router.post("/add-category", adminController.saveAddCategory);
router.post("/add-product", adminController.saveProduct);
router.put("/edit-product", adminController.updateProduct);
router.post("/product/update-stock", adminController.updateProductStock);

// PUT REQUESTS
router.put("/edit-category", adminController.saveEditCategory);
router.put("/delete-customer", adminController.softDeleteCustomer);
router.put("/restore-customer", adminController.restoreCustomer);
router.put("/delete-category", adminController.softDeleteCategory);
router.put("/restore-category", adminController.restoreCategory);
router.put("/orders/update-status", adminController.updateOrderStatus);

// DELETE REQUESTS
router.delete("/delete-product", adminController.deleteProduct);

module.exports = router;
