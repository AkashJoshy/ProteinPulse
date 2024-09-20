const {Schema, model} = require('mongoose')

const OtpSchema = new Schema({
    userID: {
        type: Schema.ObjectId,
        ref: 'User',
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


const OtpData = model('UserOtp', OtpSchema)


module.exports = { 
    OtpData
}