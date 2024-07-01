
const {Schema, model} = require('mongoose')

const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: /.+\@.+\..+/
    },
    password: {
        type: String,
    },
    mobileNumber: {
        type: Number,
        unique: true,
    },
    profilePicture: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpires: {
        type: Date
    }
    // address: [{type: Schema.Types.ObjectId, ref: 'address'}],
    // wishlist: [{type: Schema.Types.ObjectId, ref: 'product'}],
},
{
    timestamps: true
})


let UserData = model('user', userSchema)

module.exports = {
    UserData
}