const { Schema, model } = require('mongoose')
const cron = require('node-cron')

const OfferSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    offerType: {
        type: String,
        enum: ['product', 'category'],
        required: true
    },
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: function () {
            return this.offerType === 'product'
        }
    },
    categoryID: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: function () {
            return this.offerType === 'category'
        }
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        required: false
    },
    startingDate: {
        type: Date,
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
OfferSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 })

let OfferData = model('Offer', OfferSchema)

module.exports = {
    OfferData
}

// Cron Job to check if the Offer is expired.
cron.schedule('* * * * *', async () => {
   try {
     // Current Date 
     const dateNow = new Date()

     // Fetch all Expired Offers where isActive is true
     const expiredOffers = await OfferData.find({ expiryDate: { $lt: dateNow }, isActive: true })
 
     if(expiredOffers.length > 0) {
         // update the array of expiredOffers
         await OfferData.updateMany({ expiryDate: { $lt: dateNow } }, { $set: { isActive: false } })
     }
   } catch (error) {
        console.error(`Error in Offers is ${error}`)
   }
});
