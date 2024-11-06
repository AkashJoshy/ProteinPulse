const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const { UserData } = require('../models/userDB')
const { ProductData } = require('../models/productDB')
const { CartData } = require('../models/cartDB')
const { OfferData } = require('../models/OfferDB')
const { CouponData } = require('../models/CouponDB')


// User Cart
const myCart = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }
        let totalPrice = 0;
        let originalPrice;
        let totalSalePrice;
        let totalDiscountAmount;
        let discountPrice;
        let deliveryCharge = 0;

        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        const offers = await CouponData.find({ isActive: true }).lean();

        let validoffers

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

        console.log(`validoffers`)
        console.log(validoffers)

        // User Cart
        const cart = await CartData.findOne({ userID }).lean();

        if (!cart || cart.length === 0) {
            return res.render("user/view-my-cart", {
                auth: true,
                user: req.session.user,
                cart: null,
                discountPercentage: 0,
                totalSalePrice: 0,
                originalPrice: 0,
                totalDiscountAmount: 0,
                discountPrice: 0,
                deliveryCharge,
                totalPrice,
            });
        }

        // Cart total Amount
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
                    totalDiscountAmount: {
                        $sum: { $subtract: ["$products.price", "$products.salePrice"] },
                    },
                },
            },
        ]);

        if (cartTotal.length <= 0) {
            return res.render("user/view-my-cart", {
                auth: true,
                user: req.session.user,
                cart,
                discountPercentage: 0,
                totalSalePrice: 0,
                originalPrice,
                totalDiscountAmount: 0,
                discountPrice: 0,
                deliveryCharge,
                totalPrice,
            });
        }

        originalPrice = cartTotal[0].originalPrice;
        totalSalePrice = cartTotal[0].totalSalePrice;
        totalDiscountAmount = cartTotal[0].totalDiscountAmount;

        discountPrice = originalPrice - totalSalePrice;

        let discountPercentage = (discountPrice / originalPrice) * 100;
        discountPercentage = Math.trunc(discountPercentage);

        deliveryCharge = originalPrice >= 4500 ? 100 : 0;

        totalPrice = totalSalePrice + deliveryCharge;
        const productDetails = await CartData.find({})
            .populate("products.productID")
            .lean();

        if (user.appliedCoupons) {
            let couponDiscountPercentage = 0;
            let coupons;
            let couponDiscount = 0;
            let couponPrice = 0;
            console.log(`coupon Applyied`);
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
            console.log(coupons);

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
            res.render("user/view-my-cart", {
                auth: true,
                user: req.session.user,
                cart,
                userCart: cart.products,
                products: productDetails[0].products,
                originalPrice,
                discountPercentage,
                couponDiscountPercentage,
                totalSalePrice,
                discountPrice: discountPrice <= 0 ? 0 : -discountPrice,
                totalPrice,
                deliveryCharge,
                validoffers,
                coupons,
                couponDiscountPrice: couponPrice <= 0 ? 0 : -couponPrice,
                loginErr: req.session.errMessage,
            });

            req.session.errMessage = false;
            return;
        }

        res.render("user/view-my-cart", {
            auth: true,
            user: req.session.user,
            cart,
            userCart: cart.products,
            products: productDetails[0].products,
            originalPrice,
            discountPercentage,
            totalSalePrice,
            discountPrice: discountPrice <= 0 ? 0 : -discountPrice,
            totalPrice,
            deliveryCharge,
            validoffers,
            loginErr: req.session.errMessage,
        });

        req.session.errMessage = false;
    } catch (error) {
        console.error(error);
    }
});

// Add To Cart
const addToCart = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.json({
                message: "Please login to continue",
                status: false,
                redirected: "/login",
            });
        }

        const userID = req.session.user._id
        const productID = req.body.productID;
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean()
        const productDetails = await ProductData.findById(productID)


        if (!user) {
            req.session.user = null;
            return res.json({
                message: "No user found!",
                status: false,
                redirected: "/login",
            });
        }

        if (!productDetails) {
            return res.json({
                status: true,
                message: "No product Found",
            });
        }

        let count = req.body.count;
        console.log(count);
        const productLimit = 4;
        const cart = await CartData.findOne({ userID: userID });

        if (!cart) {
            if (count >= productLimit) {
                return res.json({
                    status: true,
                    message: "Max Limit is Reached for the Product",
                });
            } else {
                await CartData.create({
                    userID,
                    products: {
                        productID,
                        productName: productDetails.name,
                        size: productDetails.size,
                        flavour: productDetails.flavour,
                        quantity: count,
                        price: productDetails.price,
                        salePrice: productDetails.salePrice,
                        offer: productDetails.offer,
                        image: productDetails.imageUrl[0],
                    },
                });

                return res.json({ status: true, message: "Added new Cart" });
            }
        }

        const cartProductIndex = cart.products.findIndex(
            (prod) => prod.productID == productID
        );
        if (cartProductIndex !== -1) {
            if (
                cart.products[cartProductIndex].quantity >= productLimit ||
                count >= productLimit
            ) {
                return res.json({
                    status: true,
                    message: "Max Limit is Reached for the Product",
                });
            }

            cart.products[cartProductIndex].quantity++;
            await cart.save();
            return res.json({ status: true, message: "Cart Updated" });
        }

        await CartData.findOneAndUpdate(
            { userID },
            {
                $push: {
                    products: {
                        productID,
                        productName: productDetails.name,
                        size: productDetails.size,
                        flavour: productDetails.flavour,
                        quantity: count,
                        price: productDetails.price,
                        salePrice: productDetails.salePrice,
                        offer: productDetails.offer,
                        image: productDetails.imageUrl[0],
                    },
                },
            }
        );

        return res.json({ status: true, message: "Cart Updated" });
    } catch (error) {
        console.error(error);
        return res.json({
            status: false,
            redirected: "/",
            message: "Product Sold Out",
        });
    }
});

// Removing a product from Cart
const deleteCartProduct = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        return res.json({ status: false, redirected: "/login" });
    }

    const cartProductID = req.body.cartProductID;
    const productID = req.body.productID;

    const cart = await CartData.findOne({ userID });

    // Removing the product completely from the cart
    await CartData.findOneAndUpdate(
        { userID, "products._id": cartProductID },
        {
            $pull: { products: { _id: cartProductID } },
        }
    );

    if (cart.products.length <= 1) {
        await CartData.findOneAndDelete({ userID });
    }

    return res.json({
        status: true,
        message: "Product Removed from Cart",
        redirected: "/cart",
    });
});

// Cart product quantity
const updateCartProductQuantity = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.json({ status: false, redirected: "/login" });
        }

        let originalPrice = 0;
        let totalPrice = 0;
        let totalSalePrice = 0;
        let totalDiscountAmount;
        let discountPrice = 0;

        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({ status: false, redirected: "/login" });
        }

        const productID = req.body.productID;
        let count = req.body.count;
        count = Number(count);
        let quantity = req.body.quantity;
        quantity = Number(quantity);
        let productQuantity;
        const productLimit = 4;
        const product = await ProductData.findById({ _id: productID });

        if (!product) {
            return res.json({
                status: false,
                message: "No product Found",
            });
        }

        let cart = await CartData.findOne({
            userID,
            products: { $elemMatch: { productID } },
        });

        const cartProductIndex = cart.products.findIndex(
            (prod) => prod.productID == productID
        );

        if (
            cart.products[cartProductIndex].quantity >= productLimit &&
            count === 1
        ) {
            return res.json({
                status: false,
                message: "Max Limit is Reached for the Product",
            });
        }
        if (cart.products[cartProductIndex].quantity === 1 && count === -1) {
            return res.json({
                status: false,
                message: "Minimum Limit is Reached for the Product",
            });
        }

        if (cartProductIndex !== -1) {
            if (product.quantities >= 1 && count == 1) {
                cart.products[cartProductIndex].quantity += count;
                await cart.save();
            } else if (count == -1) {
                cart.products[cartProductIndex].quantity += count;
                await cart.save();
            } else {
                return res.json({
                    status: false,
                    message: "Product Sold Out",
                });
            }
        }


        let coupons = await Promise.all(
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
        console.log(coupons);

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
                    totalDiscountAmount: {
                        $sum: { $subtract: ["$products.price", "$products.salePrice"] },
                    },
                },
            },
        ]);

        originalPrice = cartTotal[0].originalPrice;
        totalSalePrice = cartTotal[0].totalSalePrice;
        totalDiscountAmount = cartTotal[0].totalDiscountAmount;

        let deliveryCharge = 0;
        discountPrice = originalPrice - totalSalePrice;

        let couponDiscount = 0;
        let couponPrice = !coupons
            ? 0
            : coupons.reduce((acc, coupon) => {
                couponDiscount =
                    originalPrice >= coupon.existingCoupon.maxDiscount
                        ? coupon.existingCoupon.maxDiscount
                        : originalPrice * (1 - discountPercentage / 100);
                return acc + couponDiscount;
            }, 0);
        totalSalePrice -= couponPrice;

        let discountPercentage = (discountPrice / originalPrice) * 100;
        discountPercentage = Math.trunc(discountPercentage);
        let couponDiscountPercentage = Math.trunc(
            (couponPrice / originalPrice) * 100
        );
        console.log(`Coupon Discount Percentage: ${couponPrice}`);


        deliveryCharge = originalPrice >= 4500 ? 100 : 0;

        totalPrice = totalSalePrice + deliveryCharge;
        console.log(`Discount Percentage: ${discountPercentage}`);

        productQuantity = cart.products[cartProductIndex].quantity;

        return res.json({
            status: true,
            productQuantity,
            cartProductIndex,
            redirected: "/cart",
            discountPercentage,
            totalSalePrice,
            couponDiscountPercentage,
            discountPrice: discountPrice <= 0 ? 0 : -discountPrice,
            couponPrice: couponPrice <= 0 ? 0 : -couponPrice,
            totalPrice,
            originalPrice,
            deliveryCharge,
        });
    } catch (error) {
        console.error(error);
    }
});

// Apply Coupon
const applyCoupon = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        return res.json({ status: false, redirected: "/login" });
    }

    const couponCode = req.params.couponCode;
    const cart = await CartData.findOne({ userID }).lean();
    const isOfferexist = await CouponData.findOne({ code: couponCode }).lean();

    if (!isOfferexist) {
        return res.json({
            status: true,
            isCoupon: false,
            message: `Invalid coupon code`,
        });
    }

    if (!cart) {
        return res.json({
            status: false,
            message: `Cart not found`,
            redirected: '/cart'
        });
    }

    let totalPrice;

    let coupons = await Promise.all(
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
    console.log(coupons);

    if (isOfferexist && new Date() > isOfferexist.expiryDate) {
        return res.json({
            status: true,
            isCoupon: false,
            message: `Coupon code expired`,
        });
    }

    const existingCoupon = user.appliedCoupons.find(
        (coupon) =>
            coupon.cartID.toString() === cart._id.toString() &&
            coupon.couponID.toString() === isOfferexist._id.toString()
    );

    if (existingCoupon) {
        if (existingCoupon.limit < 1) {
            await UserData.findOneAndUpdate(
                {
                    _id: userID,
                    "appliedCoupons.cartID": cart._id,
                    "appliedCoupons.couponID": isOfferexist._id,
                },
                { $inc: { "appliedCoupons.$.limit": 1 } }
            );
            return res.json({
                status: true,
                isCoupon: true,
                message: ``,
                couponCode: isOfferexist.code,
                cartID: cart._id,
            });
        }


        return res.json({
            status: true,
            isCoupon: false,
            message: `Coupon in use`,
        });
    }

    const cartTotal = await CartData.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(cart._id),
                userID: new mongoose.Types.ObjectId(userID),
            },
        },
        {
            $unwind: "$products",
        },
        {
            $group: {
                _id: null,
                totalSalePrice: {
                    $sum: { $multiply: ["$products.quantity", "$products.salePrice"] },
                },
                originalPrice: {
                    $sum: { $multiply: ["$products.quantity", "$products.price"] },
                },
            },
        },
    ]);

    // new Coupon pushing to userDB
    await UserData.findByIdAndUpdate(userID, {
        $push: { appliedCoupons: { couponID: isOfferexist._id, cartID: cart._id } },
    });

    let originalPrice = cartTotal[0].originalPrice;
    let totalSalePrice = cartTotal[0].totalSalePrice;

    let couponDiscount = 0;
    let existingCouponPrice = !coupons
        ? 0
        : coupons.reduce((acc, coupon) => {
            couponDiscount =
                originalPrice >= coupon.existingCoupon.maxDiscount
                    ? coupon.existingCoupon.maxDiscount
                    : originalPrice * (1 - discountPercentage / 100);
            return acc + couponDiscount;
        }, 0);

    let couponPrice =
        originalPrice >= isOfferexist.maxDiscount
            ? isOfferexist.maxDiscount
            : originalPrice * (1 - discountPercentage / 100);

    let couponDiscountPrice = couponPrice + existingCouponPrice;
    totalSalePrice = totalSalePrice - couponDiscountPrice;

    // Delivery Charge
    deliveryCharge = originalPrice >= 4500 ? 100 : 0;

    totalPrice = totalSalePrice + deliveryCharge;

    let discountPrice = originalPrice - totalSalePrice;

    let discountPercentage = Math.trunc((discountPrice / originalPrice) * 100);
    let couponDiscountPercentage = Math.trunc(
        (couponDiscountPrice / originalPrice) * 100
    );
    console.log(couponDiscountPercentage);

    //  console.log(`Total Sale Price: ${totalSalePrice}`);
    //  console.log(`%: ${discountPercentage} && Amount: ${discountAmount}`)

    return res.json({
        status: true,
        isCoupon: true,
        message: ``,
        couponCode: isOfferexist.code,
        cartID: cart._id,
        totalPrice,
        coupons,
        couponDiscountPercentage:
            couponDiscountPercentage == null ? 0 : couponDiscountPercentage,
        couponDiscountPrice: couponDiscountPrice <= 0 ? 0 : -couponDiscountPrice,
    });
});


// Remove Coupon
const removeCoupon = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({ status: false, redirected: "/login" });
    }
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        return res.json({ status: false, redirected: "/login" });
    }

    const { couponCode, cartID } = req.params;
    const cart = await CartData.findOne({ userID: userID }).lean();
    if (!cart) {
        return res.json({
            status: false,
            message: `Cart not found`,
            redirected: '/cart'
        });
    }
    const couponToRemove = await CouponData.findOne({ code: couponCode });
    let totalPrice = 0;

    let coupons = await Promise.all(
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
    console.log(coupons);

    const cartTotal = await CartData.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(cart._id),
                userID: new mongoose.Types.ObjectId(userID),
            },
        },
        {
            $unwind: "$products",
        },
        {
            $group: {
                _id: null,
                totalSalePrice: {
                    $sum: { $multiply: ["$products.quantity", "$products.salePrice"] },
                },
                originalPrice: {
                    $sum: { $multiply: ["$products.quantity", "$products.price"] },
                },
            },
        },
    ]);

    let originalPrice = cartTotal[0].originalPrice;
    let totalSalePrice = cartTotal[0].totalSalePrice;

    let discountAmount = originalPrice - totalSalePrice;

    let couponDiscount = 0;
    let existingCouponPrice = !coupons
        ? 0
        : coupons.reduce((acc, coupon) => {
            couponDiscount =
                originalPrice >= coupon.existingCoupon.maxDiscount
                    ? coupon.existingCoupon.maxDiscount
                    : originalPrice * (1 - discountPercentage / 100);
            return acc + couponDiscount;
        }, 0);

    let priceTodeduct =
        originalPrice >= couponToRemove.maxDiscount
            ? couponToRemove.maxDiscount
            : originalPrice * (1 - discountPercentage / 100);

    console.log(priceTodeduct);

    let couponDiscountPrice = existingCouponPrice - priceTodeduct;
    totalSalePrice = totalSalePrice - couponDiscountPrice;

    let discountPercentage = Math.trunc((discountAmount / originalPrice) * 100);
    let couponDiscountPercentage = Math.trunc(
        (couponDiscountPrice / originalPrice) * 100
    );


    deliveryCharge = originalPrice >= 3500 ? 100 : 0;

    totalPrice = totalSalePrice + deliveryCharge;

    await UserData.findOneAndUpdate(
        {
            _id: userID,
            "appliedCoupons.cartID": cart._id,
            "appliedCoupons.couponID": couponToRemove._id,
        },
        {
            $pull: {
                appliedCoupons: { cartID: cart._id, couponID: couponToRemove._id },
            },
        }
    );

    return res.json({
        status: true,
        isCoupon: true,
        message: `coupon removed`,
        originalPrice,
        totalPrice,
        couponDiscountPrice,
        couponDiscountPercentage,
        discountPercentage,
        discountAmount,
    });
});



module.exports = {
    myCart,
    addToCart,
    deleteCartProduct,
    updateCartProductQuantity,
    applyCoupon,
    removeCoupon
}