const {Schema, model} = require('mongoose')

const CategorySchema = new Schema({
    name: {
        type: String,
        unique: true, 
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
    image: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }    
})

const CategoryData = model('Category', CategorySchema)

module.exports = {
    CategoryData
}