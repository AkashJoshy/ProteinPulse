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

        // Price deducted from Original Price
        discountPrice = originalPrice - totalSalePrice;

        // Discount Percentage (Price deducted from OG price)
        let discountPercentage = (discountPrice / originalPrice) * 100;
        discountPercentage = Math.trunc(discountPercentage);

        // Delivery Charge
        deliveryCharge = originalPrice >= 4500 ? 100 : 0;

        // Total Amount (includes delivery charge too)
        totalPrice = totalSalePrice + deliveryCharge;
        const productDetails = await CartData.find({})
            .populate("products.productID")
            .lean();

        // If any Coupons has been applied by User
        //  console.log(typeof user.appliedCoupons)
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

            // Coupon Offer applying if the user has Apply any
            couponPrice = !coupons
                ? 0
                : coupons.reduce((acc, coupon) => {
                    couponDiscount =
                        originalPrice >= coupon.existingCoupon.maxDiscount
                            ? coupon.existingCoupon.maxDiscount
                            : originalPrice * (1 - discountPercentage / 100);
                    return acc + couponDiscount;
                }, 0);

            // then Deduct the Coupon price from Total Sale Price
            totalPrice -= couponPrice;
            // Coupon Discount Percentage
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

        // New Cart creation for the user
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

            // Cart Product Increment
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

        // Coupon applied by User
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

        originalPrice = cartTotal[0].originalPrice;
        totalSalePrice = cartTotal[0].totalSalePrice;
        totalDiscountAmount = cartTotal[0].totalDiscountAmount;

        let deliveryCharge = 0;
        discountPrice = originalPrice - totalSalePrice;

        // Coupon Offer applying
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

        // Discount Percentage
        let discountPercentage = (discountPrice / originalPrice) * 100;
        discountPercentage = Math.trunc(discountPercentage);
        let couponDiscountPercentage = Math.trunc(
            (couponPrice / originalPrice) * 100
        );
        console.log(`Coupon Discount Percentage: ${couponPrice}`);

        // Delivery Charge
        deliveryCharge = originalPrice >= 4500 ? 100 : 0;

        // Total Amount (includes delivery charge too)
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
        const err = new Error("User not Found")
        const redirectPath = "/login";
        return next({ error: err, redirectPath });
    }

    const couponCode = req.params.couponCode;
    const isOfferexist = await CouponData.findOne({ code: couponCode }).lean();
    const cart = await CartData.findOne({ userID }).lean();
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

    // If the code is Invalid
    if (!isOfferexist) {
        return res.json({
            status: true,
            isCoupon: false,
            message: `Invalid coupon code`,
        });
    }

    // Checking the coupon is Expired
    if (isOfferexist && new Date() > isOfferexist.expiryDate) {
        return res.json({
            status: true,
            isCoupon: false,
            message: `Coupon code expired`,
        });
    }

    // Is coupon used by User
    const existingCoupon = user.appliedCoupons.find(
        (coupon) =>
            coupon.cartID.toString() === cart._id.toString() &&
            coupon.couponID.toString() === isOfferexist._id.toString()
    );
    // If the Coupon is already existing in the UserDB coupons list
    if (existingCoupon) {
        // checking the limit
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

        // If the limit is exceeded
        return res.json({
            status: true,
            isCoupon: false,
            message: `Coupon in use`,
        });
    }

    // Offer applying Total Cart Amount
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

    // applying coupon offer
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

    // Discount Price
    let discountPrice = originalPrice - totalSalePrice;

    // Discount Percentage
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
        const err = new Error("User not Found")
        const redirectPath = "/login";
        return next({ error: err, redirectPath });
    }

    const { couponCode, cartID } = req.params;
    const cart = await CartData.findOne({ userID: userID }).lean();
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

    // Cart Total
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

    // Getting OG price and sales price
    let originalPrice = cartTotal[0].originalPrice;
    let totalSalePrice = cartTotal[0].totalSalePrice;

    // Discount Amount
    let discountAmount = originalPrice - totalSalePrice;

    // applying coupon offer
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

    // Price of the coupon to reduct from applied coupon price
    let priceTodeduct =
        originalPrice >= couponToRemove.maxDiscount
            ? couponToRemove.maxDiscount
            : originalPrice * (1 - discountPercentage / 100);

    console.log(priceTodeduct);

    let couponDiscountPrice = existingCouponPrice - priceTodeduct;
    totalSalePrice = totalSalePrice - couponDiscountPrice;
    // Discount Percentage
    let discountPercentage = Math.trunc((discountAmount / originalPrice) * 100);
    let couponDiscountPercentage = Math.trunc(
        (couponDiscountPrice / originalPrice) * 100
    );

    // Delivery Charge
    deliveryCharge = originalPrice >= 3500 ? 100 : 0;

    totalPrice = totalSalePrice + deliveryCharge;

    // Pulling coupon from applied Coupons
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