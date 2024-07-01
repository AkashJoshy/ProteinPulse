const {Schema, model} = require('mongoose')

const FeedbackSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'product',
        required: true,
    },
    feedbacks: [
        {
            userID: {
                type: Schema.Types.ObjectId,
                ref: 'user',
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
})


const ProductFeedback = model('feedback', FeedbackSchema)

module.exports = {
    ProductFeedback
}