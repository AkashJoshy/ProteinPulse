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
const jwt = require("jsonwebtoken");
const passport = require("passport");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const moment = require("moment");
const { CouponData } = require("../models/CouponDB");
const { v4: uuidv4 } = require('uuid')
let generateOrderNumber = require('../utils/generateUniqueOrderNumberHelper')
let generateReferralCode = require('../utils/generateReferralCodeHelper')
let instance = require('../config/razorpay')
require("dotenv").config();

// Company Info
const email = process.env.COMPANY_GMAIL;
const password = process.env.COMPANY_PASS;
const transporterHost = process.env.TRANSPORTER_HOST;
const transporterPort = process.env.TRANSPORTER_PORT;

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
const homePage = asyncHandler(async (req, res) => {
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
        { $set: { isVerified: true } }
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
const signup = asyncHandler(async (req, res) => {
  res.render("user/signup-page", { loginMessage: req.session.loginMessage });
  req.session.loginMessage = false;
});

// User Sign Up
const doSignup = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, mobileNumber, referralCode } = req.body;
  let existedUser = await UserData.findOne({ email: email });
  console.log(existedUser);
  let referredBy

  console.log(referralCode)
  if(referralCode) {
    let existingUser = await UserData.findOne({ referralCode: referralCode })

    if(!existingUser) {
      const error = new Error("Referal Code is Invalid");
      const redirectPath = "/login";
      return next({ error, redirectPath });
    }

    referredBy = existingUser._id
    let referredUser = await UserData.findById({ _id: referredBy })

  //  console.log(referredUser)
  }
  // If the User is already an Existing User
  if (existedUser) {
    const error = new Error("User is Already existed");
    const redirectPath = "/login";
    return next({ error, redirectPath });
  } else {
    // if the User is new to Protein Pulze Plaza(PZ)
    // Password Hashing for Security purpose
    const hashedPassword = await bcrypt.hash(password, 10);
    const codeReferral = await generateReferralCode()
    console.log(`codeReferral: ${codeReferral}`)
    const user = await UserData.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      mobileNumber,
      referralCode: codeReferral,
      referredBy: referralCode ? referredBy : ''
    });
    // also, sending an mail to the user for verifying the user is the same or real
    await verifyEmail(user._id);
    req.session.loginMessage =
      "User Registration successfully, Please verify Email";
    // Redirecting back to signup page after User submit the signup and also providing a message
    res.redirect("/signup");
  }
});

// email verification
const emailVerify = asyncHandler(async (req, res, next) => {
  // User ID
  console.log(req.query);
  const token = req.query.uniqueID;
  const resend = req.query.otp;
  // Check If the user has Token

  console.log(`Recieved`);
  if (!token) {
    return res.status(400).send(`Verification Token is Required`);
  }

  // Finding the user Document with the Token
  let user = await UserData.findOne({ verificationToken: token });

  // User doesn't match the Token
  if (!user) {
    return res.status(400).send("Invalid Verification Token.");
  }

  // Checking the token is Expired or not
  if (
    user.verificationTokenExpires &&
    Date.now() > user.verificationTokenExpires
  ) {
    return res.status(400).send("Verification Token has expired..");
  }

  // Finding the user from the collection
  if (user) {
    // Fn to generate OTP
    const otp = await otpGenerate();

    // setting expire time , here i have set to 10 Minutes
    let expiresAt = Date.now() + 30 * 60 * 1000;

    // console.log(otp);
    if (resend == 0) {
      // Creating a OTP modal instance
      await OtpData.create({
        userID: user._id,
        otp,
        expiresAt,
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

    // If the OTP is Incorrect
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

    // Creating a OTP modal instance
    await OtpData.create({
      userID: user._id,
      otp,
      expiresAt,
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
  }
});

// (Now the OTP is send we have to verify the OTP) - OTP verifying
const otpVerify = asyncHandler(async (req, res, next) => {
  const token = req.body.uniqueID;
  let userOtp = req.body.userOtp;
  console.log(`Token: ${token}`);
  // Finding the user
  const user = await UserData.findOne({ verificationToken: token });
  // If the user doesn't Exist
  if (!user) {
    return res.status(400).send(`User is not Found!`);
  }

  // console.log(`Start`);
  // console.log(user);
  // console.log(`End`);

  let generatedOtp = await OtpData.findOne({ userID: user._id }).sort({
    createdAt: -1,
  });
  console.log(`Generated OTP`);
  // console.log(generatedOtp);
  userOtp = Number(userOtp);
  // Checking the user OTP is valid
  if (generatedOtp.otp === userOtp) {
    // If thge OTP is correct then the make the user verfiyied
    // and also make the token undefined, so that hackers or anyone cannot maipulate the data and access them.
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
    return res.redirect("/login");
  } else {
    // If the user is Incorrect
    const error = new Error("OTP is Incorrect");
    const redirectPath = `/verify-email?uniqueID=${token}`;
    return next({ error, redirectPath });
  }
});

// Forgot password link (Step 1: loads Forgot Password Page)
const forgotPassword = asyncHandler(async (req, res) => {
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
const resetPassword = asyncHandler(async (req, res) => {
  const userID = req.query.userID;
  // finding the user
  let user = await UserData.findById({ _id: userID }).lean();
  console.log(user);
  res.render("user/reset-password", { user });
});

// forgot password (saving new password)
const recoveredPassword = asyncHandler(async (req, res) => {
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

// Getting all Products(!out of stock)
const products = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const userID = req.session.user._id;
  const user = await UserData.findById({ _id: userID }).lean();
  // Removing Out of Stock Proucts which is the quantities will be Zero
  const products = await ProductData.find({ quantities: { $gt: 0 } }).lean();
  return res.render("user/view-products", {
    auth: true,
    isDashboard: true,
    user,
    products,
  });
});

// view user page (Dashboard)
const dashboard = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID }).lean();
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
              $cond: [ {$in: [ "$status", ['Cancelled', 'Returned', 'Refunded'] ] }, 0, 1 ]
            }
          }
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
    totalOrders = orders == null ? 0 : userOrdersDetails[0].totalOrders
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
    console.error(error);
  }
});

// User Account Details
const accountDetails = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID }).lean();
    // user profile pic - if the user doesn't have one , a default pic would be use
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
    console.error(error);
  }
});

// User Address
const accountAddress = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID }).lean();
    const address = await AddressData.findOne({ userID }).lean();

    // If the user is new to address section
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
    console.error(error);
  }
});

// Saved Addresses
const viewAddresses = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID }).lean();
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
    console.error(error);
  }
});

// Add New Address
const addAddress = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const userID = req.session.user._id;
  const user = await UserData.findById({ _id: userID }).lean();
  return res.render("user/add-address", {
    auth: true,
    isDashboard: true,
    user,
  });
});

// Save New Address
const saveAddress = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    // console.log(req.body);
    const addressType = req.body.addressType;
    const userID = req.session.user._id;
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
              mobile,
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
              mobile,
            },
          },
        }
      );
    }
    return res.redirect("/dashboard/address/saved-address");
  } catch (error) {
    console.error(error);
  }
});

// Delete Address
const deleteAddress = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({
        status: false,
        redirected: "/login",
      });
    }
    console.log(req.body);
    let { _id, addressField } = req.body;
    const userID = req.session.user._id;

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
        redirected: "/dashboard/address/saved-address",
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
        redirected: "/dashboard/address/saved-address",
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
      redirected: "/dashboard/address/saved-address",
      message: "Successfully Deleted",
    });
  } catch (error) {
    throw new Error("An Error occurred " + error);
  }
});

// Edit Address
const getAddressEdit = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const user = req.session.user;
    const userID = req.session.user._id;
    let { addressType, addressID } = req.params;
    console.log(req.params);

    // Shipping address
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
      console.log(address);

      return res.render("user/edit-address", {
        auth: true,
        isDashboard: true,
        user,
        billing: address[0],
      });
    }
  } catch (error) {
    throw new Error("An Error occurred" + error);
  }
});

// Update Address
const updateAddress = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    console.log(req.body);

    return res.redirect("/dashboard/address/saved-address");
  } catch (error) {
    throw new Error("An Error occurred" + error);
  }
});

// Change Password
const changePassword = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    const { password, newPassword, confirmPassword } = req.body;
    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID });
    let isPasswordValid = await hashedPasswordComparing(
      password,
      user.password
    );
    console.log(isPasswordValid);
    if (!isPasswordValid) {
      req.session.passwordErr = "Password is Incorrect";
      return res.json({
        status: false,
        redirected: "/dashboard/account-details",
      });
    }

    if (newPassword != confirmPassword) {
      req.session.passwordErr = "New Password is not Matching";
      return res.json({
        status: false,
        redirected: "/dashboard/account-details",
      });
    }

    const updatedPassword = await passwordHashing(newPassword);
    await UserData.findByIdAndUpdate(
      { _id: userID },
      { password: updatedPassword }
    );
    return res.json({
      status: true,
      redirected: "/dashboard/account-details",
    });
  } catch (error) {
    throw new Error("An Error occurred" + error);
  }
});

// Update User Details
const updateUserDetails = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    const userID = req.session.user._id;
    await UserData.findByIdAndUpdate({ _id: userID }, req.body);
    return res.json({
      status: true,
      redirected: "/dashboard/account-details",
    });
  } catch (error) {
    throw new Error("Error occurred " + error);
  }
});

// Updating User Profile Picture
const updateUserProfilePic = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.json({ status: false, redirected: "/login" });
  }
  console.log(req.files[0]);
  let profilePicUrl = req.files[0].filename;
  const userID = req.session.user._id;
  await UserData.findByIdAndUpdate(
    { _id: userID },
    { profilePicture: profilePicUrl }
  );
  return res.json({
    status: true,
    redirected: "/dashboard/account-details",
  });
});

// Wishlist
const wishlist = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userID = req.session.user._id;
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
    console.error(error);
  }
};

// My Orders
const myOrders = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id;
    // getting all orders by the single user
    const user = await UserData.findById({ _id: userID }).lean();
    const orders = await OrderData.find({ userID }).lean();
    // console.log(orders);
    if (!orders || orders.length === 0) {
      return res.render("user/view-myorders", {
        auth: true,
        isDashboard: true,
        user,
        orderMessage: "No Orders has been placed",
      });
    }

    return res.render("user/view-myorders", {
      auth: true,
      isDashboard: true,
      user,
      orders,
    });
  } catch (error) {
    console.error(error);
  }
});

// Edit orders
const viewOrderDetails = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const userID = req.session.user._id;
  const orderID = req.params.orderID;
  const address = await AddressData.findOne({ userID: userID }).lean();
  const user = await UserData.findById({ _id: userID }).lean();
  const order = await OrderData.findById({ _id: orderID }).lean();
  // console.log(order);
  if (!address) {
    return res.render("user/view-myOrders-details", {
      auth: true,
      user,
      order,
      billingAddress: null,
    });
  }
  return res.render("user/view-myOrders-details", {
    auth: true,
    user,
    order,
    billingAddress: address.billingAddress[0],
  });
});

// Order cancel
const cancelOrder = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    const { orderID, orderUpdate } = req.body;
    const userID = req.session.user._id;
    const totalPrice = 0
    
    const order = await OrderData.findById({ _id: orderID });
    
    // Order Stock management
    for (const prod of order.products) {
      let quantity = Number(prod.quantity);
      await ProductData.findByIdAndUpdate(prod.productID, {
        $inc: { quantities: quantity },
      });
    }
    
    // changing order status to cancelled
    await OrderData.findByIdAndUpdate(
      { _id: orderID },
      {
        $set: { status: orderUpdate },
      }
    );
    return res.json({ status: true, message: "Your order has been Cancelled" });
  } catch (error) {
    console.error(error);
  }
});


// Cancel Product(single product in the Order)
const cancelProduct = asyncHandler(async(req, res, next) => {
  if(!req.session.user) {
    return res.json({ status: false, redirected: "/login" });
  }

  let totalPrice = 0
  let originalPrice = 0
  let deliveryFee = 0
  const userID = req.session.user._id
  let isOrderCancelled = false
  const { orderID, productID } = req.body
  let order = await OrderData.findById({ _id: orderID })

  if(!order) {
    return res.json({ status: false, message: `No order found` })
  }

  // cheking whether the product is in the Order
  let orderProduct = await Promise.all(
    order.products.filter(prod => {
      if(prod.productID.toString() === productID) {
        return prod
      }
    } )
  )

  // If there is no product found
  if(!orderProduct) {
    return res.json({ status: false, message: `No product found!..` })
  }
  
  // Findind the order and update the status
  let updatedOrder = await OrderData.findOneAndUpdate({ _id: orderID, 'products.productID': productID }, 
    { $set: { 'products.$.status': 'Cancelled', deliveryFee: deliveryFee } },
    { new: true }
  ) 
  
  if(!updatedOrder) {
    return res.json({ status: false, message: `No product found!..` })
  }

  let cancelledProduct = updatedOrder.products.filter(prod => prod.productID.toString() === productID)
  let productStatus = cancelledProduct[0].status

  // If all the products are cancelled, we should make the order canncel too and also provide the cancel message too
  let isOrderCancel = updatedOrder.products.every(prod => prod.status === 'Cancelled')

  if(isOrderCancel) {
    order = await OrderData.findByIdAndUpdate({ _id: orderID }, 
      { 
        $set: { status: 'Cancelled' }, 
        $push: { orderActivity: { orderStatus: 'Cancelled', message: 'Your order has been cancelled' } } 
      }, { new: true })

      isOrderCancelled = true
  }

  // Recalculating order Total Price
  const orderTotal = await OrderData.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(orderID),
        userID: new mongoose.Types.ObjectId(userID)
      }
    },
    {
      $unwind: '$products'
    },
    {
      $match: { 
        'products.status': { $ne: 'Cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        originalPrice: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
        totalPrice: { $sum: { $multiply: ['$products.quantity', '$products.salePrice'] } },
        deliveryFee: { $first: '$deliveryFee' }
      }
    },
    {
      $project: { 
        _id: 0,
        originalPrice: 1,
        totalPrice: 1,
        deliveryFee: 1,
      }
    },
  ])

  console.log(`orderTotal`)
  console.log(orderTotal)
  originalPrice = (orderTotal[0] && orderTotal[0].originalPrice) || 0;
  totalPrice = (orderTotal[0] && orderTotal[0].totalPrice) || 0;
  deliveryFee = (orderTotal[0] && orderTotal[0].deliveryFee) || 0;

  // Delivery Charge
  deliveryFee = originalPrice >= 4500 ? 100 : 0;
  totalPrice += deliveryFee
  

  // Coupon Checking after Cancellation (Checking whether the coupon can be used after Deduction)
  let isValidCoupon
  let couponPrice = 0
  let coupons = await Promise.all(
    order.coupons.map(async(coupon) => {
      isValidCoupon = await CouponData.findOne({ code: coupon.code })
    //  if() Coupon Expiry

    // cheking the coupon is valid to use
      if(isValidCoupon) {
        return originalPrice >= isValidCoupon.minOrderValue ? isValidCoupon : null
      } else {
        return null
      }
    })
  )

  coupons = coupons.filter(coupon => coupon !== null)

  console.log(coupons)

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

  console.log(couponPrice)
  console.log(totalPrice)

  // Product quantity in the User Order
  let productQuantity = orderProduct[0].quantity


  // Now add the stock to corresponding Product
  // await ProductData.findByIdAndUpdate({ _id: productID }, 
  //   { $inc: { quantities: productQuantity } }
  // )

  // update the totalPrice of the Order
  await OrderData.findByIdAndUpdate({ _id: orderID }, 
    { $set: { totalPrice: totalPrice } }
  )

  return res.json({ status: true, productStatus, totalPrice, orderActivity: order.orderActivity, isOrderCancelled })
})

// view categories
const categories = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const categoryName = req.params.categoryName;
  const products = await ProductData.find({
    categoryName,
  }).lean();
  res.render("user/categories-page", {
    auth: true,
    categoryName,
    products,
    user: req.session.user,
  });
});

// view product
const product = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const productID = req.params.productID;
  const product = await ProductData.findById({ _id: productID }).lean();
  // let productName = product.name.split('-')[0]
  let productName = product.name;
  console.log(productName);
  let similarProducts = product.name.includes("-")
    ? await ProductData.find({ name: { $regex: productName } }).lean()
    : await ProductData.find({ name: productName }).lean();
  similarProducts = similarProducts.map((product) => {
    let { flavour, size } = product;
    return { flavour, size };
  });
  console.log(similarProducts);
  const realtedProducts = await ProductData.find({
    categoryName: product.categoryName,
  }).lean();

  res.render("user/view-product", {
    auth: true,
    product,
    realtedProducts,
    user: req.session.user,
    similarProducts,
  });
});

// Sort Products
const sortProducts = asyncHandler(async (req, res, next) => {
  if (!req.session.user) {
    return res.json({
      status: false,
      redirected: "/login",
      message: "Please login to Continue",
    });
  }

  let sort = req.query.sortType;
  console.log(sort);
  let sortOpt = {};

  sortOpt =
    sort == "lowToHigh"
      ? { price: 1 }
      : sort == "highToLow"
      ? { price: -1 }
      : sort == "ascending"
      ? { name: 1 }
      : sort == "descending"
      ? { name: -1 }
      : sort == "averageRating"
      ? { rating: -1 }
      : sort == "newArrivals"
      ? { createdAt: -1 }
      : {};
  // console.log(sortOpt);

  let products = await ProductData.find({}).sort(sortOpt).lean();

  return res.json({ status: true, products });
});

// Product Searching
const searchProducts = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({
        status: false,
        redirected: "/login",
        message: "Please login to Continue",
      });
    }
    // console.log(`hlooo`);
    let search = req.query.search.trim();
    let products = await ProductData.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { categoryName: { $regex: search, $options: "i" } },
      ],
    });
    // console.log(products);
    req.session.products = products;
    return res.json({ status: true, redirected: "/products", products });
  } catch (error) {
    console.error(error);
  }
});

// Product Search Results
const searchResults = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const userID = req.session.user._id;
  // req.session.products = null
  const user = await UserData.findById({ _id: userID });
  let products = req.session.products;

  return res.render("user/view-searched-products", {
    auth: true,
    user,
    products,
  });
});

// Products Filters
const productFilters = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    const {
      availability,
      priceRange,
      brands,
      flavour,
      discountPercentage,
      sortType,
    } = req.query;

    console.log(req.query);
    // Products Sorting
    let sortOpt = {};
    sortOpt =
      sortType == "lowToHigh"
        ? { price: 1 }
        : sortType == "highToLow"
        ? { price: -1 }
        : sortType == "ascending"
        ? { name: 1 }
        : sortType == "descending"
        ? { name: -1 }
        : sortType == "averageRating"
        ? { rating: -1 }
        : sortType == "newArrivals"
        ? { createdAt: -1 }
        : {};

    // Finding product Availability
    let filters = {};
    if (availability) {
      filters.quantities = { $gt: 0 };
    } else {
      filters.quantities = { $gte: 0 };
    }

    // Filtering Price
    if (priceRange) {
      let amountCondt = {
        uptoThousand: { salePrice: { $gte: 0, $lte: 999 } },
        btwThousandAndTwoThousand: { salePrice: { $gt: 1000, $lte: 1999 } },
        btwTwoThousandAndThreeThousand: {
          salePrice: { $gte: 2000, $lte: 2999 },
        },
        btwThreeThousandAndFourThousand: {
          salePrice: { $gte: 3000, $lte: 3999 },
        },
        btwFourThousandAndFiveThousand: {
          salePrice: { $gte: 4000, $lte: 4999 },
        },
        aboveFiveThousand: { salePrice: { $gte: 5000 } },
      };
      Object.assign(filters, amountCondt[priceRange] || {});
    }

    // Filtering Based on Discount
    if (discountPercentage) {
      let discountCondt = {
        tenPercentageAndBelow: { offer: { $gte: 0, $lte: 10 } },
        tenPercentageAndAbove: { offer: { $gte: 10 } },
        twentyPercentageAndAbove: { offer: { $gte: 20 } },
        thirtyPercentageAndAbove: { offer: { $gte: 30 } },
        fourthPercentageAndAbove: { offer: { $gte: 40 } },
        fifthPercentageAndAbove: { offer: { $gte: 50 } },
      };
      Object.assign(filters, discountCondt[discountPercentage] || {});
    }

    // filtering Flavours
    if (flavour && Array.isArray(flavour) && flavour.length > 0) {
      filters.flavour = { $in: flavour };
    } else if (flavour) {
      filters.flavour = { $in: [flavour] };
    }

    // filtering Brands
    if (brands && Array.isArray(brands) && brands.length > 0) {
      filters.brand = { $in: brands };
    } else if (brands) {
      filters.brand = { $in: [brands] };
    }

    let filterProducts = await ProductData.find(filters).sort(sortOpt).lean();

    filterProducts = filterProducts = null ? 0 : filterProducts;

    return res.json({ status: true, filterProducts, redirected: "/products" });
  } catch (error) {
    console.error(error);
  }
});

// Product Review
const productReview = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    console.log(req.body);
    const userID = req.session.user._id;
    let { productID, productRating, productFeedback } = req.body;
    productRating = productRating === "" ? 0 : Number(productRating);
    const isFeedback = await ProductFeedback.findOne({ productID });
    if (!isFeedback) {
      await ProductFeedback.create({
        productID,
        feedbacks: {
          userID,
          productRating,
          productFeedback,
        },
      });
      return res.redirect(`/product/${productID}`);
    }

    await ProductFeedback.findByIdAndUpdate(
      { _id: isFeedback._id },
      { $push: { feedbacks: { userID, productRating, productFeedback } } }
    );
    return res.redirect(`/product/${productID}`);
  } catch (error) {
    console.error(error);
  }
});

// Add To Cart (Product)
const addToCart = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({
        status: false,
        redirected: "/login",
      });
    }

    const productID = req.body.productID;
    let count = req.body.count;
    console.log(count);
    const userID = req.session.user._id;
    const productLimit = 4;
    const productDetails = await ProductData.findById({ _id: productID });
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

    // Checking if the product is already in the cart and also about the limit for a product to be added
    // It will return the index if the product is already in the products array in the Cart Collection or else it will return -1
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

    // New Product adding to existing cart
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

// User Cart
const myCart = asyncHandler(async (req, res) => {
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
    const userID = req.session.user._id;
    // Get Offer
    const offers = await CouponData.find().lean();
    const user = await UserData.findById({ _id: userID }).lean();

    // check any offer has been applied by the user
    let availableOffers
    let validOffers
    if(user.coupons.length <= 0) {
      availableOffers = offers
    } else {
      // if the offer has been applied by the user,
      // then check the coupon limit 
      availableOffers = offers.map(offer => {
        validOffers = user.coupons.filter(coupon => {
          if(offer._id.toString() === coupon.couponID.toString()) {
            if(coupon.limit < offer.limit) {
              return offer
            }
          } else {
            return offer
          }
        })
        return validOffers
      })
    }

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
        totalPrice
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
        totalPrice
      });
    }

    originalPrice = cartTotal[0].originalPrice;
    totalSalePrice = cartTotal[0].totalSalePrice;
    totalDiscountAmount = cartTotal[0].totalDiscountAmount;
    
    // Price deducted from Original Price
    discountPrice = originalPrice - totalSalePrice

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
      if(user.appliedCoupons) {
        let couponDiscountPercentage = 0
        let coupons
        let couponDiscount = 0;
        let couponPrice = 0
        console.log(`coupon Applyied`)
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
        )
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
          offers,
          coupons,
          couponDiscountPrice: couponPrice <= 0 ? 0 : -couponPrice,
          loginErr: req.session.errMessage,
        });
        
        req.session.errMessage = false;
        return
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
      offers,
      loginErr: req.session.errMessage,
    });

    req.session.errMessage = false;
  } catch (error) {
    console.error(error);
  }
});

// Apply Coupon
const applyCoupon = asyncHandler(async (req, res, next) => {
  if (!req.session.user) {
    return res.json({ status: false, redirected: "/login" });
  }
  const couponCode = req.params.couponCode;
  const userID = req.session.user._id;
  const user = await UserData.findById({ _id: userID });
  const isOfferexist = await CouponData.findOne({ code: couponCode }).lean();
  const cart = await CartData.findOne({ userID }).lean();
  let totalPrice;

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
  const { couponCode, cartID } = req.params;
  const userID = req.session.user._id;
  const cart = await CartData.findById({ _id: cartID }).lean();
  const user = await UserData.findById({ _id: userID }).lean();
  const couponToRemove = await CouponData.findOne({ code: couponCode });
  let totalPrice = 0;

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
    { $pull: { appliedCoupons: { cartID: cart._id, couponID: couponToRemove._id } } }
  );

  return res.json({ 
    status: true,
    isCoupon: true,
    message: `coupon removed` ,
    originalPrice,
    totalPrice,
    couponDiscountPrice,
    couponDiscountPercentage,
    discountPercentage,
    discountAmount
  });
});

// Removing a product from Cart
const deleteCartProduct = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.json({ status: false, redirected: "/login" });
  }
  const cartProductID = req.body.cartProductID;
  const userID = req.session.user._id;
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
    redirected: "/dashboard/my-cart",
  });
});

// Cart product quantity
const updateCartProductQuantity = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }

    let originalPrice = 0;
    let totalPrice = 0;
    let totalSalePrice = 0;
    let totalDiscountAmount;
    let discountPrice = 0;

    const userID = req.session.user._id;
    const productID = req.body.productID;
    let count = req.body.count;
    count = Number(count);
    let quantity = req.body.quantity;
    quantity = Number(quantity);
    let productQuantity;
    const productLimit = 4;
    const product = await ProductData.findById({ _id: productID });

    let user = await UserData.findById({ _id: userID }).lean();

    let cart = await CartData.findOne({
      userID,
      products: { $elemMatch: { productID } },
    });

    // Finding the index, so that it's easy to find the product in the cart
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
    discountPrice = originalPrice - totalSalePrice

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
    console.log(`Discount Percentage: ${discountPercentage}`)

    productQuantity = cart.products[cartProductIndex].quantity;
    return res.json({
      status: true,
      productQuantity,
      cartProductIndex,
      redirected: "/dashboard/my-cart",
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

// Order Checkout
const orderPreCheckout = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    console.log(req.body)
    const userID = req.session.user._id;
    const cartID = req.body.cartID;
    let originalPrice = 0;
    let totalPrice = 0;
    let totalSalePrice = 0;
    let totalDiscountPrice = 0;
    const user = await UserData.findById({ _id: userID }).lean();
    const address = await AddressData.findOne({ userID }).lean();
    const cart = await CartData.findOne({ _id: cartID, userID }).lean();
    // const userAddress = await AddressData.findOne({ userID });

    // product Quantity(Stock) check
    for (const prod of cart.products) {
      const product = await ProductData.findById({
        _id: prod.productID,
      }).lean();
      if (!product) {
        return res.status(404).send("Product not found");
      }

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
          let appliedCoupons = await CouponData.findById({ _id: coupon.couponID }).lean()
            return { appliedCoupons, coupon } 
        } else {
          return null
        }
      })
    )

    coupons = coupons.filter(coupon => coupon !== null)
    
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
    let couponDiscountPercentage = 0
    let deliveryCharge = 0;
    let discountPrice = originalPrice - totalSalePrice;
    console.log(`Saved price: ${discountPrice}`)
    let discountPercentage = (discountPrice / originalPrice) * 100;
    discountPercentage = Math.trunc(discountPercentage);
    
    // Coupon Discount Price
    let discountAmount = 0
    let couponPrice = !coupons 
      ? 0 
        : coupons.reduce((acc, currentValue) => {
          discountAmount = originalPrice >= currentValue.appliedCoupons.maxDiscount 
            ? currentValue.appliedCoupons.maxDiscount
             : originalPrice * (1 - discountPercentage / 100)
             return acc + discountAmount
        }, 0)
        totalSalePrice -= couponPrice
        couponDiscountPercentage = Math.trunc((couponPrice / originalPrice) * 100)

    // Delivery Charge
    deliveryCharge = originalPrice >= 4500 ? 100 : 0;
    totalPrice = totalSalePrice + deliveryCharge
        
    // Tax amount calculation
    let taxAmount = totalPrice - totalDiscountPrice;

    // Tax rate calculation
    let taxRate = (taxAmount / totalDiscountPrice) * 100;
    console.log(taxAmount, taxRate, totalPrice)
  
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
        cart,
        user,
      });
    }

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
      deliveryCharge,
      originalPrice,
      taxPrice,
      cart,
      user,
      address,
      billingAddress: address.billingAddress[0],
      shippingAddress: address.shippingAddress,
    });
  } catch (error) {
    console.error(error);
  }
});

// Order Checkout Page
const orderCheckout = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    
   return res.render("user/post-checkout-page", {});
  } catch (error) {
    console.error(error);
  }
});


// Order placing
const placeOrder = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: '/login' })
    }
    // console.log(req.body)
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

    console.log(req.body)
    console.log(shippingAddressID)

    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID }).lean()
    let customer = user.firstName+' '+user.lastName

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
    let products =  cart.products.map(product => {
      return { ...product, status: 'Pending' }
    })

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
    )

    coupons = coupons.filter(coupon => coupon !== null)

    let appliedCoupons = coupons.map(coupon => {
      let deductedPrice =  originalPrice >= coupon.existingCoupon.maxDiscount
      ? coupon.existingCoupon.maxDiscount
      : originalPrice * (1 - discountPercentage / 100);
      return {code: coupon.existingCoupon.code, deductedPrice }
    })
    
    console.log(appliedCoupons)

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
    totalPrice = totalSalePrice
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
    totalPrice += deliveryFee
    console.log(totalPrice);

    // Order Details creation
    // Order Number Creation
    let orderNumber = await generateOrderNumber()

  //  Order Stock management
    // for (const prod of cart.products) {
    //   let quantity = -Number(prod.quantity);
    //   await ProductData.findByIdAndUpdate(prod.productID, {
    //     $inc: { quantities: quantity },
    //   });
    // }

    // Finding userAddress with UserID
    const userAddress = await AddressData.findOne({ userID }).lean();
   
    // Assign the address for the order in this variable 
    let orderAddress

    // If the Address is selected into diff. address(here they all are shipped Address)
    if(shippingAddressID) {
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
                'shippingAddress._id': new mongoose.Types.ObjectId(shippingAddressID)
              }
            },
            {
              $project: { shippingAddress: 1, userID: 1 },
            },
          ]);

          orderAddress = addressData[0].shippingAddress
    } else if(!userAddress) {
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
      }
    } else {
      // If the User has Billing Address
      
      orderAddress = {
        address: address || orderAddress.address,
        country: country || orderAddress.country,
        state: state || orderAddress.state,
        city: city || orderAddress.city,
        zipcode: zipcode || orderAddress.zipcode,
        mobileNumber: mobileNumber || orderAddress.mobileNumber
      };
    }

    // Order Expected date
    const deliveryDay = 7
    let currentDate = new Date()
    let expectedDate = moment(currentDate).add(deliveryDay , 'days').toDate()


    // Order Creation
    await OrderData.create({
      orderNumber,
      userID,
      customer,
      address: orderAddress,
      paymentStatus: paymentMethod === "COD" ? "Unpaid" : "Pending",
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
      expectedDate
    })

    // Razorpay - Payment Method
    if(paymentMethod == 'Razorpay') {
      totalPrice = Number(totalPrice)
      var options = {
        amount: totalPrice * 100,  // amount in the smallest currency unit
        currency: "INR",
        receipt: orderNumber
      };
      let razorpayOrder = await instance.orders.create(options);
      console.log(razorpayOrder)

      // Razorpay Key_Id
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
    
      return res.json({ status: true, razorpayStatus: true, order: razorpayOrder, RAZORPAY_KEY_ID })
    }

  // await CartData.findByIdAndDelete({ _id: cartID });
   return res.json({ status: true, codStatus: true, redirected: '/order-checkout' });
  //  return res.render("user/post-checkout-page", {});
  } catch (error) {
    console.error(error);
  }
});


// Order place - Razorpay
const placeOrderRazorpay = asyncHandler(async (req, res, next) => {
  if(!req.session.user) {
    return res.json({ status: false, redirected: '/login' })
  }

  const cartID = req.body.cartID
  const cart = await CartData.findById({ _id: cartID })
  const userID = req.session.user._id
  const user = await UserData.findById({ _id: userID })

  // Cart Total
  const cartTotal = await CartData.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(cartID) }
    },
    {
      $unwind: "$products"
    },
    {
      $group: { 
        _id: null,
        originalPrice: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
        totalSalePrice: { $sum: { $multiply: ['$products.quantity', '$products.salePrice'] } }
      }
    }
  ])

  // Original Price
  let originalPrice = cartTotal[0].originalPrice
  let totalSalePrice = cartTotal[0].totalSalePrice

  // Create a Order Number
  const orderNumber = await generateOrderNumber()

  if(req.body.paymentMethod === 'Razorpay') {
    const razorpayInstance = await instance.orders.create({
      amount: totalSalePrice * 100,
      currency: "INR",
      receipt: orderNumber,
    })
    // razorpayInstance.status = 'pending'

    console.log(razorpayInstance)
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID

    return res.json({ status: true, order: razorpayInstance, RAZORPAY_KEY_ID })
  }

})


// Verify payment (Razorpay)
const verifyPaymentRazorpay = asyncHandler(async(req, res, next) => {
  if(!req.session.user) {
    return res.json({ status: false, redirected: '/login' })
  }

  console.log(req.body)
})


// Wallet viewing
const wallet = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  return res.render("user/view-wallet", {
    auth: true,
    user: req.session.user,
  });
});

// User Wishlist
const updateWishlist = asyncHandler(async (req, res, next) => {
  if (!req.session.user) {
    return res.json({
      status: false,
      redirected: "/login",
      message: "Please Login to continue",
    });
  }
  let productID = req.params.productID;
  let userID = req.session.user._id;
  const user = await UserData.findById({ _id: userID }).lean();

  let productIndex = user.wishlist.findIndex(
    (product) => product.productID == productID
  );

  if (productIndex == -1) {
    // checking limit for adding Wishlist
    if (user.wishlist.length >= 4) {
      return res.json({
        status: true,
        isFavourate: false,
        message: "Maximum wishlist limit exceeded",
      });
    } else {
      // if the limit is not over, thn add to wishlist
      await UserData.findByIdAndUpdate(
        { _id: userID },
        { $push: { wishlist: { productID: productID } } }
      );
      return res.json({
        status: true,
        isFavourate: true,
        message: "Product added to Wishlist",
      });
    }
  } else {
    await UserData.findByIdAndUpdate(
      { _id: userID },
      { $pull: { wishlist: { productID: productID } } }
    );
    return res.json({
      status: true,
      isFavourate: false,
      message: "Product Removed from the Wishlist",
    });
  }
});

// Remove Wishlist Product
const removeWishlistProduct = asyncHandler(async(req, res, next) => {
  if(!req.session.user) {
    return res.json({
      status: false,
      redirected: "/login"
    });
  }

  let productID = req.params.productID;
  let userID = req.session.user._id;
  const user = await UserData.findById({ _id: userID }).lean();

  let removedProduct = await UserData.findOneAndUpdate({ _id: userID, 'wishlist.productID': productID }, 
    { $pull: { wishlist: { productID: productID } } }
  )
//  console.log(removedProduct)

  return res.json({ status: true, message: `Product removed` })

})

// Logout
const logout = asyncHandler(async (req, res) => {
  try {
    const user = req.session.user;
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
  otpVerify,
  forgotPassword,
  checkEmailForPassword,
  resetPassword,
  recoveredPassword,
  products,
  dashboard,
  accountDetails,
  accountAddress,
  viewAddresses,
  addAddress,
  saveAddress,
  deleteAddress,
  getAddressEdit,
  updateAddress,
  changePassword,
  updateUserDetails,
  updateUserProfilePic,
  wishlist,
  myOrders,
  viewOrderDetails,
  cancelOrder,
  cancelProduct,
  categories,
  sample,
  product,
  sortProducts,
  searchProducts,
  searchResults,
  productFilters,
  productReview,
  addToCart,
  myCart,
  applyCoupon,
  removeCoupon,
  deleteCartProduct,
  updateCartProductQuantity,
  orderPreCheckout,
  orderCheckout,
  placeOrder,
  verifyPaymentRazorpay,
  wallet,
  updateWishlist,
  removeWishlistProduct,
  logout,
};
