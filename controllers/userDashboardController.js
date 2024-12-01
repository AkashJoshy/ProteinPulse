const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const path = require('path')
const fs = require('fs')
const generateTransactionID = require('../utils/generateUniqueTransactionIDHelper')
let instance = require("../config/razorpay");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const { createHmac } = require("crypto");
const { UserData } = require('../models/userDB')
const { ProductData } = require('../models/productDB')
const { OrderData } = require('../models/OrderDB')
const { AddressData } = require('../models/AddressDB')
const { WalletData } = require('../models/WalletDB')
const { getPaginatedData } = require('../utils/paginationHelper')
require("dotenv").config();


// Razorpay
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

// Dashboard
const dashboard = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        const address = await AddressData.findOne({ userID: userID }).lean();
        const orders = await OrderData.find({ userID });

        // User's Order Count and status
        const userOrdersDetails = await OrderData.aggregate([
            {
                $match: { userID: new mongoose.Types.ObjectId(userID) },
            },
            {
                $group: {
                    _id: null,
                    pendingOrders: {
                        // Here, if Status is "Pending", return 1 and 0 otherwise and then sum all values
                        $sum: {
                            $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
                        },
                    },
                    completedOrders: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0],
                        },
                    },
                    totalOrders: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["Cancelled", "Returned", "Refunded"]] },
                                0,
                                1,
                            ],
                        },
                    },
                },
            },
        ]);

        let totalOrders;
        let pendingOrders;
        let completedOrders;

        if (orders.length <= 0 && address) {
            return res.render("user/user-dashboard", {
                auth: true,
                isDashboard: true,
                user,
                billingAddress: address.billingAddress[0],
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0,
            });
        }

        user.profilePicture =
            user.profilePicture === undefined
                ? "no-user-image-icon-0.jpg"
                : user.profilePicture;

        if (!address) {
            return res.render("user/user-dashboard", {
                auth: true,
                isDashboard: true,
                user,
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0,
            });
        }

        // User Order Details
        totalOrders = orders == null ? 0 : userOrdersDetails[0].totalOrders;
        pendingOrders = orders == null ? 0 : userOrdersDetails[0].pendingOrders;
        completedOrders = orders == null ? 0 : userOrdersDetails[0].completedOrders;

        return res.render("user/user-dashboard", {
            auth: true,
            isDashboard: true,
            user,
            billingAddress: address.billingAddress[0],
            totalOrders,
            pendingOrders,
            completedOrders,
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// User Account Details
const accountDetails = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        user.profilePicture =
            user.profilePicture === undefined
                ? "no-user-image-icon-0.jpg"
                : user.profilePicture;
        req.session.passwordErr = false;
        return res.render("user/view-account-details", {
            user,
            auth: true,
            passwordErr: req.session.passwordErr,
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// My Orders
const myOrders = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        let page = req.query.page || 1
        let limit = req.query.limit || 9
        let query = { userID }
        
        let { data, pagination } = await getPaginatedData(OrderData, page, limit, {}, query)
       
        let orders = data.map(order => {
            let formattedDate = moment(order.createdAt).format("MMMM Do YYYY HH:mm:ss")
            return { ...order, createdAt: formattedDate }
        })

        let orderMessage = ``
        if (!data || data.length === 0) {
            orderMessage = `No Orders has been placed`
            orders = null
        }

        return res.render("user/view-myorders", {
            auth: true,
            isDashboard: true,
            user,
            orders,
            pagination,
            orderMessage
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// Orders page
const myOrdersPages = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            status: false,
            redirected: "/login",
        });
    }
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({
                status: false,
                redirected: "/login",
            })
        }

        let page = Number(req.query.page) || 1
        let limit = Number(req.query.limit) || 9

        let query = { userID }
        let { data, pagination } = await getPaginatedData(OrderData, page, limit, {}, query)

        let orders = data.map(order => {
            let formattedDate = moment(order.createdAt).format("MMMM Do YYYY HH:mm:ss")
            return { ...order, createdAt: formattedDate }
        })

        return res.json({ status: true, orders, pagination })
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
})

// Wishlist
const wishlist = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const isUser = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!isUser) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        const user = await UserData.findById({ _id: userID })
            .populate("wishlist.productID")
            .lean();
        const wishlistProducts = user.wishlist.map((product) => {
            let { _id, name, price, imageUrl } = product.productID;
            let thumbnail = imageUrl[0];
            return { _id, name, price, thumbnail };
        });

        return res.render("user/view-wishlist", {
            auth: true,
            isDashboard: true,
            user,
            wishlistProducts,
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
})

// view order Details
const viewOrderDetails = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        const orderID = req.params.orderID;
        const address = await AddressData.findOne({ userID: userID }).lean();
        const order = await OrderData.findById({ _id: orderID }).lean();

        const products = await Promise.all(
            order.products.map(async (product) => {
                let image = product.image
                let prod = await ProductData.findById({ _id: product.productID })

                if (!prod) {
                    return { ...product, image: 'image_not_available.png' }
                } else {
                    const dir = path.dirname(__dirname)
                    let imagePath = path.join(dir, 'public/uploads/', image)

                    if (!fs.existsSync(imagePath)) {
                        image = 'image_not_available.png'
                    }

                    return { ...product, image: image }
                }

            })
        )

        let orderTimelineMessage = `Order expected arrival ${order.expectedDate}`

        const statusMessages = {
            Refunded: "Order has been Refunded on",
            Returned: "Order is Returned on",
            Delivered: "Order has been successfully Delivered on",
            Shipped: "Order has been Shipped on",
            Cancelled: "Order has been Cancelled on",
          };
          
          for (let activity of order.orderActivity) {
            if (statusMessages[activity.orderStatus]) {
              orderTimelineMessage = `${statusMessages[activity.orderStatus]} ${activity.createdAt}`;
            }
          }


        if (!address) {
            return res.render("user/view-myOrders-details", {
                auth: true,
                user,
                order,
                billingAddress: null,
                orderTimelineMessage
            });
        }

        return res.render("user/view-myOrders-details", {
            auth: true,
            user,
            order,
            products,
            billingAddress: address.billingAddress[0],
            orderTimelineMessage
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// User Address
const accountAddress = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }
        const address = await AddressData.findOne({ userID }).lean();

        if (!address) {
            return res.render("user/view-account-address", {
                auth: true,
                isDashboard: true,
                user,
            });
        }

        return res.render("user/view-account-address", {
            auth: true,
            isDashboard: true,
            user,
            shippingAddress: address.shippingAddress,
            billingAddress: address.billingAddress,
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// Add New Address
const addAddress = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }
        return res.render("user/add-address", {
            auth: true,
            isDashboard: true,
            user,
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// Saved Addresses
const viewAddresses = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }
        const address = await AddressData.findOne({ userID }).lean();

        // If the user doesnt have saved address before
        if (!address) {
            return res.render("user/view-saved-address", {
                auth: true,
                isDashboard: true,
                user,
            });
        }

        return res.render("user/view-saved-address", {
            auth: true,
            isDashboard: true,
            user,
            billingAddress: address.billingAddress,
            shippingAddress: address.shippingAddress,
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// Edit Address
const getAddressEdit = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        let { addressType, addressID } = req.params;


        if (addressType == "shippingAddress") {
            const address = await AddressData.aggregate([
                {
                    $match: {
                        userID: new mongoose.Types.ObjectId(userID),
                        "shippingAddress._id": new mongoose.Types.ObjectId(addressID),
                    },
                },
                {
                    $unwind: "$shippingAddress",
                },
                {
                    $match: {
                        "shippingAddress._id": new mongoose.Types.ObjectId(addressID),
                    },
                },
                {
                    $project: { shippingAddress: 1 },
                },
            ]);
            console.log(address);
            return res.render("user/edit-address", {
                auth: true,
                isDashboard: true,
                user,
                address: address[0],
            });
        }

        // Billing Address
        if (addressType == "billingAddress") {
            const address = await AddressData.aggregate([
                {
                    $match: {
                        userID: new mongoose.Types.ObjectId(userID),
                        "billingAddress._id": new mongoose.Types.ObjectId(addressID),
                    },
                },
                {
                    $unwind: "$billingAddress",
                },
                {
                    $match: {
                        "billingAddress._id": new mongoose.Types.ObjectId(addressID),
                    },
                },
                {
                    $project: { billingAddress: 1 },
                },
            ]);
            // console.log(address);

            return res.render("user/edit-address", {
                auth: true,
                isDashboard: true,
                user,
                billing: address[0],
            });
        }
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// Wallet viewing
const wallet = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();
    
        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }
    
        let wallet = await WalletData.findOne({ userID }).lean()
    
        if (!wallet) {
            const err = new Error("Wallet not Found")
            const redirectPath = "/";
            return next({ error: err, redirectPath });
        }
        
        let page = Number(req.query.page) || 1
        let limit = Number(req.query.limit) || 5

        console.log(page);
        let skip = (page - 1) * limit


        let walletTransactions
        if (wallet.transactions.length <= 0) {
            walletTransactions = null
        } else {
            walletTransactions = wallet.transactions.map(transaction => {
                transaction.createdAt = moment(transaction.createdAt).format('Do MMMM YYYY')
                transaction.statusColor = transaction.status == 'Pending' ? '#FF9800'
                    : (transaction.status == 'Success' ? '#388E3C' : '#F44336')
                return transaction
            }).filter(transaction => transaction.amount > 0)
                .slice(skip, skip + limit)
        }

        let totalDocuments = wallet.transactions.reduce((acc, current) => {
            if (current.amount != 0) {
                acc++
            }
            return acc
        }, 0)

        let totalPages = Math.ceil(totalDocuments / limit)

        let pagination = {
            isPrevious: page > 1,
            currentPage: page,
            isNext: page < totalPages,
            totalPages
        }

    
        let walletBalance = await WalletData.aggregate([
            {
                $match: { userID: new mongoose.Types.ObjectId(userID) }
            },
            {
                $unwind: "$transactions"
            },
            {
                $match: { 
                    "transactions.status": { $eq: "Success" },
                    "transactions.amount": { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    creditTotal: {
                        $sum: { $cond: [{ $eq: ["$transactions.transactionType", "credit"] }, "$transactions.amount", 0] },
                    },
                    debitTotal: {
                        $sum: { $cond: [{ $eq: ["$transactions.transactionType", "debit"] }, "$transactions.amount", 0] },
                    },
                    refferalTotal: {
                        $sum: { $cond: [{ $eq: ["$transactions.transactionType", "referral"] }, "$transactions.amount", 0] }
                    }

                }
            }
        ])

        
        const totalBalance = walletBalance.length > 0
    ? walletBalance[0].creditTotal  + walletBalance[0].refferalTotal
    : 0;

        return res.render("user/view-wallet", {
            auth: true,
            user: req.session.user,
            wallet,
            totalBalance,
            walletTransactions,
            pagination,
        });
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }

});

// Wallet Transaction Pages
const walletTransactionPages = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            status: false,
            redirected: "/login",
        });
    }
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({
                status: false,
                redirected: "/login",
            })
        }

        let page = Number(req.query.page) || 1
        let limit = Number(req.query.limit) || 5

        let skip = (page - 1) * limit

        let wallet = await WalletData.findOne({ userID: userID }).lean()

        let walletTransactions
        if (wallet.transactions.length <= 0) {
            walletTransactions = null
        } else {
            walletTransactions = wallet.transactions.map(transaction => {
                transaction.createdAt = moment(transaction.createdAt).format('Do MMMM YYYY')
                transaction.statusColor = transaction.status == 'Pending' ? '#FF9800'
                    : (transaction.status == 'Success' ? '#388E3C' : '#F44336')
                return transaction
            }).filter(transaction => transaction.amount > 0)
                .slice(skip, skip + limit)
        }

        let totalDocuments = wallet.transactions.reduce((acc, current) => {
            if (current.amount != 0) {
                acc++
            }
            return acc
        }, 0)

        let totalPages = Math.ceil(totalDocuments / limit)

        let pagination = {
            isPrevious: page > 1,
            currentPage: page,
            isNext: page < totalPages,
            totalPages
        }

        return res.json({ status: true, walletTransactions: walletTransactions, pagination: pagination })
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
})

// Save New Address
const saveAddress = asyncHandler(async (req, res, next) => {
    try {
        const addressType = req.body.addressType;
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        const userAddress = await AddressData.findOne({ userID });
        let { address, country, state, city, zipcode, mobile } = req.body;

        if (!userAddress) {
            await AddressData.create({
                userID,
                billingAddress: [],
                shippingAddress: [],
            });
        }

        if (addressType == "billingAddress") {
            // Updating
            await AddressData.findOneAndUpdate(
                {
                    userID,
                },
                {
                    $push: {
                        billingAddress: {
                            address,
                            country,
                            state,
                            city,
                            zipcode,
                            mobileNumber: mobile,
                        },
                    },
                }
            );
        } else {
            await AddressData.findOneAndUpdate(
                {
                    userID,
                },
                {
                    $push: {
                        shippingAddress: {
                            address,
                            country,
                            state,
                            city,
                            zipcode,
                            mobileNumber: mobile,
                        },
                    },
                }
            );
        }
        return res.redirect("/user/dashboard/address/saved-address");
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// Update Address
const updateAddress = asyncHandler(async (req, res, next) => {
    try {

        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        return res.redirect("/user/dashboard/address/saved-address");
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
    }
});

// Add Amount to Wallet
const addToWallet = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }

    try {
        let { amount } = req.body
        amount = Number(amount)

        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        let transactionID = await generateTransactionID(userID)
        let userWallet = await WalletData.findOne({ userID: userID })

        if (!userWallet) {
            return res.json({ status: false, redirected: '/user/dashboard/wallet', message: 'Wallet not found' })
        }

        await WalletData.findOneAndUpdate(
            { userID: userID, },
            {
                $push:
                {
                    transactions: {
                        amount: amount,
                        transactionID: transactionID,
                        transactionType: 'credit',
                        paymentType: 'Razorpay',
                        description: 'Your wallet has been topped up'
                    }
                }
            }, { new: true })


        // Razorpay instance creation
        var options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency: "INR",
            receipt: transactionID,
        };
        let razorpayOrder = await instance.orders.create(options);

        return res.json({ status: true, user, RAZORPAY_KEY_ID, order: razorpayOrder })
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
})

// Verify Wallet Top up using Razorpay
const verifyWalletTopup = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }
    try {
        let { razorpay, topUp } = req.body

        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({
                status: false,
                redirected: "/login",
            })
        }

        console.log(topUp)
        let topUpAmount = Number(topUp.amount)
        topUpAmount = topUpAmount / 100
        console.log(`Topup Amount: ${topUpAmount}`)
        const secretKey = process.env.RAZORPAY_SECRET_KEY;
        if (!secretKey) {
            return res.json({ success: false, message: "Internal server error" });
        }

        // hashing the razorpayOrderID and razorpayPaymentID with secretKey into SHA256
        let hash = createHmac("sha256", secretKey).update(
            razorpay.razorpay_order_id + "|" + razorpay.razorpay_payment_id
        );

        // then converting into hex
        let generatedSignature = hash.digest("hex");

        if (generatedSignature == razorpay.razorpay_signature) {
            // Top-Up is Success
            await WalletData.findOneAndUpdate(
                { 'transactions.transactionID': topUp.receipt, userID: userID },
                { $set: { 'transactions.$.status': "Success" }, $inc: { balance: topUpAmount } },
                { new: true }
            );

            // Total Wallet Balance
            let walletBalance = await WalletData.aggregate([
                {
                    $match: { userID: new mongoose.Types.ObjectId(userID) }
                },
                {
                    $unwind: "$transactions"
                },
                {
                    $match: { "transactions.status": { $eq: "Success" } }
                },
                {
                    $group: {
                        _id: null,
                        creditTotal: {
                            $sum: { $cond: [{ $eq: ["$transactions.transactionType", "credit"] }, "$transactions.amount", 0] },
                        },
                        debitTotal: {
                            $sum: { $cond: [{ $eq: ["$transactions.transactionType", "debit"] }, "$transactions.amount", 0] },
                        },
                        refferalTotal: {
                            $sum: { $cond: [{ $eq: ["$transactions.transactionType", "referral"] }, "$transactions.amount", 0] }
                        },
                    }
                }
            ])

            const totalBalance = walletBalance[0].creditTotal + walletBalance[0].refferalTotal

            return res.json({
                status: true,
                success: true,
                totalBalance,
                message: `Top-up successful`
            })
        } else {
            return res.json({
                status: true,
                success: false,
                message: `Top-up failed`
            })
        }
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
})

// Update User Details
const updateUserDetails = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }

    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({ status: false, redirected: "/login" });
        }

        // updating User data
        await UserData.findByIdAndUpdate({ _id: userID }, req.body);
        return res.json({
            status: true,
            redirected: "/user/dashboard/account-details",
        });
    } catch (error) {
        console.error(error)
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});

// Updating User Profile Picture
const updateUserProfilePic = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }

    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({ status: false, redirected: "/login" });
        }

        console.log(req.files[0]);
        let profilePicUrl = req.files[0].filename;
        await UserData.findByIdAndUpdate(
            { _id: userID },
            { profilePicture: profilePicUrl }
        )

        return res.json({
            status: true,
            redirected: "/user/dashboard/account-details",
        });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});


// Change Password
const changePassword = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }

    try {
        const { password, newPassword, confirmPassword } = req.body;
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({ status: false, redirected: "/login" });
        }

        let isPasswordValid = await hashedPasswordComparing(
            password,
            user.password
        );
        console.log(isPasswordValid);
        if (!isPasswordValid) {
            req.session.passwordErr = "Password is Incorrect";
            return res.json({
                status: false,
                redirected: "/user/dashboard/account-details",
            });
        }

        if (newPassword != confirmPassword) {
            req.session.passwordErr = "New Password is not Matching";
            return res.json({
                status: false,
                redirected: "/user/dashboard/account-details",
            });
        }

        const updatedPassword = await passwordHashing(newPassword);
        await UserData.findByIdAndUpdate(
            { _id: userID },
            { password: updatedPassword }
        );
        return res.json({
            status: true,
            redirected: "/user/dashboard/account-details",
        });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});

// Delete Address
const deleteAddress = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            status: false,
            redirected: "/login",
        });
    }
    
    try {
        console.log(req.body);
        let { _id, addressField } = req.body;
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({
                status: false,
                redirected: "/login",
            })
        }

        // Shipping Address Deletion
        if (addressField == "shippingAddress") {
            const address = await AddressData.findOneAndUpdate(
                { userID, "shippingAddress._id": _id },
                {
                    $pull: { shippingAddress: { _id: _id } },
                }
            );
            console.log(address);
            return res.json({
                status: true,
                redirected: "/user/dashboard/address/saved-address",
                message: "Successfully Deleted",
            });
        }

        const address = await AddressData.aggregate([
            { $match: { userID: new mongoose.Types.ObjectId(userID) } },
            { $project: { billingAddress: 1 } },
        ]);

        // Billing Address deletion failed if it only one billing Address
        if (address[0].billingAddress.length === 1) {
            return res.json({
                status: true,
                redirected: "/user/dashboard/address/saved-address",
                message: "Billing Address cannot be Deleted",
            });
        }

        // Billing Address Deletion
        await AddressData.findOneAndUpdate(
            { userID, "billingAddress._id": _id },
            {
                $pull: { billingAddress: { _id: _id } },
            }
        );
        return res.json({
            status: true,
            redirected: "/user/dashboard/address/saved-address",
            message: "Successfully Deleted",
        });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});

// Remove Wishlist Product
const removeWishlistProduct = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            status: false,
            redirected: "/login",
        });
    }

    try {
        const userID = req.session.user._id
        let productID = req.params.productID;
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();
        const product = await ProductData.findOne({ _id: productID, isActive: true })
    
        if (!user) {
            req.session.user = null;
            return res.json({
                status: false,
                redirected: "/login",
            })
        }
    
        let userWishlist = await UserData.findOneAndUpdate(
            { _id: userID, "wishlist.productID": productID },
            { $pull: { wishlist: { productID: productID } } },
            { new: true }
        )
    
        if (userWishlist.wishlist.length == 0) {
            return res.json({ status: true, message: `Product removed`, text: 'No products in Wishlist' });
        }
    
        return res.json({ status: true, message: `Product removed` });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});



module.exports = {
    dashboard,
    accountDetails,
    myOrders,
    myOrdersPages,
    wishlist,
    viewOrderDetails,
    accountAddress,
    addAddress,
    saveAddress,
    updateAddress,
    viewAddresses,
    getAddressEdit,
    wallet,
    walletTransactionPages,
    addToWallet,
    verifyWalletTopup,
    updateUserDetails,
    updateUserProfilePic,
    changePassword,
    deleteAddress,
    removeWishlistProduct
}