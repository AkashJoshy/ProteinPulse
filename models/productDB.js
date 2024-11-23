const { Schema, model } = require('mongoose')
const cron = require('node-cron')
const { OfferData } = require('./OfferDB')
const { CategoryData } = require('./categoryDB')


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
    description: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        required: true
    },
    highlights: {
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
        default: 0,
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
        default: 0
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
    totalSales: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, {
    timestamps: true
})


const ProductData = model('Product', ProductSchema)

module.exports = {
    ProductData
}

cron.schedule('* * * * * *', async () => {


    let offers = await OfferData.find({ isActive: true })
    let products = await ProductData.find()

    let updatedProducts = await Promise.all(
        products.map(async (product) => {
            let productOfferPrice = product.price
            let categoryOfferPrice = product.price

            if (offers.length > 0) {
                await Promise.all(
                    offers.map(async (offer) => {
    
                        if (offer.offerType === 'product' && product._id.toString() === offer.productID.toString()) {
                            productOfferPrice = product.price - offer.discount
                        }
    
                        let category = await CategoryData.findOne({ name: product.categoryName })
                        if (offer.offerType === 'category' && category && category._id.toString() === offer.categoryID.toString()) {
                            let discountPrice = (offer.discountPercentage * product.price) / 100
                            categoryOfferPrice = product.price - discountPrice
                        }
    
                    })

                )
            }
            let salePrice = Math.min(productOfferPrice, categoryOfferPrice)
            let offerPercentage = salePrice < product.price ? ((product.price - salePrice) / product.price) * 100 : 0;
            await ProductData.findByIdAndUpdate({ _id: product._id }, { $set: { salePrice: salePrice, offer: offerPercentage } })
            return salePrice
        })

    )
    
    // console.log(updatedProducts)

});