const {Schema, model} = require('mongoose')

const OtpSchema = new Schema({
    userID: {
        type: Schema.ObjectId,
        ref: 'user',
        required: true
    },
    otp: {
        type: Number,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
},{ timestamps: true })


const OtpData = model('userOtp', OtpSchema)


module.exports = { 
    OtpData
}