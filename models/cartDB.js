const {Schema, model} = require('mongoose')

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

const CartSchema = new Schema({
    products: [cartProductSchema],
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
})


let CartData = model('cart', CartSchema)

module.exports = {
    CartData
}