const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')

// user routes
// get requests
router.get('/', userController.homePage)
router.get('/login', userController.Login)
router.get('/login-social', userController.socialLogin)
router.get('/signup', userController.signup)
router.get('/signup-otp', userController.signupOtpConfirm)
router.get('/forgot-password', userController.forgotPassword)
router.get('/forgot-password-otp', userController.forgotPasswordOtpConfirm)
router.get('/user-categories/:categoryName', userController.categories)

router.get('/sample', userController.sample)

// post requests
router.post('/signup', userController.doSignup)
router.post('/login', userController.doLogin)


module.exports = router