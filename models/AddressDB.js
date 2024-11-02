const { Schema, model } = require('mongoose')

const BillingAddressSchema = new Schema({
    address: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    zipcode: {
        type: Number,
        required: true
    },
    mobileNumber: {
        type: Number,
        required: true
    },
    addressType: {
        type: String,
        required: true
    }
})


const ShippingAddressSchema = new Schema({
    address: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    zipcode: {
        type: Number,
        required: true
    },
    mobileNumber: {
        type: Number,
        required: true
    },
    addressType: {
        type: String,
        required: true
    }
})


const UserAddressSchema = new Schema({
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    billingAddress: [ BillingAddressSchema ],
    shippingAddress: [ ShippingAddressSchema ]
})

let AddressData = model('Address', UserAddressSchema)

module.exports = {
    AddressData
}