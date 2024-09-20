const {Schema, model} = require('mongoose')


// Wishlist
const WishlistSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }
}, { timestamps: true })


const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: /.+\@.+\..+/
    },
    password: {
        type: String,
    },
    mobileNumber: {
        type: Number,
        unique: true,
    },
    profilePicture: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: String,
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpires: {
        type: Date
    },
    coupons: [ {
        couponID: {
            type: Schema.Types.ObjectId,
            ref: 'Coupon'
        },
        limit: {
            type: Number,
            default: 1
        },
    } ],
    appliedCoupons: [ {
        couponID: {
            type: Schema.Types.ObjectId,
            ref: 'Coupon'
        },
        cartID: {
            type: Schema.Types.ObjectId,
            ref: 'Cart'
        },
        limit: {
            type: Number,
            default: 1
        },
    } ],
    wishlist: [ WishlistSchema ],
},
{
    timestamps: true
})


let UserData = model('User', userSchema)

module.exports = {
    UserData
}