const {Schema, model} = require('mongoose')

const FeedbackSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    feedbacks: [
        {
            userID: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            productRating: {
                type: Number,
                required: true
            },
            productFeedback: {
                type: String,
                trim: true,
                required: true,
            }
        }
    ]
}, { timestamps: true })


const ProductFeedback = model('Feedback', FeedbackSchema)

module.exports = {
    ProductFeedback
}