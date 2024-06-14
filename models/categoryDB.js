const {Schema, model, Types} = require('mongoose')

const categorySchema = new Schema({
    name: {
        type: String, 
        required: true
    },
    description: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    // pagePath: {
    //     type: String,
    //     required: true
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }    
})

const CategoryData = model('category', categorySchema)

module.exports = {
    CategoryData
}