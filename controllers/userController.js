const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const { UserData } = require("../models/userDB");
const { CategoryData } = require("../models/categoryDB");
const { OtpData } = require("../models/otpDB");
const { ProductData } = require("../models/productDB");
const { CartData } = require("../models/cartDB");
const { ProductFeedback } = require("../models/productFeedbackDB");
const { AddressData } = require("../models/AddressDB");
const { OrderData } = require("../models/OrderDB");
const { OfferData } = require('../models/OfferDB')
const { WalletData } = require('../models/WalletDB')
const jwt = require("jsonwebtoken");
const passport = require("passport");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const moment = require("moment");
const invoiceGenerator = require('../utils/invoiceGeneratorHelper')
const { changePasswordOtpSent, verifyEmail } = require('../utils/userMailHelpers')
const { createHmac } = require("crypto");
const { CouponData } = require("../models/CouponDB");
const { v4: uuidv4 } = require("uuid");
const { getTopProducts, getTopCategories, getTopBrands } = require('../utils/topSellingHelper')
let generateOrderNumber = require("../utils/generateUniqueOrderNumberHelper");
let generateReferralCode = require("../utils/generateReferralCodeHelper");
let generateTransactionID = require("../utils/generateUniqueTransactionIDHelper");
let cartTotalPrice = require("../utils/cartTotalPriceHelper");
let instance = require("../config/razorpay");
const { off } = require("process");
const path = require('path')
const fs = require('fs');
const { CarouselData } = require("../models/CarouselDB");
require("dotenv").config();

// Company Info
const email = process.env.COMPANY_GMAIL;
const password = process.env.COMPANY_PASS;
const transporterHost = process.env.TRANSPORTER_HOST;
const transporterPort = process.env.TRANSPORTER_PORT;

// Razorpay
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;


// Otp Generating
const otpGenerate = async () => {
  return Math.floor(1000 + Math.random() * 9000);
};

// setting Transporter for Sending mail to User('s)
let transporter = nodemailer.createTransport({
  host: transporterHost,
  port: transporterPort,
  secure: false,
  requireTLS: true,
  auth: {
    user: email,
    pass: password,
  },
});


// Otp Sending to Email
const userOtpSent = async (userID, otp) => {
  try {

    const user = await UserData.findById(userID);
    const mailOptions = {
      from: email,
      to: user.email,
      subject: "OTP Verification Mail",
      html: `<p>Hii, ${user.firstName} ${user.lastName}, 
          Your Otp is ${otp}
          </p>`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`OTP has been send: ${info.response}`);
      }
    });
  } catch (error) {
    console.error(error);
  }
};


// Password Hashing
async function passwordHashing(password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return hashedPassword;
}

// Hashed Password Comparing
async function hashedPasswordComparing(password, userPassword) {
  const hashedPassword = await bcrypt.compare(password, userPassword);
  return hashedPassword;
}

//  User Home Page
const homePage = asyncHandler(async (req, res, next) => {
  try {
    const topProducts = getTopProducts()
    const topCategories = getTopCategories()
    const topBrands = getTopBrands()

    const categories = await CategoryData.find({ isActive: true }).lean();
    const carousels = await CarouselData.find({ isActive: true }).lean()

    if (req.user) {
      let user = await UserData.findOneAndUpdate(
        { email: req.user.email },
        { $set: { isVerified: true } },
        { new: true }
      );
      req.session.user = user;
    }

    res.render("user/home-page", {
      auth: true,
      categories,
      user: req.session.user,
      topProducts,
      topCategories,
      topBrands,
      carousels,
      errMessage: req.session.errMessage
    });
    req.session.errMessage = false
    return
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

// view login page
const Login = asyncHandler(async (req, res, next) => {
  try {
    res.render("user/login-page", {
      loginErr: req.session.errMessage,
      loginSuccess: req.session.userSuccess,
    });
    req.session.errMessage = false;
    req.session.userSuccess = false;
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

// login
const doLogin = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await UserData.findOne({ email: email, isAdmin: false });
    if (user) {
      const matchedPassword = await bcrypt.compare(password, user.password);
      if (matchedPassword) {
        if (!user.isVerified) {
          await verifyEmail(user._id);
          req.session.userSuccess =
            "User is Not Verified, OTP has been Send To the Email";
          return res.redirect("/login");
        }
        if (user.isBlocked) {
          const error = new Error("User is Blocked");
          const redirectPath = "/login";
          return next({ error, redirectPath });
        } else {
          req.session.user = user;
          res.redirect("/");
        }
      } else {
        const error = new Error("Credentials is Incorrect");
        const redirectPath = "/login";
        return next({ error, redirectPath });
      }
    } else {
      const error = new Error("No User is Found!");
      const redirectPath = "/login";
      return next({ error, redirectPath });
    }
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

// Google login
const googleLogin = passport.authenticate("google", {
  scope: ["email", "profile"],
});

// Google Login CB
const googleCallback = passport.authenticate("google", {
  successRedirect: "/",
  failureRedirect: "/login",
});

// view sign up page
const signup = asyncHandler(async (req, res, next) => {
  res.render("user/signup-page", { loginMessage: req.session.loginMessage });
  req.session.loginMessage = false;
});

// User Sign Up
const doSignup = asyncHandler(async (req, res, next) => {
  try {
    let { firstName, lastName, email, password, mobileNumber, referralCode } =
      req.body;
    let existedUser = await UserData.findOne({ email: email });

    if (existedUser) {
      const error = new Error("User is Already existed");
      const redirectPath = "/signup";
      return next({ error, redirectPath });
    } else {
      let referredUser
      if (referralCode) {
        referredUser = await UserData.findOne({ referralCode: referralCode })
      }
      let walletBalance = referredUser !== undefined ? 50 : 0

      let referredBy
      if (referredUser) {
        referredBy = referredUser._id
        let transactionID = await generateTransactionID(referredBy)
        await WalletData.findOneAndUpdate(
          { userID: referredBy },
          {
            $inc: { balance: 100 },
            $push:
            {
              transactions: {
                amount: 100,
                transactionID,
                transactionType: 'referral',
                paymentType: 'Referral',
                description: 'Referral amount credited',
                status: 'Success',
              }
            }
          }
        )
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const codeReferral = await generateReferralCode();
      const user = await UserData.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        mobileNumber,
        referralCode: codeReferral,
        referredBy: referralCode ? referredBy : "",
      });

      if (walletBalance <= 0) {
        await WalletData.create({
          userID: user._id,
          balance: walletBalance,
          transactions: [{
            amount: walletBalance,
            transactionType: 'referral',
            paymentType: 'Referral',
            description: 'The Referral amount credited',
            status: 'Success',
          }]
        })
      } else {
        // await WalletData.create({
        //   userID: user._id,
        //   balance: walletBalance,
        //   transactions: [{
        //     amount: walletBalance,
        //     transactionType: 'referral',
        //     paymentType: 'Referral',
        //     description: 'The Referral amount credited',
        //     status: 'Success',
        //   }]
        // })
      }

      await verifyEmail(user._id);
      req.session.loginMessage =
        "User Registration successfully, Please verify Email";
      return res.redirect("/signup");
    }
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

// email verification
const emailVerify = asyncHandler(async (req, res, next) => {
  try {
    const token = req.query.uniqueID;
    const resend = req.query.otp;

    if (!token) {
      return res.status(400).send(`Verification Token is Required`);
    }

    let user = await UserData.findOne({ verificationToken: token });


    if (!user) {
      return res.status(400).send("Invalid Verification Token.");
    }


    if (
      user.verificationTokenExpires &&
      Date.now() > user.verificationTokenExpires
    ) {
      return res.status(400).send("Verification Token has expired..");
    }

    if (user) {
      const otp = await otpGenerate();
      let expiresAt = Date.now() + 30 * 60 * 1000;
      if (resend == 0) {
        await OtpData.create({
          userID: user._id,
          otp,
          expiresAt: Date.now() + 10 * 60 * 1000
        });

        await userOtpSent(user._id, otp, expiresAt);

        res.render("user/signup-otp-page", {
          userID: user._id,
          errMessage: req.session.errMessage,
          token,
        });
        req.session.errMessage = false;
        return;
      }

      const userOtp = await OtpData.findOne({ userID: user._id }).sort({
        createdAt: -1,
      });
      if (userOtp && Date.now() < userOtp.expiresAt) {
        res.render("user/signup-otp-page", {
          userID: user._id,
          errMessage: req.session.errMessage,
          token,
        });
        req.session.errMessage = false;
        return;
      }

      await OtpData.create({
        userID: user._id,
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      await userOtpSent(user._id, otp, expiresAt);

      res.render("user/signup-otp-page", {
        userID: user._id,
        errMessage: req.session.errMessage,
        token,
      });
      req.session.errMessage = false;
    }
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

// OTP signup resend
const resendOtp = asyncHandler(async (req, res, next) => {
  let token = req.query.uniqueID
  if (!token) {
    return res.status(400).send(`Verification Token is Required`);
  }
  try {
    let user = await UserData.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).send("Invalid Verification Token.");
    }

    if (
      user.verificationTokenExpires &&
      Date.now() > user.verificationTokenExpires
    ) {
      return res.status(400).send("Token has expired..., try getting new verification link ");
    }

    const otp = await otpGenerate();

    await OtpData.create({
      userID: user._id,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    await userOtpSent(user._id, otp);

    return res.json({ status: true, message: "otp resend successfully" })
  } catch (error) {
    console.error(error)
  }

})

const otpVerify = asyncHandler(async (req, res, next) => {

  const token = req.body.uniqueID;
  let userOtp = req.body.userOtp;
  const user = await UserData.findOne({ verificationToken: token });

  if (!user) {
    return res.json({ status: false, message: `User is not Found!`, redirected: `/login` });
  }

  let generatedOtp = await OtpData.findOne({ userID: user._id }).sort({
    createdAt: -1,
  });

  if (generatedOtp.otp == userOtp) {
    await UserData.findByIdAndUpdate(
      { _id: user._id },
      {
        $set: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        },
      }
    );
    await OtpData.deleteMany({ userID: user._id });

    return res.json({ status: true, redirected: '/login', message: 'OTP validated' })
  } else {
    return res.json({ status: false, message: `Incorrect Otp` })
  }
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  res.render("user/forgot-password", {
    userErr: req.session.errMessage,
    userSuccess: req.session.userSuccess,
  });
  req.session.errMessage = false;
  req.session.userSuccess = false;
});

const checkEmailForPassword = asyncHandler(async (req, res, next) => {
  try {
    let { email } = req.body;
    email = email.trim();
    let user = await UserData.findOne({ email: email });

    if (!user) {
      const error = new Error("No User Found! Try another Email");
      const redirectPath = "/forgot-password";
      return next({ error, redirectPath });
    }

    if (user.isBlocked) {
      const error = new Error("User is Blocked");
      const redirectPath = "/forgot-password";
      return next({ error, redirectPath });
    }

    if (!user.isVerified) {
      const error = new Error(
        "Email is not verified yet! Please Verify it First"
      );
      const redirectPath = "/forgot-password";
      return next({ error, redirectPath });
    }

    await changePasswordOtpSent(user._id)
    req.session.userSuccess = "Password reset link is sent to your Email";
    res.redirect("/login");
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const userID = req.query.userID;
  let user = await UserData.findById({ _id: userID }).lean();
  res.render("user/reset-password", { user });
});

// forgot password
const recoveredPassword = asyncHandler(async (req, res, next) => {
  try {
    const { newPassword, confirmPassword, userID } = req.body;
    if (newPassword == confirmPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserData.findByIdAndUpdate(
        { _id: userID },
        { $set: { password: hashedPassword } }
      );
      return res.redirect("/login");
    } else {
      req.session.passwordErr = "Password Doesn't Match";
      return res.redirect("/reset-password");
    }
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

// Brands
const getBrands = asyncHandler(async (req, res) => {
  try {

    const userID = req.session.user._id
    const user = await UserData.findById(userID).lean()
    let brands = [`BPI Sports`,
      `Dragon Pharma`,
      `Dymatize`,
      `BNC`,
      `GNC`,
      `Muscleblaze`,
      `Muscle Science`,
      `One Science`,
      `Optimum Nutrition`,
      `QNT`,
      `Ritebite`,
    ]
    if (!user) {
      req.session.user = null;
      const err = new Error("User not Found")
      const redirectPath = "/login";
      return next({ error: err, redirectPath });
    }

    return res.render("user/view-brands", {
      auth: true,
      user,
      brands
    })
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
})

// Order cancel
const cancelOrder = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    const { orderID, orderUpdate } = req.body;
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
      req.session.user = null;
      const err = new Error("User not Found")
      const redirectPath = "/login";
      return next({ error: err, redirectPath });
    }
    let ordertotal = 0;

    const order = await OrderData.findById({ _id: orderID });
    const wallet = await WalletData.findOne({ userID })

    if (!order) {
      return res.json({ status: false, message: `No order Found`, redirected: "/user/dashboard/orders" });
    }

    if (!wallet) {
      return res.json({ status: false, message: `Wallet is missing from the account`, redirected: "/user/dashboard/orders" });
    }

    if (order.paymentStatus === 'Paid') {
      ordertotal = order.totalPrice

      let transactionID = await generateTransactionID(userID)
      await WalletData.findOneAndUpdate({ userID }, {
        $push: {
          transactions:
          {
            transactionID,
            amount: ordertotal,
            transactionType: "credit",
            paymentType: 'Wallet',
            description: 'Amount credited for product cancellation',
            status: 'Success',
          }
        }

      })
    }

    for (const prod of order.products) {
      let quantity = Number(prod.quantity);
      await ProductData.findByIdAndUpdate(prod.productID, {
        $inc: { quantities: quantity },
        $inc: { totalSales: -quantity }
      });
    }


    await OrderData.findByIdAndUpdate(
      { _id: orderID },
      {
        $set: { status: orderUpdate },
      }
    );

    return res.json({ status: true, message: "Your order has been Cancelled", redirected: '/user/dashboard/orders' });
  } catch (error) {
    return res.json({
      message: "Oops Something went wrong",
      status: false,
      redirected: "/404",
    });
  }
});


// Cancel Product(single product in the Order)
const cancelProduct = asyncHandler(async (req, res, next) => {
  if (!req.session.user) {
    return res.json({ status: false, redirected: "/login" });
  }
  try {

    let totalPrice = 0;
    let originalPrice = 0;
    let deliveryFee = 0;
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();
    const { orderID, productID } = req.body;

    if (!user) {
      req.session.user = null;
      return res.json({ status: false, redirected: "/login" });
    }

    let isOrderCancelled = false;
    let order = await OrderData.findById({ _id: orderID }).lean()

    if (!order) {
      return res.json({ status: false, message: `No order found` });
    }


    let orderProduct = await Promise.all(
      order.products.filter((prod) => {
        if (prod.productID.toString() === productID) {
          return prod;
        }
      })
    );


    if (!orderProduct) {
      return res.json({ status: false, message: `No product found!..` });
    }

    let updatedOrder = await OrderData.findOneAndUpdate(
      { _id: orderID, "products.productID": productID },
      { $set: { "products.$.status": "Cancelled", deliveryFee: deliveryFee } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.json({ status: false, message: `No product found!..` });
    }

    let walletAmount
    if (updatedOrder.paymentMethod == 'Razorpay' || updatedOrder.paymentMethod == 'myWallet') {

      let productStock = updatedOrder.products.reduce((acc, product) => {
        acc += product.quantity
        return acc
      }, 0)

      walletAmount = productStock <= 3 ? updatedOrder.totalSalePrice / 2 : updatedOrder.totalSalePrice

      let paymentType = updatedOrder.paymentMethod
      const transactionID = await generateTransactionID(userID)
      walletAmount = Number(walletAmount)
      const wallet = await WalletData.findOneAndUpdate(
        { userID: userID },
        {
          $inc: { balance: walletAmount },
          $push:
          {
            transactions:
            {
              transactionID,
              amount: walletAmount,
              transactionType: 'credit',
              paymentType: paymentType,
              description: "Amount credited for product cancellation",
              status: "Success"
            }
          }
        }
      )
    }

    let cancelledProduct = updatedOrder.products.filter(
      (prod) => prod.productID.toString() === productID
    );
    let productStatus = cancelledProduct[0].status;

    let isOrderCancel = updatedOrder.products.every(
      (prod) => prod.status === "Cancelled"
    );

    if (isOrderCancel) {
      order = await OrderData.findByIdAndUpdate(
        { _id: orderID },
        {
          $set: { status: "Cancelled" },
          $push: {
            orderActivity: {
              orderStatus: "Cancelled",
              message: "Your order has been cancelled",
            },
          },
        },
        { new: true }
      );

      isOrderCancelled = true;
    }

    const orderTotal = await OrderData.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(orderID),
          userID: new mongoose.Types.ObjectId(userID),
        },
      },
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.status": { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          originalPrice: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
          totalPrice: {
            $sum: { $multiply: ["$products.quantity", "$products.salePrice"] },
          },
          deliveryFee: { $first: "$deliveryFee" },
        },
      },
      {
        $project: {
          _id: 0,
          originalPrice: 1,
          totalPrice: 1,
          deliveryFee: 1,
        },
      },
    ]);

    originalPrice = (orderTotal[0] && orderTotal[0].originalPrice) || 0;
    totalPrice = (orderTotal[0] && orderTotal[0].totalPrice) || 0;
    deliveryFee = (orderTotal[0] && orderTotal[0].deliveryFee) || 0;


    deliveryFee = originalPrice >= 4500 ? 100 : 0;
    totalPrice += deliveryFee;

    let isValidCoupon;
    let couponPrice = 0;
    let coupons = await Promise.all(
      order.coupons.map(async (coupon) => {
        isValidCoupon = await CouponData.findOne({ code: coupon.code });

        if (isValidCoupon) {
          return originalPrice >= isValidCoupon.minOrderValue
            ? isValidCoupon
            : null;
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
          originalPrice >= coupon.maxDiscount
            ? coupon.maxDiscount
            : originalPrice * (1 - discountPercentage / 100);
        return acc + couponDiscount;
      }, 0);

    totalPrice -= couponPrice;

    let productQuantity = orderProduct[0].quantity;

    await ProductData.findByIdAndUpdate({ _id: productID },
      {
        $inc: { quantities: productQuantity },
        $inc: { totalSales: -productQuantity }
      }
    )

    await OrderData.findByIdAndUpdate(
      { _id: orderID },
      { $set: { totalPrice: totalPrice } }
    );

    return res.json({
      status: true,
      productStatus,
      totalPrice,
      order,
      orderActivity: order.orderActivity,
      isOrderCancelled,
    });
  } catch (error) {
    return res.json({
      message: "Oops Something went wrong",
      status: false,
      redirected: "/404",
    });
  }

});

const retryPayment = asyncHandler(async (req, res) => {
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

    const orderID = req.body.orderID
    const order = await OrderData.findById(orderID)
    let orderNumber = order.orderNumber

    if (!order) {
      return res.json({ status: false, message: `No order found`, redirected: '/user/dashboard/orders' });
    }

    let totalPrice = order.totalPrice
    totalPrice = Number(totalPrice)

    var options = {
      amount: totalPrice * 100,
      currency: "INR",
      receipt: orderNumber,
    };
    let razorpayOrder = await instance.orders.create(options);

    return res.json({ status: true, user, order: razorpayOrder, RAZORPAY_KEY_ID })
  } catch (error) {
    console.log(error)
    return res.json({
      message: "Oops Something went wrong",
      status: false,
      redirected: "/404",
    });
  }

})

// view categories
const categories = asyncHandler(async (req, res, next) => {
  try {
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
      req.session.user = null;
      const err = new Error("User not Found")
      const redirectPath = "/login";
      return next({ error: err, redirectPath });
    }

    const categoryName = req.params.categoryName;
    const category = await CategoryData.findOne({ name: categoryName })

    if (!category) {
      return res.redirect('/')
    }

    const products = await ProductData.find({ quantities: { $gt: 0 }, categoryName }).lean();

    res.render("user/categories-page", {
      auth: true,
      categoryName,
      products,
      user: req.session.user,
    });
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});


// Order Checkout
const orderPreCheckout = asyncHandler(async (req, res, next) => {
  try {
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
      req.session.user = null;
      const err = new Error("User not Found")
      const redirectPath = "/login";
      return next({ error: err, redirectPath });
    }

    const cartID = req.body.cartID;
    const address = await AddressData.findOne({ userID }).lean();
    const cart = await CartData.findOne({ _id: cartID, userID }).lean();

    if (!cart) {
      const error = new Error("No cart found!");
      const redirectPath = "/cart";
      return next({ error, redirectPath });
    }

    if (cart.products.length <= 0) {
      const error = new Error("Cart is Empty");
      const redirectPath = "/cart";
      return next({ error, redirectPath });
    }

    let product
    for (const prod of cart.products) {
      product = await ProductData.findById({
        _id: prod.productID
      }).lean();


      if (!product) {
        const error = new Error(
          "Some products do not exist or were not found"
        );
        const redirectPath = "/cart";
        return next({ error, redirectPath });
      }

      if (prod.quantity > product.quantities) {
        const error = new Error(
          "The quantity of some products exceeds the available stock. Please adjust the quantities to match the available stock levels"
        );
        const redirectPath = "/cart";
        return next({ error, redirectPath });
      }
    }

    let {
      discountPercentage,
      totalSalePrice,
      originalPrice,
      discountPrice,
      deliveryCharge,
      totalPrice,
      coupons,
      couponDiscountPrice,
      couponDiscountPercentage,
    } = await cartTotalPrice(userID)


    // Tax calculation


    const wallet = await WalletData.findOne({ userID: userID }).lean()
    if (!wallet) {
      const error = new Error("Wallet is missing");
      const redirectPath = "/cart";
      return next({ error, redirectPath });
    }

    if (!address) {
      return res.render("user/view-checkout", {
        auth: true,
        products: cart.products,
        user: req.session.user,
        discountPercentage,
        totalSalePrice,
        discountPrice,
        totalPrice,
        coupons,
        couponDiscountPercentage,
        couponDiscountPrice,
        originalPrice,
        deliveryCharge,
        // taxPrice,
        wallet,
        cart,
        user,
      });
    }

    res.render("user/view-checkout", {
      auth: true,
      products: cart.products,
      user: req.session.user,
      discountPercentage,
      totalSalePrice,
      discountPrice,
      totalPrice,
      coupons,
      couponDiscountPercentage,
      couponDiscountPrice,
      deliveryCharge,
      originalPrice,
      // taxPrice,
      wallet,
      cart,
      user,
      address,
      billingAddress: address.billingAddress[0],
      shippingAddress: address.shippingAddress,
      errMessage: req.session.errMessage
    });
    req.session.errMessage = false;
    return
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});

// Order Checkout Page
const orderCheckout = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
      req.session.user = null;
      const err = new Error("User not Found")
      const redirectPath = "/login";
      return next({ error: err, redirectPath });
    }

    return res.render("user/post-checkout-page", {});
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});


// Download invoice
const downloadInvoice = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }

    const orderID = req.query.orderID
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();
    const order = await OrderData.findById(orderID).lean();
    const totalProducts = await ProductData.find().lean()

    if (!user) {
      req.session.user = null;
      return res.json({ status: false, redirected: '/login' })
    }

    if (!order) {
      return res.json({
        message: "No order found!",
        status: false,
        redirected: "/user/dashboard/orders",
      })
    }

    let fileName = invoiceGenerator(order)
    return res.json({
      status: true,
      fileName
    })

  } catch (error) {
    return res.json({
      message: "Oops Something went wrong",
      status: false,
      redirected: "/404",
    })
  }
})

// Order placing
const placeOrder = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }

    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();
    const totalProducts = await ProductData.find().lean()

    if (!user) {
      req.session.user = null;
      return res.json({ status: false, redirected: '/login' })
    }

    if (!totalProducts) {
      return res.json({ status: false, message: "No products Found" })
    }


    let {
      firstName,
      lastName,
      companyName,
      address,
      country,
      state,
      city,
      zipcode,
      email,
      mobileNumber,
      paymentMethod,
      shippingAddressID,
      orderNotes,
      cartID,
    } = req.body;

    if (shippingAddressID) {
      let isAddress = await AddressData.findOne({ 'shippingAddress._id': shippingAddressID })
      if (!isAddress) {
        return res.json({ status: false, message: "Select any other address" })
      }
    }

    let customer = user.firstName + " " + user.lastName;
    orderNotes = orderNotes == "" ? "Nill" : orderNotes;
    zipcode = Number(zipcode);
    mobileNumber = Number(mobileNumber);

    let {
      totalSalePrice,
      originalPrice,
      discountPrice,
      deliveryCharge,
      totalPrice,
      coupons,
    } = await cartTotalPrice(userID)

    console.log(`coupons`)
    console.log(coupons)
    let couponDetails = coupons.map(copn => {
      return {
        code: copn.existingCoupon.code,
        deductedPrice: copn.existingCoupon.maxDiscount
      }
    })

    console.log(couponDetails)

    const cart = await CartData.findById(cartID).lean()
    if (!cart) {
      return res.json({ status: false, message: "Cart is missing" })
    }

    for (const product of cart.products) {
      const prod = await ProductData.findById(product.productID)
      if (!prod) {
        return res.json({ status: false, message: "Product not found!" })
      }
    }

    if (paymentMethod == 'COD' && totalSalePrice >= 1000) {
      return res.json({
        status: false,
        message: "COD is available only for orders below ₹1000. Please choose another payment method"
      })
    }

    let products = cart.products.map((product) => {
      return { ...product, status: "Pending" };
    });

    if (paymentMethod == 'myWallet') {
      const wallet = await WalletData.findOne({ userID: userID })
      if (wallet.balance < totalPrice) {
        return res.json({ status: true, insuffient: true, message: `Wallet is Insuffient. Use Razorpay or COD` })
      }
    }

    let orderNumber = await generateOrderNumber();

    const userAddress = await AddressData.findOne({ userID }).lean();
    let orderAddress;

    if (shippingAddressID) {
      const addressData = await AddressData.aggregate([
        {
          $match: {
            userID: new mongoose.Types.ObjectId(userID),
          },
        },
        {
          $unwind: "$shippingAddress",
        },
        {
          $match: {
            "shippingAddress._id": new mongoose.Types.ObjectId(
              shippingAddressID
            ),
          },
        },
        {
          $project: { shippingAddress: 1, userID: 1 },
        },
      ]);

      orderAddress = addressData[0].shippingAddress;

    } else if (!userAddress) {
      orderAddress = {
        firstName,
        lastName,
        companyName,
        address,
        country,
        state,
        city,
        zipcode,
        mobileNumber,
      };
    } else {
      orderAddress = {
        address: address || orderAddress.address,
        country: country || orderAddress.country,
        state: state || orderAddress.state,
        city: city || orderAddress.city,
        zipcode: zipcode || orderAddress.zipcode,
        mobileNumber: mobileNumber || orderAddress.mobileNumber,
      };
    }

    let paymentStatus = paymentMethod === "COD" ? "Unpaid" : (paymentMethod == 'Razorpay' ? "Pending" : "Paid")
    let orderActivity = paymentMethod === 'Razorpay'
      ? {
        orderStatus: "Failed",
        message: "Your order is in Pending state."
      }
      : {
        orderStatus: "Pending",
        message: "Your order has been confirmed.",
      }

    const deliveryDay = 7;
    let currentDate = new Date();
    let expectedDate = moment(currentDate).add(deliveryDay, "days").toDate();

    let existingOrder = await OrderData.findOne({ cartID });
    let newOrder
    if (existingOrder) {
      newOrder = await OrderData.findByIdAndUpdate(
        { _id: existingOrder._id },
        {
          $set: {
            // orderNumber: orderNumber,
            address: orderAddress,
            originalPrice,
            totalPrice,
            totalSalePrice,
            deliveryCharge,
            discountPrice,
            paymentStatus,
            paymentMethod,
            orderNote: orderNotes,
            coupons,
            products,
            expectedDate
          },
        },
        { new: true }
      );
    } else {
      newOrder = await OrderData.create({
        orderNumber,
        userID,
        cartID,
        customer,
        address: orderAddress,
        paymentStatus,
        paymentMethod,
        originalPrice,
        totalPrice,
        totalSalePrice,
        orderNote: orderNotes,
        deliveryCharge,
        discountPrice,
        orderActivity: [
          orderActivity
        ],
        coupons,
        products,
        expectedDate,
      })
    }

    if (paymentMethod == "Razorpay") {
      totalPrice = Number(totalPrice);
      var options = {
        amount: totalPrice * 100,
        currency: "INR",
        receipt: orderNumber,
      };
      let razorpayOrder = await instance.orders.create(options);

      return res.json({
        status: true,
        razorpayStatus: true,
        order: razorpayOrder,
        RAZORPAY_KEY_ID,
        user,
      });
    }

    if (paymentMethod == 'myWallet') {
      console.log(`Working`)
      const transactionID = await generateTransactionID(userID)
      let debitingAmount = -Number(totalPrice)
      await WalletData.findOneAndUpdate(
        { userID: userID },
        {
          $inc: { balance: debitingAmount },
          $push:
          {
            transactions:
            {
              transactionID,
              amount: totalPrice,
              transactionType: 'debit',
              paymentType: 'Wallet',
              description: "Amount debited for the order",
              status: "Success"
            }
          }
        }
      )

    }

    const couponsID = await Promise.all(
      coupons.map(async (coupn) => {
        return await CouponData.findOne({ code: coupn.existingCoupon.code })
      })
    )

    let userAppliedCoupons
    if (couponsID.length > 0) {
      userAppliedCoupons = await Promise.all(
        couponsID.map(async (coupn) => {
          let existedCoupon = await UserData.findOne({ _id: userID, 'coupons.couponID': coupn._id })

          if (existedCoupon) {
            await UserData.findOneAndUpdate({ _id: userID, 'coupons.couponID': coupn._id },
              {
                $inc: { 'coupons.$.limit': 1 },
                $pull: { appliedCoupons: { couponID: coupn._id } },
              }
            )

          } else {
            await UserData.findByIdAndUpdate({ _id: userID },
              {
                $push: { coupons: { couponID: coupn._id } },
                $pull: { appliedCoupons: { couponID: coupn._id } },
              }
            )
          }
        })
      )
    }

    for (const prod of cart.products) {
      let quantity = -Number(prod.quantity)
      await ProductData.findByIdAndUpdate(prod.productID, {
        $inc: { quantities: quantity, totalSales: 1 }
      })
    }

    await CartData.findByIdAndDelete({ _id: cartID });

    return res.json({
      status: true,
      codStatus: true,
      redirected: "/order-checkout",
    });
  } catch (error) {
    console.log(error)
    return res.json({
      message: "Oops Something went wrong",
      status: false,
      redirected: "/404",
    });
  }
});

// Order place - Razorpay
const placeOrderRazorpay = asyncHandler(async (req, res, next) => {
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

  const cartID = req.body.cartID;
  const cart = await CartData.findById({ _id: cartID });

  // Cart Total
  const cartTotal = await CartData.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(cartID) },
    },
    {
      $unwind: "$products",
    },
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

  let originalPrice = cartTotal[0].originalPrice;
  let totalSalePrice = cartTotal[0].totalSalePrice;

  const orderNumber = await generateOrderNumber();

  if (req.body.paymentMethod === "Razorpay") {
    const razorpayInstance = await instance.orders.create({
      amount: totalSalePrice * 100,
      currency: "INR",
      receipt: orderNumber,
    });

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

    return res.json({ status: true, order: razorpayInstance, RAZORPAY_KEY_ID });
  }
});

// Verify payment (Razorpay)
const verifyPaymentRazorpay = asyncHandler(async (req, res, next) => {
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

    const { razorpay, order } = req.body;

    const secretKey = process.env.RAZORPAY_SECRET_KEY;
    if (!secretKey) {
      return res.json({ success: false, message: "Internal server error" });
    }

    // hashing the razorpayOrderID and razorpayPaymentID with secretKey into SHA256
    let hash = createHmac("sha256", secretKey).update(
      razorpay.razorpay_order_id + "|" + razorpay.razorpay_payment_id
    );

    let generatedSignature = hash.digest("hex");

    if (generatedSignature == razorpay.razorpay_signature) {
      const orderDetails = await OrderData.findOneAndUpdate(
        { orderNumber: order.receipt },
        { $set: { paymentStatus: "Paid" } }
      );

      const cart = await CartData.findById({ _id: orderDetails.cartID })
      if (!cart) {
        return res.json({
          status: true,
          success: false,
          redirected: "/cart",
        });
      }

      for (const prod of cart.products) {
        let quantity = -Number(prod.quantity);
        let count = Number(prod.quantity)
        await ProductData.findByIdAndUpdate(prod.productID, {
          $inc: { quantities: quantity },
          $inc: { totalSales: count }
        });
      }

      const isPendingExists = orderDetails.orderActivity.some(activity => activity.orderStatus === 'Pending');

      if (!isPendingExists) {
        await OrderData.findOneAndUpdate(
          { orderNumber: order.receipt },
          { $push: { orderActivity: { orderStatus: 'Pending', message: "Your order has been confirmed." } } }
        );
      }

      await CartData.findByIdAndDelete({ _id: cart._id })

      return res.json({
        status: true,
        success: true,
        redirected: "/order-checkout",
      });
    } else {
      return res.json({
        status: true,
        success: false,
        redirected: "/cart",
      });
    }
  } catch (error) {
    return res.json({
      message: "Oops Something went wrong",
      status: false,
      redirected: "/404",
    });
  }
});


// Logout
const logout = asyncHandler(async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }

    if (user) {
      req.session.user = null;
      return res.redirect("/login");
    }
  } catch (error) {
    const err = new Error("Oops... Something Went Wrong")
    return next({ error: err, message: err })
  }
});


const testing = asyncHandler(async (req, res) => {
  try {
    let order = await OrderData.findOne({ orderNumber: '#PZf843fa5bb28e4a1' }).lean()
    let orders = {
      customer: 'Dr Strange'
    }
    let fileName = invoiceGenerator(orders)

    return res.render('testing', {})
  } catch (error) {
    console.log(error)
  }
})


module.exports = {
  homePage,
  Login,
  doLogin,
  googleLogin,
  googleCallback,
  signup,
  doSignup,
  emailVerify,
  resendOtp,
  otpVerify,
  forgotPassword,
  checkEmailForPassword,
  resetPassword,
  recoveredPassword,
  getBrands,
  cancelOrder,
  retryPayment,
  cancelProduct,
  categories,
  orderPreCheckout,
  orderCheckout,
  placeOrder,
  downloadInvoice,
  verifyPaymentRazorpay,
  // placeOrderRazorpay,
  logout,
  testing
};
