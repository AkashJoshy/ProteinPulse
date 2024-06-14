const {Schema, model} = require('mongoose')

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description : {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    },
    flavour: {
        type: String,
        required: true
    },
    size: {
        type: Array,
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    quantities: {
        type: Number,
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    images: {
        type: Array,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})


const ProductData = model('product', productSchema)

module.exports = {
    ProductData
}