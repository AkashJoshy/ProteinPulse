const { Schema, model, Types } = require('mongoose')

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
    mobile: {
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
    mobile: {
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
        ref: 'user',
        required: true
    },
    billingAddress: [ BillingAddressSchema ],
    shippingAddress: [ ShippingAddressSchema ]
})

let AddressData = model('address', UserAddressSchema)

module.exports = {
    AddressData
}