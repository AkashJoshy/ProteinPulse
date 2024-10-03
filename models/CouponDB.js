const { Schema, model } = require('mongoose')
const cron = require('node-cron')


const CouponSchema = new Schema({
    code: {
        type: String,
        required: true
    },
    couponType: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    maxDiscount: {
        type: Number,
        required: true
    },
    limit: {
        type: Number,
        required: true
    },
    minOrderValue: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true })

// TTL Index creation for expiry Date
CouponSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 })


let CouponData = model('Coupon', CouponSchema)

module.exports = {
    CouponData
}

// Cronh Job to check whether any coupon is expired
cron.schedule('* * * * *', async() => {
    try {
        const dateNow = new Date()

        // All Coupon with Expired date
        const expiredCoupons = await CouponData.find({ expiryDate: { $lt: dateNow }, isActive: true })

        if(expiredCoupons.length > 0) {
            // Update the array of expired coupons
            await CouponData.updateMany({ expiryDate: { $lt: dateNow } }, { $set: { isActive: false } })
        }

    } catch (error) {
        console.error(`Error in Coupons is: ${error}`)
    }
});