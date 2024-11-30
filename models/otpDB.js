const {Schema, model} = require('mongoose')

const OtpSchema = new Schema({
    userID: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
},{ timestamps: true })


const OtpData = model('UserOtp', OtpSchema)


module.exports = { 
    OtpData
}