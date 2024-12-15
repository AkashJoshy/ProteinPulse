const { Schema, model } = require('mongoose')
const { ProductData } = require('./productDB')
const { WalletData } = require('./WalletDB')
const cron = require('node-cron')
let generateUniqueTransactionIDHelper = require('../utils/generateUniqueTransactionIDHelper')

const UserOrderActivitiesSchema = new Schema({
    orderStatus: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
}, {
    timestamps: true
})

const cartProductSchema = new Schema({
    productID: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    flavour: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    },
    offer: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    }
})

const addressSchema = new Schema({
    address: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    zipcode: {
        type: Number,
        required: true,
    },
    mobileNumber: {
        type: Number,
        required: true,
    }
})

// Coupon Schema
const couponsSchema = new Schema({
    code: {
        type: String,
    },
    deductedPrice: {
        type: Number,
    }
})

const UserOrderSchema = new Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true,
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cartID: {
        type: Schema.Types.ObjectId,
        ref: 'Cart',
        required: true
    },
    customer: {
        type: String,
        required: true
    },
    address: addressSchema,
    paymentMethod: {
        type: String,
        required: true,
    },
    originalPrice: {
        type: Number,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    totalSalePrice: {
        type: Number,
        required: true,
    },
    coupons: [couponsSchema],
    orderNote: {
        type: String
    },
    deliveryCharge: {
        type: Number,
        required: true
    },
    discountPrice: {
        type: Number
    },
    orderActivity: [UserOrderActivitiesSchema],
    status: {
        type: String,
        default: 'Pending',
        required: true
    },
    paymentStatus: {
        type: String,
        required: true
    },
    expectedDate: {
        type: Date,
        default: Date.now,
    },
    products: [cartProductSchema]
},
    {
        timestamps: true
    })

const OrderData = model('MyOrder', UserOrderSchema)

module.exports = {
    OrderData
}


cron.schedule('* * * * *', async () => {
    try {
        let orders = await OrderData.find({'orderActivity.orderStatus': { $nin: ['Cancelled', 'Refunded', 'Returned'] }}).lean()
        // console.log(orders)

        for (const order of orders) {
            let updatedProducts = await Promise.all(
                order.products.map(async (product) => {
                    let prod = await ProductData.findById({ _id: product.productID })
                    if (!prod) {
                        return { ...product, status: 'Cancelled', image: 'image_not_available.png' }
                    }

                    if (prod && !prod.imageUrl) {
                        return { ...product, image: 'image_not_available.png' }
                    }

                    return { ...product }
                })
            )

            let cancelledProducts = updatedProducts.filter(product => product.status === 'Cancelled')

            if (cancelledProducts.length == updatedProducts.length && order.status !== 'Refunded' ) {
                    await OrderData.findByIdAndUpdate({ _id: order._id },
                        { $push: { orderActivity: { orderStatus: 'Cancelled', message: 'Your order has been cancelled' } } }
                    )
            }

            await OrderData.findByIdAndUpdate({ _id: order._id },
                { products: updatedProducts }
            )

            let updatedOrders = updatedProducts.filter(product => product.status !== 'Cancelled')

            if (order.paymentMethod !== 'COD' && order.paymentStatus === 'Paid' && order.status !== 'Refunded') {
                let refundPrice = updatedProducts.reduce((acc, current) => {
                    if (current.status === 'Cancelled') {
                        acc += current.salePrice * current.quantity
                    }
                    return acc
                }, 0)

                if (refundPrice > 0) {
                    let transactionID = await generateUniqueTransactionIDHelper(order.userID)
                    await WalletData.findOneAndUpdate(
                        { userID: order.userID },
                        {
                            $inc: { balance: refundPrice },
                            $push:
                            {
                                transactions: {
                                    amount: refundPrice,
                                    transactionID: transactionID,
                                    transactionType: 'credit',
                                    paymentType: 'Wallet',
                                    description: 'Amount refunded',
                                    status: 'Success',
                                }
                            }
                        }
                    )

                }
            }



            let orderStatus = {
                status: order.status
            }

            if (updatedOrders.length < updatedProducts.length && updatedOrders.length !== 0 ) {
                if(order.paymentMethod !== 'COD') {
                    orderStatus.status = 'Partially Refunded'
                }
            } else if (updatedOrders.length < updatedProducts.length && updatedOrders.length === 0) {
                if(order.paymentMethod !== 'COD') {
                    orderStatus.status = 'Refunded'
                }
            } else {
                orderStatus.status = order.status
            }

            if (order.status !== orderStatus.status) {
                await OrderData.findByIdAndUpdate({ _id: order._id },
                    { status: orderStatus.status }
                )
            }

        }

    } catch (error) {

    }
})