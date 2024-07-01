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
        ref: 'product',
        required: true
    },
    productName: {
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
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    companyName: {
        type: String,
    },
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

const UserOrderSchema = new Schema({
    orderNumber: {
        type: String,
        required: true
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    address: addressSchema,
    paymentMethod: {
        type: String,
        required: true,
    },
    totalSalePrice: {
        type: Number,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    orderNote: {
        type: String
    },
    deliveryFee: {
        type: Number,
        required: true
    },
    discount: {
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

const OrderData = model('myorder', UserOrderSchema)

module.exports = {
    OrderData
}   