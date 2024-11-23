const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const cartTotalPrice = require('../utils/cartTotalPriceHelper')
const { UserData } = require('../models/userDB')
const { ProductData } = require('../models/productDB')
const { CartData } = require('../models/cartDB')
const { OfferData } = require('../models/OfferDB')
const { CouponData } = require('../models/CouponDB')


// User Cart
const myCart = asyncHandler(async (req, res, next) => {
    try {
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        let {
            cart,
            discountPercentage,
            totalSalePrice,
            originalPrice,
            discountPrice,
            deliveryCharge,
            totalPrice,
            validoffers,
            coupons,
            couponDiscountPrice,
            couponDiscountPercentage,
        } = await cartTotalPrice(userID)

        res.render("user/view-my-cart", {
            auth: true,
            user: req.session.user,
            cart,
            originalPrice,
            discountPercentage,
            totalSalePrice,
            discountPrice,
            totalPrice,
            deliveryCharge,
            coupons,
            validoffers,
            couponDiscountPrice,
            couponDiscountPercentage,
            loginErr: req.session.errMessage,
        });
        req.session.errMessage = false;
    } catch (error) {
        const err = new Error("Oops... Something Went Wrong")
        return next({ error: err, message: err })
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
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});

// Removing a product from Cart
const deleteCartProduct = asyncHandler(async (req, res, next) => {
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

        const cartProductID = req.body.cartProductID;
        const productID = req.body.productID;
        const cart = await CartData.findOne({ userID });

        if (!cart) {
            return res.json({
                status: false,
                message: "No cart found!",
                redirected: "/cart",
            });
        }

        await CartData.findOneAndUpdate(
            { userID, "products._id": cartProductID },
            {
                $pull: { products: { _id: cartProductID } },
            }
        );

        if (cart.products.length <= 1) {
            console.log(`Cart Deleted`)
            if (user.appliedCoupons.length >= 1) {
                console.log(`Applied Coupons are available`)
                await UserData.findByIdAndUpdate({ _id: userID },
                    { $pull: { appliedCoupons: { cartID: cart._id } } }
                )
            }
            await CartData.findOneAndDelete({ userID });
            return res.json({
                status: true,
                message: "Cart is empty",
                redirected: "/cart",
            });
        }

        return res.json({
            status: true,
            message: "Product Removed from Cart",
            redirected: "/cart",
        });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }

});

// Cart product quantity
const updateCartProductQuantity = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.json({ status: false, redirected: "/login" });
        }
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            return res.json({ status: false, redirected: "/login" });
        }

        const productID = req.body.productID;
        const product = await ProductData.findById({ _id: productID })

        if (!product) {
            return res.json({
                status: false,
                message: "No product Found!",
            });
        }

        let isCart = await CartData.findOne({
            userID,
            'products.productID': productID
        });

        if (!isCart) {
            return res.json({
                status: false,
                message: "No cart Found!",
            });
        }

        let count = req.body.count;
        count = Number(count);
        let quantity = req.body.quantity;
        quantity = Number(quantity);
        let productQuantity;
        const productLimit = 4;


        const cartProductIndex = isCart.products.findIndex(
            (prod) => prod.productID == productID
        );

        if (
            isCart.products[cartProductIndex].quantity >= productLimit &&
            count === 1
        ) {
            return res.json({
                status: false,
                message: "Max Limit is Reached for the Product",
            });
        }
        if (isCart.products[cartProductIndex].quantity === 1 && count === -1) {
            return res.json({
                status: false,
                message: "Minimum Limit is Reached for the Product",
            });
        }

        if (cartProductIndex !== -1) {
            if (product.quantities >= 1 && count == 1) {
                isCart.products[cartProductIndex].quantity += count;
                await isCart.save();
            } else if (count == -1) {
                isCart.products[cartProductIndex].quantity += count;
                await isCart.save();
            } else {
                return res.json({
                    status: false,
                    message: "Product Sold Out",
                });
            }
        }

        let {
            // cart,
            discountPercentage,
            totalSalePrice,
            originalPrice,
            discountPrice,
            deliveryCharge,
            totalPrice,
            // validoffers,
            // coupons,
            couponDiscountPrice,
            couponDiscountPercentage,
        } = await cartTotalPrice(userID)

        productQuantity = isCart.products[cartProductIndex].quantity;

        console.log(`couponDiscountPrice: ${couponDiscountPrice}`)

        return res.json({
            status: true,
            productQuantity,
            cartProductIndex,
            redirected: "/cart",
            discountPercentage,
            totalSalePrice,
            couponDiscountPercentage,
            discountPrice: discountPrice <= 0 ? 0 : -discountPrice,
            couponDiscountPrice,
            totalPrice,
            originalPrice,
            deliveryCharge,
        });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});

// Apply Coupon
const applyCoupon = asyncHandler(async (req, res, next) => {
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
    
        // new Coupon pushing to userDB
        await UserData.findByIdAndUpdate(userID, {
            $push: { appliedCoupons: { couponID: isOfferexist._id, cartID: cart._id } },
        });
    
        let {
            totalPrice,
            coupons,
            couponDiscountPrice,
            couponDiscountPercentage,
        } = await cartTotalPrice(userID)
    
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
            couponDiscountPrice
        });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});


// Remove Coupon
const removeCoupon = asyncHandler(async (req, res, next) => {
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
    
        let {
            discountPercentage,
            originalPrice,
            discountPrice,
            totalPrice,
            couponDiscountPrice,
            couponDiscountPercentage,
        } = await cartTotalPrice(userID)
    
    
        return res.json({
            status: true,
            isCoupon: true,
            message: `coupon removed`,
            originalPrice,
            totalPrice,
            couponDiscountPrice,
            couponDiscountPercentage,
            discountPercentage,
            discountAmount: discountPrice,
        });
    } catch (error) {
        return res.json({
            message: "Oops Something went wrong",
            status: false,
            redirected: "/404",
        });
    }
});


module.exports = {
    myCart,
    addToCart,
    deleteCartProduct,
    updateCartProductQuantity,
    applyCoupon,
    removeCoupon
}