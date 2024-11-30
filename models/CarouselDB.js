const { Schema, model } = require('mongoose')

const CarouselSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Product', 'Category'],
        required: true
    },
    link: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
}, { timestamps: true })

const CarouselData = model('Carousel', CarouselSchema)

module.exports = {
    CarouselData
}