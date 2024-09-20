const Razorpay = require('razorpay')

require('dotenv').config()

// Create an instance of Razorpay
const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
})

// Export the Instance
module.exports = instance