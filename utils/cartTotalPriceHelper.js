const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const { UserData } = require('../models/userDB')
const { CartData } = require('../models/cartDB')
const { CouponData } = require('../models/CouponDB')

const cartTotalPrice = asyncHandler(async (userID) => {

    let totalPrice = 0;
    let originalPrice = 0;
    let totalSalePrice = 0;
    let discountPrice = 0;
    let discountPercentage = 0
    let deliveryCharge = 0;
    let validoffers
    let coupons;
    let couponDiscount = 0;
    let couponPrice = 0;
    let couponDiscountPercentage = 0;

    const user = await UserData.findById({ _id: userID }).lean()
    const cart = await CartData.findOne({ userID }).lean();
    const offers = await CouponData.find({ isActive: true }).lean();


    if (offers) {
        validoffers = offers.filter(coupon => {
            let isCouponApplied = user.coupons.find(coup => coup.couponID.toString() === coupon._id.toString())

            if (isCouponApplied) {
                if (isCouponApplied.limit < coupon.limit) {
                    return true
                } else {
                    return false
                }
            } else {
                return true
            }

        })
    }

    if (!cart || cart.length === 0) {
        return {
            cart: null,
            discountPercentage,
            totalSalePrice,
            originalPrice,
            discountPrice,
            deliveryCharge,
            totalPrice,
            validoffers: null,
            coupons,
            couponDiscountPrice: 0,
            couponDiscountPercentage,
        }
    }


    const cartTotal = await CartData.aggregate([
        { $match: { userID: new mongoose.Types.ObjectId(userID) } },
        { $unwind: "$products" },
        {
            $group: {
                _id: null,
                originalPrice: {
                    $sum: { $multiply: ["$products.quantity", "$products.price"] },
                },
                totalSalePrice: {
                    $sum: { $multiply: ["$products.quantity", "$products.salePrice"] },
                },
            },
        },
    ]);


    if (cartTotal.length <= 0) {
        return {
            cart: null,
            discountPercentage,
            totalSalePrice,
            originalPrice,
            discountPrice,
            deliveryCharge,
            totalPrice,
            validoffers: null,
            coupons,
            couponDiscountPrice: 0,
            couponDiscountPercentage,
        }
    }

    originalPrice = cartTotal[0].originalPrice;
    totalSalePrice = cartTotal[0].totalSalePrice;
    discountPrice = originalPrice - totalSalePrice;
    discountPercentage = (discountPrice / originalPrice) * 100;
    discountPercentage = Math.trunc(discountPercentage);
    deliveryCharge = originalPrice <= 4500 ? 100 : 0;
    totalPrice = totalSalePrice + deliveryCharge;

    const productDetails = await CartData.find({})
        .populate("products.productID")
        .lean();

    if (user.appliedCoupons) {
        coupons = await Promise.all(
            user.appliedCoupons.map(async (coupon) => {
                if (coupon.cartID.toString() === cart._id.toString()) {
                    const existingCoupon = await CouponData.findById({
                        _id: coupon.couponID,
                    }).lean();
                    return { coupon, existingCoupon };
                } else {
                    return null;
                }
            })
        );
        coupons = coupons.filter((coupon) => coupon !== null);

        couponPrice = !coupons
            ? 0
            : coupons.reduce((acc, coupon) => {
                couponDiscount =
                    originalPrice >= coupon.existingCoupon.maxDiscount
                        ? coupon.existingCoupon.maxDiscount
                        : originalPrice * (1 - discountPercentage / 100);
                return acc + couponDiscount;
            }, 0);

        totalPrice -= couponPrice;
        couponDiscountPercentage = Math.trunc(
            (couponPrice / originalPrice) * 100
        );
        return {
            cart,
            discountPercentage,
            totalSalePrice,
            originalPrice,
            discountPrice: discountPrice <= 0 ? 0 : -discountPrice,
            deliveryCharge,
            totalPrice,
            validoffers,
            coupons,
            couponDiscountPrice: couponPrice <= 0 ? 0 : -couponPrice,
            couponDiscountPercentage,
        }

    }

    return {
        cart,
        discountPercentage,
        totalSalePrice,
        originalPrice,
        discountPrice: discountPrice <= 0 ? 0 : -discountPrice,
        deliveryCharge,
        totalPrice,
        validoffers,
        coupons,
        couponDiscountPrice: couponPrice <= 0 ? 0 : -couponPrice,
        couponDiscountPercentage,
    }
})

module.exports = cartTotalPrice

