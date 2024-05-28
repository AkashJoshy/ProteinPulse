const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')

// user routes
// get requests
router.get('/', userController.homePage)

module.exports = router