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
const { createHmac } = require("crypto");
const { CouponData } = require("../models/CouponDB");
const { v4: uuidv4 } = require("uuid");
let generateOrderNumber = require("../utils/generateUniqueOrderNumberHelper");
let generateReferralCode = require("../utils/generateReferralCodeHelper");
let generateTransactionID = require("../utils/generateUniqueTransactionIDHelper");
let instance = require("../config/razorpay");
const { off } = require("process");
const path = require('path')
const fs = require('fs')
require("dotenv").config();

// Company Info
const email = process.env.COMPANY_GMAIL;
const password = process.env.COMPANY_PASS;
const transporterHost = process.env.TRANSPORTER_HOST;
const transporterPort = process.env.TRANSPORTER_PORT;

// Razorpay
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

// Port Number
const port = process.env.PORT || 4000;

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

// Email Verifying
const verifyEmail = async (userID) => {
  try {
    console.log(`UserID: ${userID}`);
    // Generating JWT Token
    const token = jwt.sign({ id: userID }, process.env.SECRET, {
      expiresIn: process.env.JWT_EXPIRES_TIME,
    });

    // Finding User
    const user = await UserData.findById(userID);

    if (!user) {
      throw new Error(`User not Found`);
    }

    // Now place the token into userDB
    user.verificationToken = token;
    user.verificationTokenExpires = Date.now() + 3600000;
    await user.save();

    const mailOptions = {
      from: email,
      to: user.email,
      subject: "Verification Mail",
      html: `<p>Hii, ${user.firstName} ${user.lastName}, please click here to 
      <a href="http://127.0.0.1:${port}/verify-email?uniqueID=${token}"> verify </a> 
      </p>`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`Email has been send: ${info.response}`);
      }
    });
  } catch (error) {
    console.error(`Error sending verification email:`, error);
  }
};

// Otp Sending to Email
const userOtpSent = async (userID, otp) => {
  try {
    // Finding the User
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

// change password otp send
async function changePasswordOtpSent(userID) {
  try {
    const user = await UserData.findById(userID);

    const mailOptions = {
      from: email,
      to: user.email,
      subject: "Change Forgotten Password",
      html: `<p>Hii, ${user.firstName} ${user.lastName}, 
          this is a link to reset your password
          <a href="http://127.0.0.1:${port}/reset-password?userID=${userID}"> Reset Now.
          </a>
          </p>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`OTP has been Send to ${info.response}`);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

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
    // Trending products list based on the rating is more than 4
    const trendingProduct = await ProductData.find({
      rating: { $gt: 4 },
      isActive: true,
    })
      .limit(4)
      .lean();
    // Best Selling products list based on the qunatities is 10 or above
    const bestSelling = await ProductData.find({
      quantities: { $gte: 10 },
    })
      .limit(4)
      .lean();
    // getting all categories, that status is active
    const categories = await CategoryData.find({ isActive: true }).lean();

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
      trendingProduct,
      bestSelling,
    });
  } catch (error) {
    console.error(error);
  }
});

// view login page
const Login = asyncHandler(async (req, res) => {
  try {
    // Middleware - user is logged in or not
    if (req.session.user) {
      return res.redirect("/");
    }
    // Rendering User Login page
    res.render("user/login-page", {
      loginErr: req.session.errMessage,
      loginSuccess: req.session.userSuccess,
    });
    // message will be set to false if the page reloads
    req.session.errMessage = false;
    req.session.userSuccess = false;
  } catch (error) {
    console.error(`Error loading the page: ${error}`);
  }
});

// login
const doLogin = asyncHandler(async (req, res, next) => {
  // req.body contains email and password for the login purpose
  const { email, password } = req.body;
  // checking if the user has already an account
  let user = await UserData.findOne({ email: email });
  // Email macthes
  if (user) {
    // password comparing with existing hashed password
    const matchedPassword = await bcrypt.compare(password, user.password);
    // password matches
    if (matchedPassword) {
      // isVerified Checking
      if (!user.isVerified) {
        console.log(user._id);
        await verifyEmail(user._id, user.firstName, user.lastName, user.email);
        req.session.userSuccess =
          "User is Not Verified, OTP has been Send To the Email";
        return res.redirect("/login");
      }
      // If the user is blocked or deleted by the Admin
      if (user.isBlocked) {
        const error = new Error("User is Blocked");
        const redirectPath = "/login";
        return next({ error, redirectPath });
      } else {
        req.session.user = user;
        //  console.log(req.session.user);
        console.log(`User is Present`);
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
  let { firstName, lastName, email, password, mobileNumber, referralCode } =
    req.body;
  let existedUser = await UserData.findOne({ email: email });
  // if (referralCode && !referredUser) {
  //   const error = new Error("Referal Code is Invalid");
  //   const redirectPath = "/login";
  //   return next({ error, redirectPath });
  // }

  // If the User is already an Existing User
  if (existedUser) {
    const error = new Error("User is Already existed");
    const redirectPath = "/signup";
    return next({ error, redirectPath });
  } else {
    // console.log(`refferal code used: `+ referralCode);
    // If the new user has Refferal Code
    console.log(`referralCode:` + " " + referralCode)
    let referredUser
    // referralCode = String(referralCode)
    if (referralCode) {
      referredUser = await UserData.findOne({ referralCode: referralCode })
    }
    // referredUser = referralCode ? await UserData.findOne({ referralCode: referralCode }) : null
    let walletBalance = referredUser !== undefined ? 50 : 0
    console.log(`referredUser`)
    console.log(referredUser)
    console.log(`Wallet Balance: ${walletBalance}`)

    // if the User is new to Protein Pulze Plaza(PZ)
    let referredBy
    if (referredUser) {
      referredBy = referredUser._id
      console.log(`Reffered`)
      // Give thhe reffered money to user
      let transactionID = await generateTransactionID(referredBy)
      console.log(`Transaction ID: ${transactionID}`)
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
              description: 'The Refferal amount credited',
              status: 'Success',
            }
          }
        }
      )
    }

    // Password Hashing for Security purpose
    const hashedPassword = await bcrypt.hash(password, 10);
    const codeReferral = await generateReferralCode();
    console.log(`codeReferral: ${codeReferral}`);
    const user = await UserData.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      mobileNumber,
      referralCode: codeReferral,
      referredBy: referralCode ? referredBy : "",
    });

    // Create Wallet for the New User
    // let newUserTransactionID = await generateTransactionID(user._id)
    // console.log(`Transaction Id: ${newUserTransactionID}`)

    if (walletBalance <= 0) {
      await WalletData.create({
        userID: user._id,
        balance: walletBalance,
        transactions: [{
          amount: walletBalance,
          transactionType: 'referral',
          paymentType: 'Referral',
          description: 'The Refferal amount credited',
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
      //     description: 'The Refferal amount credited',
      //     status: 'Success',
      //   }]
      // })
    }

    // also, sending an mail to the user for verifying the user is the same or real
    await verifyEmail(user._id);
    req.session.loginMessage =
      "User Registration successfully, Please verify Email";
    // Redirecting back to signup page after User submit the signup and also providing a message
    return res.redirect("/signup");
  }
});

// email verification
const emailVerify = asyncHandler(async (req, res, next) => {
  console.log(req.query);
  const token = req.query.uniqueID;
  const resend = req.query.otp;

  console.log(`Recieved`);
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

    // setting expire time , here i have set to 10 Minutes
    let expiresAt = Date.now() + 30 * 60 * 1000;

    // console.log(otp);
    if (resend == 0) {
      // Creating a OTP modal instance
      await OtpData.create({
        userID: user._id,
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      // OTP sending to User
      await userOtpSent(user._id, otp, expiresAt);

      // Rendering the OTP page for Email Verification
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
});

// OTP signup resend
const resendOtp = asyncHandler(async (req, res, next) => {
  let token = req.query.uniqueID
  if (!token) {
    return res.status(400).send(`Verification Token is Required`);
  }

  // Finding the user Document with the Token
  let user = await UserData.findOne({ verificationToken: token });

  // User doesn't match the Token
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
})

// (Now the OTP is send we have to verify the OTP) - OTP verifying
const otpVerify = asyncHandler(async (req, res, next) => {

  const token = req.body.uniqueID;
  let userOtp = req.body.userOtp;
  console.log(`Token: ${token}`);
  // Finding the user
  const user = await UserData.findOne({ verificationToken: token });
  // If the user doesn't Exist
  if (!user) {
    return res.json({ status: false, message: `User is not Found!`, redirected: `/login` });
  }

  let generatedOtp = await OtpData.findOne({ userID: user._id }).sort({
    createdAt: -1,
  });
  console.log(`Generated OTP`);
  // console.log(generatedOtp);
  userOtp = Number(userOtp);
  generatedOtp.otp = Number(generatedOtp.otp);

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
    console.log(`User Created Successfully with verified Email`);

    return res.json({ status: true, redirected: '/login' })
  } else {
    return res.json({ status: false, message: `Incorrect Otp` })
  }
});

// Forgot password link (Step 1: loads Forgot Password Page)
const forgotPassword = asyncHandler(async (req, res, next) => {
  res.render("user/forgot-password", {
    userErr: req.session.errMessage,
    userSuccess: req.session.userSuccess,
  });
  req.session.errMessage = false;
  req.session.userSuccess = false;
});

// Forgot password (step 2: Email checking and after checking it, if it's corrcet email will be send with a Reset Link )
const checkEmailForPassword = asyncHandler(async (req, res, next) => {
  let { email } = req.body;
  email = email.trim();
  // Check if the User Exists
  let user = await UserData.findOne({ email: email });

  // If the user has no account
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

  // If the User is has no issue
  // Fn to send an OTP to the Email
  changePasswordOtpSent(user._id);
  req.session.userSuccess = "Password reset link is sent to your Email";
  res.redirect("/login");
});

// forgot password Page (Resulting when clicking on the password Reset Link )
const resetPassword = asyncHandler(async (req, res, next) => {
  const userID = req.query.userID;
  // finding the user
  let user = await UserData.findById({ _id: userID }).lean();
  console.log(user);
  res.render("user/reset-password", { user });
});

// forgot password (saving new password)
const recoveredPassword = asyncHandler(async (req, res, next) => {
  const { newPassword, confirmPassword, userID } = req.body;
  console.log(req.body);
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
});


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
      console.log(`totalPrice`)
      console.log(ordertotal)
      let transactionID = await generateTransactionID(userID)
      await WalletData.findOneAndUpdate({ userID }, {
        $push: {
          transactions:
          {
            transactionID,
            amount: ordertotal,
            transactionType: "credit",
            paymentType: 'Wallet',
            description: 'The amount has been credited for the product cancellation.',
            status: 'Success',
          }
        }

      })
    }

    for (const prod of order.products) {
      let quantity = Number(prod.quantity);
      await ProductData.findByIdAndUpdate(prod.productID, {
        $inc: { quantities: quantity },
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
    console.error(error);
  }
});


// Cancel Product(single product in the Order)
const cancelProduct = asyncHandler(async (req, res, next) => {
  if (!req.session.user) {
    return res.json({ status: false, redirected: "/login" });
  }

  let totalPrice = 0;
  let originalPrice = 0;
  let deliveryFee = 0;
  const userID = req.session.user._id
  const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

  if (!user) {
    req.session.user = null;
    const err = new Error("User not Found")
    const redirectPath = "/login";
    return next({ error: err, redirectPath });
  }

  let isOrderCancelled = false;
  const { orderID, productID } = req.body;
  let order = await OrderData.findById({ _id: orderID });

  // If there is no order 
  if (!order) {
    return res.json({ status: false, message: `No order found` });
  }

  // cheking whether the product is in the Order
  let orderProduct = await Promise.all(
    order.products.filter((prod) => {
      if (prod.productID.toString() === productID) {
        return prod;
      }
    })
  );

  // If there is no product found
  if (!orderProduct) {
    return res.json({ status: false, message: `No product found!..` });
  }

  // Findind the order and update the status
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
    console.log(walletAmount)

    let paymentType = updatedOrder.paymentMethod
    const transactionID = await generateTransactionID(userID)
    // walletAmount = updatedOrder.totalSalePrice
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
            description: "The amount has been credited for the product cancellation.",
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

  // If all the products are cancelled, we should make the order canncel too and also provide the cancel message too
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

  // Recalculating order Total Price
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

  console.log(`orderTotal`);
  console.log(orderTotal);
  originalPrice = (orderTotal[0] && orderTotal[0].originalPrice) || 0;
  totalPrice = (orderTotal[0] && orderTotal[0].totalPrice) || 0;
  deliveryFee = (orderTotal[0] && orderTotal[0].deliveryFee) || 0;

  // Delivery Charge
  deliveryFee = originalPrice >= 4500 ? 100 : 0;
  totalPrice += deliveryFee;

  // Coupon Checking after Cancellation (Checking whether the coupon can be used after Deduction)
  let isValidCoupon;
  let couponPrice = 0;
  let coupons = await Promise.all(
    order.coupons.map(async (coupon) => {
      isValidCoupon = await CouponData.findOne({ code: coupon.code });
      //  if() Coupon Expiry

      // cheking the coupon is valid to use
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

  console.log(coupons);

  couponPrice = !coupons
    ? 0
    : coupons.reduce((acc, coupon) => {
      couponDiscount =
        originalPrice >= coupon.maxDiscount
          ? coupon.maxDiscount
          : originalPrice * (1 - discountPercentage / 100);
      return acc + couponDiscount;
    }, 0);

  // then Deduct the Coupon price from Total Sale Price
  totalPrice -= couponPrice;

  console.log(couponPrice);
  console.log(totalPrice);

  // Product quantity in the User Order
  let productQuantity = orderProduct[0].quantity;

  // Now add the stock to corresponding Product
  await ProductData.findByIdAndUpdate({ _id: productID },
    { $inc: { quantities: productQuantity } }
  )

  // update the totalPrice of the Order
  await OrderData.findByIdAndUpdate(
    { _id: orderID },
    { $set: { totalPrice: totalPrice } }
  );

  return res.json({
    status: true,
    productStatus,
    totalPrice,
    orderActivity: order.orderActivity,
    isOrderCancelled,
  });
});

// view categories
const categories = asyncHandler(async (req, res, next) => {
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
  const categoryName = req.params.categoryName;

  const products = await ProductData.find({ quantities: { $gt: 0 }, categoryName }).lean();
  const updatedProducts = await Promise.all(
    products.map(async (prod) => {
      let productOffer = await OfferData.findOne({ productID: prod._id, isActive: true })
      let category = await CategoryData.findOne({ name: prod.categoryName })
      let categoryOffer = await OfferData.findOne({ categoryID: category._id, isActive: true })

      let productDiscount = 0
      let categoryDiscount = 0

      // Checking Product Offer
      if (productOffer) {
        productDiscount = productOffer.discount
        prod.salePrice = prod.price - productDiscount
        prod.offer = productOffer.discountPercentage
      } else {
        prod.salePrice = prod.price
        prod.offer = 0
      }

      // Checking Category Offers
      if (categoryOffer) {
        let categoryDiscount = (categoryOffer.discountPercentage * prod.price) / 100
        let bestDiscount = Math.max(categoryDiscount, productDiscount)
        bestDiscount = Math.round(bestDiscount)
        prod.salePrice = prod.price - bestDiscount
        // Checks if the Category Discount is higher
        if (categoryDiscount > productDiscount) {
          prod.offer = categoryOffer.discountPercentage
        }
      }

      // Update Product Price
      await ProductData.findByIdAndUpdate({ _id: prod._id },
        { $set: { salePrice: prod.salePrice, offer: prod.offer } },
        { new: true })
      return { ...prod }
    })
  )

  res.render("user/categories-page", {
    auth: true,
    categoryName,
    products,
    user: req.session.user,
    updatedProducts
  });
});


// Order Checkout
const orderPreCheckout = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    // if the user is not found
    if (!user) {
      req.session.user = null;
      const err = new Error("User not Found")
      const redirectPath = "/login";
      return next({ error: err, redirectPath });
    }

    const cartID = req.body.cartID;
    let originalPrice = 0;
    let totalPrice = 0;
    let totalSalePrice = 0;
    let totalDiscountPrice = 0;
    const address = await AddressData.findOne({ userID }).lean();
    const cart = await CartData.findOne({ _id: cartID, userID }).lean();
    // const userAddress = await AddressData.findOne({ userID });

    // check if cart is empty or not
    if (cart.products.length <= 0) {
      const error = new Error("Cart is Empty");
      const redirectPath = "/dashboard/my-cart";
      return next({ error, redirectPath });
    }

    // product Quantity(Stock) check
    for (const prod of cart.products) {
      const product = await ProductData.findById({
        _id: prod.productID
      }).lean();

      // If the product is not existed or not found
      if (!product) {
        const error = new Error(
          "Some products do not exist or were not found"
        );
        const redirectPath = "/dashboard/my-cart";
        return next({ error, redirectPath });
      }

      // if the product quantity exceeds
      if (prod.quantity > product.quantities) {
        const error = new Error(
          "The quantity of some products exceeds the available stock. Please adjust the quantities to match the available stock levels"
        );
        const redirectPath = "/dashboard/my-cart";
        return next({ error, redirectPath });
      }
    }

    // Check whether the User has applied Coupon
    let coupons = await Promise.all(
      user.appliedCoupons.map(async (coupon) => {
        if (coupon.cartID.toString() === cart._id.toString()) {
          let appliedCoupons = await CouponData.findById({
            _id: coupon.couponID,
          }).lean();
          return { appliedCoupons, coupon };
        } else {
          return null;
        }
      })
    );

    coupons = coupons.filter((coupon) => coupon !== null);

    // Cart Amount Section
    let cartTotal = await CartData.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(cartID),
          userID: new mongoose.Types.ObjectId(userID),
        },
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
          totalDiscountPrice: {
            $sum: { $subtract: ["$products.price", "$products.salePrice"] },
          },
        },
      },
    ]);

    originalPrice = cartTotal[0].originalPrice;
    totalSalePrice = cartTotal[0].totalSalePrice;
    totalDiscountPrice = cartTotal[0].totalDiscountPrice;

    let taxPrice = 0;
    let couponDiscountPercentage = 0;
    let deliveryCharge = 0;
    let discountPrice = originalPrice - totalSalePrice;
    console.log(`Saved price: ${discountPrice}`);
    let discountPercentage = (discountPrice / originalPrice) * 100;
    discountPercentage = Math.trunc(discountPercentage);

    // Coupon Discount Price
    let discountAmount = 0;
    let couponPrice = !coupons
      ? 0
      : coupons.reduce((acc, currentValue) => {
        discountAmount =
          originalPrice >= currentValue.appliedCoupons.maxDiscount
            ? currentValue.appliedCoupons.maxDiscount
            : originalPrice * (1 - discountPercentage / 100);
        return acc + discountAmount;
      }, 0);
    totalSalePrice -= couponPrice;
    couponDiscountPercentage = Math.trunc((couponPrice / originalPrice) * 100);

    // Delivery Charge
    deliveryCharge = originalPrice >= 4500 ? 100 : 0;
    totalPrice = totalSalePrice + deliveryCharge;

    // Tax amount calculation
    let taxAmount = totalPrice - totalDiscountPrice;

    // Tax rate calculation
    let taxRate = (taxAmount / totalDiscountPrice) * 100;
    console.log(taxAmount, taxRate, totalPrice);

    // Wallet Amount 
    const wallet = await WalletData.findOne({ userID: userID }).lean()

    if (!address) {
      return res.render("user/view-checkout", {
        auth: true,
        products: cart.products,
        user: req.session.user,
        discountPercentage,
        totalSalePrice,
        discountPrice: discountPrice > 0 ? -discountPrice : 0,
        totalPrice,
        coupons,
        couponDiscountPercentage,
        couponPrice: couponPrice > 0 ? -couponPrice : 0,
        originalPrice,
        deliveryCharge,
        taxPrice,
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
      discountPrice: discountPrice > 0 ? -discountPrice : 0,
      totalPrice,
      coupons,
      couponDiscountPercentage,
      couponPrice: couponPrice > 0 ? -couponPrice : 0,
      deliveryCharge,
      originalPrice,
      taxPrice,
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
    console.error(error);
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
    console.error(error);
  }
});

// Order placing
const placeOrder = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    // console.log(req.body)
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();
    const totalProducts = await ProductData.find({ isActive: true })

    // if the user is not found
    if (!user) {
      req.session.user = null;
      // const err = new Error("User not Found")
      // const redirectPath = "/login";
      return res.json({ status: false, redirected: '/login' })
    }

    if (!totalProducts) {
      return res.json({ status: false, message: "No product Found" })
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

    // console.log(req.body);
    // console.log(shippingAddressID);

    let customer = user.firstName + " " + user.lastName;

    orderNotes = orderNotes == "" ? "Nill" : orderNotes;
    // converting to Numbers(zipcode and mobileNumber)
    zipcode = Number(zipcode);
    mobileNumber = Number(mobileNumber);

    let originalPrice = 0;
    let totalSalePrice = 0;
    let totalPrice = 0;


    // Cart Total
    const cartTotal = await CartData.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(cartID),
          userID: new mongoose.Types.ObjectId(userID),
        },
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

    originalPrice = cartTotal[0].originalPrice;
    totalSalePrice = cartTotal[0].totalSalePrice;

    let tax = 0;
    let deliveryFee;
    let discountPrice = originalPrice - totalSalePrice;
    let discountPercentage = (discountPrice / originalPrice) * 100;
    discountPercentage = Math.trunc(discountPercentage);

    // Cart Products
    const cart = await CartData.findById({ _id: cartID });

    // Insert status for each products
    let products = cart.products.map((product) => {
      return { ...product, status: "Pending" };
    });

    // Checking if the user has applied any Coupons
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

    let appliedCoupons = coupons.map((coupon) => {
      let deductedPrice =
        originalPrice >= coupon.existingCoupon.maxDiscount
          ? coupon.existingCoupon.maxDiscount
          : originalPrice * (1 - discountPercentage / 100);
      return { code: coupon.existingCoupon.code, deductedPrice };
    });



    let couponPrice = !coupons
      ? 0
      : coupons.reduce((acc, coupon) => {
        couponDiscount =
          originalPrice >= coupon.existingCoupon.maxDiscount
            ? coupon.existingCoupon.maxDiscount
            : originalPrice * (1 - discountPercentage / 100);
        return acc + couponDiscount;
      }, 0);

    // then Deduct the Coupon price from Total Sale Price
    totalPrice = totalSalePrice;
    totalPrice -= couponPrice;

    // Coupon Discount Percentage
    let couponDiscountPercentage = Math.trunc(
      (couponPrice / originalPrice) * 100
    );

    // Tax Calculating
    //  tax = orginalPrice >= 15000 ? 300 : 150;

    // Delivery Charge
    deliveryFee = originalPrice >= 4500 ? 100 : 0;

    // Total Amount
    totalPrice += deliveryFee;
    console.log(totalPrice);

    // checking whether it can be paid using Wallet
    if (paymentMethod == 'myWallet') {
      const wallet = await WalletData.findOne({ userID: userID })
      if (wallet.balance < totalPrice) {
        return res.json({ status: true, insuffient: true, message: `Wallet is Insuffient. Use Razorpay or COD` })
      }
    }

    // Order Details creation
    // Order Number Creation
    let orderNumber = await generateOrderNumber();

    // Finding userAddress with UserID
    const userAddress = await AddressData.findOne({ userID }).lean();

    // Assign the address for the order in this variable
    let orderAddress;

    // If the Address is selected into diff. address(here they all are shipped Address)
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
      console.log(`Shipping order Address`);
      orderAddress = addressData[0].shippingAddress;
      console.log(orderAddress);
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
      // If the User has Billing Address

      orderAddress = {
        address: address || orderAddress.address,
        country: country || orderAddress.country,
        state: state || orderAddress.state,
        city: city || orderAddress.city,
        zipcode: zipcode || orderAddress.zipcode,
        mobileNumber: mobileNumber || orderAddress.mobileNumber,
      };
    }

    // PaymentStatus
    let paymentStatus = paymentMethod === "COD" ? "Unpaid" : (paymentMethod == 'Razorpay' ? "Pending" : "Paid")

    // Order Expected date
    const deliveryDay = 7;
    let currentDate = new Date();
    let expectedDate = moment(currentDate).add(deliveryDay, "days").toDate();

    // Checking if the order is already existing
    let existingOrder = await OrderData.findOne({ cartID });

    if (existingOrder) {
      await OrderData.findByIdAndUpdate(
        { _id: existingOrder._id },
        {
          $set: {
            orderNumber: orderNumber,
            address: orderAddress,
            totalPrice,
            totalSalePrice,
            deliveryFee,
            discountPrice,
            paymentStatus,
            paymentMethod,
            orderNote: orderNotes,
            coupons: appliedCoupons,
            products,
            expectedDate
          },
        }
      );
    } else {
      // Order Creation
      const newOrder = await OrderData.create({
        orderNumber,
        userID,
        cartID,
        customer,
        address: orderAddress,
        paymentStatus,
        paymentMethod,
        totalPrice,
        totalSalePrice,
        orderNote: orderNotes,
        deliveryFee,
        discountPrice,
        orderActivity: [
          {
            orderStatus: "Pending",
            message: "Your order has been confirmed.",
          },
        ],
        coupons: appliedCoupons,
        products,
        expectedDate,
      });
    }


    // Razorpay - Payment Method
    if (paymentMethod == "Razorpay") {
      totalPrice = Number(totalPrice);
      var options = {
        amount: totalPrice * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: orderNumber,
      };
      let razorpayOrder = await instance.orders.create(options);
      console.log(razorpayOrder);

      // Razorpay Key_Id


      return res.json({
        status: true,
        razorpayStatus: true,
        order: razorpayOrder,
        RAZORPAY_KEY_ID,
        user,
      });
    }

    // Wallet Deduction (Payment Method is Wallet)
    if (paymentMethod == 'myWallet') {
      const transactionID = await generateTransactionID(userID)
      let debitingAmount = -Number(totalPrice)
      const wallet = await WalletData.findOneAndUpdate(
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
              description: "The amount has been debited for the order.",
              status: "Success"
            }
          }
        }
      )

    }



    console.log(`appliedCoupons`);
    console.log(appliedCoupons);

    const couponsID = await Promise.all(
      appliedCoupons.map(async (coupn) => {
        return await CouponData.findOne({ code: coupn.code })
      })
    )
    console.log(`couponsID: ${couponsID}`)


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

    // let userAppliedCoupons
    // if (couponsID.length > 0) {
    //   userAppliedCoupons = await Promise.all(
    //     couponsID.map(async (coupn) => {
    //       let userCoupons = await UserData.findById({ _id: userID })
    //       if (coupn._id.toString() === userCoupons.coupons.couponID.toString()) {
    //         await UserData.findOneAndUpdate({ _id: userID, 'coupons.couponID': coupn._id },
    //           {
    //             $inc: { 'coupons.$.limit': 1 },
    //             $pull: { appliedCoupons: { couponID: coupn._id } },
    //           }
    //         )
    //       } else {
    //         await UserData.findByIdAndUpdate({ _id: userID },
    //           {
    //             $push: { coupons: { couponID: coupn._id, limit: 1 } },
    //             $pull: { appliedCoupons: { couponID: coupn._id } },
    //           }
    //         )
    //       }
    //     })
    //   )
    // }

    // Deleting the cart after the is order is Successfully placed
    await CartData.findByIdAndDelete({ _id: cartID });

    return res.json({
      status: true,
      codStatus: true,
      redirected: "/order-checkout",
    });
    //  return res.render("user/post-checkout-page", {});
  } catch (error) {
    console.error(error);
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

  // Original Price
  let originalPrice = cartTotal[0].originalPrice;
  let totalSalePrice = cartTotal[0].totalSalePrice;

  // Create a Order Number
  const orderNumber = await generateOrderNumber();

  if (req.body.paymentMethod === "Razorpay") {
    const razorpayInstance = await instance.orders.create({
      amount: totalSalePrice * 100,
      currency: "INR",
      receipt: orderNumber,
    });
    // razorpayInstance.status = 'pending'

    console.log(razorpayInstance);
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

    return res.json({ status: true, order: razorpayInstance, RAZORPAY_KEY_ID });
  }
});

// Verify payment (Razorpay)
const verifyPaymentRazorpay = asyncHandler(async (req, res, next) => {
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

  const { razorpay, order } = req.body;
  console.log(razorpay, order);

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
    const orderDetails = await OrderData.findOneAndUpdate(
      { orderNumber: order.receipt },
      { $set: { paymentStatus: "Paid" } }
    );

    console.log(`Recept Number: ${order.receipt}`)
    console.log(`orderDetails`)
    console.log(orderDetails)

    const cart = await CartData.findById({ _id: orderDetails.cartID })

    // Order Stock management
    for (const prod of cart.products) {
      let quantity = -Number(prod.quantity);
      await ProductData.findByIdAndUpdate(prod.productID, {
        $inc: { quantities: quantity },
      });
    }

    // Delete the Cart after successfully placed the Order
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
      redirected: "/dashboard/my-cart",
    });
  }
});


// Logout
const logout = asyncHandler(async (req, res) => {
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
    throw new Error("User Not Found");
  }
});

const sample = async (req, res) => {
  res.render("sample");
};

module.exports = {
  // verifyUser,
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
  cancelOrder,
  cancelProduct,
  categories,
  sample,
  orderPreCheckout,
  orderCheckout,
  placeOrder,
  verifyPaymentRazorpay,
  logout,
};
