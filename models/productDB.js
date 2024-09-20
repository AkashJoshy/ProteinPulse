const {Schema, model} = require('mongoose')

const ProductSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    description : {
        type: String,
        required: true,
        trim: true
    },
    brand : {
        type: String,
        required: true
    },
    highlights : {
        type: [String],
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
        required: true
    },
    offer: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    flavour: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    quantities: {
        type: Number,
        required: true
    },
    origin: {
        type: String,
        required: true,
        trim: true
    },
    bestBefore: {
        type: Date,
        default: Date.now
    },
    imageUrl: {
        type: [String],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
},{
    timestamps: true
})


const ProductData = model('Product', ProductSchema)

module.exports = {
    ProductData
}