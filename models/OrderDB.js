const { Schema, model } = require('mongoose')

const UserOrderActivitiesSchema = new Schema({
    orderStatus: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
},{
    timestamps: true
})

const cartProductSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    flavour: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    },
    offer: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    }
})

const addressSchema = new Schema({
    address: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    zipcode: {
        type: Number,
        required: true,
    },
    mobileNumber: {
        type: Number,
        required: true,
    }
})

// Coupon Schema
const couponsSchema = new Schema({
    code: {
        type: String,
        required: true
    },
    deductedPrice: {
        type: Number,
        required: true
    }
})

const UserOrderSchema = new Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true,
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cartID: {
        type: Schema.Types.ObjectId,
        ref: 'Cart',
        required: true
    },
    customer: {
        type: String,
        required: true
    },
    address: addressSchema,
    paymentMethod: {
        type: String,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    totalSalePrice: {
        type: Number,
        required: true,
    },
    coupons: [ couponsSchema ],
    orderNote: {
        type: String
    },
    deliveryFee: {
        type: Number,
        required: true
    },
    discountPrice: {
        type: Number
    },
    orderActivity: [ UserOrderActivitiesSchema ],
    status: {
        type: String,
        default: 'Pending',
        required: true
    },
    paymentStatus: {
        type: String,
        required: true
    },
    expectedDate:  {
        type: Date,
        default: Date.now,
    },
    products: [ cartProductSchema ]
},
{
    timestamps: true
})

const OrderData = model('MyOrder', UserOrderSchema)

module.exports = {
    OrderData
}   