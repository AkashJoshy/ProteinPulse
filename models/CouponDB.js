const { Schema, model } = require('mongoose')


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
CouponSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 10 })

let CouponData = model('Coupon', CouponSchema)

module.exports = {
    CouponData
}