const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')

// Admin requests
// get requests
router.get('/', adminController.login)
router.get('/home-page', adminController.homePage)
router.get('/customers', adminController.getCustomers)
router.get('/category', adminController.getCategories)
router.get('/edit-customer/:userID', adminController.viewCustomer)
router.get('/delete-customer/:userID', adminController.softDeleteCustomer)
router.get('/add-category', adminController.addCategory)
router.get('/edit-category/:categoryID', adminController.editCategory)
router.get('/products', adminController.getProducts)
router.get('/add-product', adminController.addProduct)
router.get('/edit-product/:productID', adminController.editProduct)


// post requests
router.post('/', adminController.doLogin)
router.post('/edit-customer', adminController.editCustomer)
router.post('/add-category', adminController.saveAddCategory)
router.post('/edit-category', adminController.saveEditCategory)

module.exports = router