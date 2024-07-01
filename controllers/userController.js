const mongoose = require("mongoose");
const asyncHandler = require('express-async-handler')
const { UserData } = require("../models/userDB");
const { CategoryData } = require("../models/categoryDB");
const { OtpData } = require("../models/otpDB");
const { ProductData } = require("../models/productDB");
const { CartData } = require("../models/cartDB");
const { ProductFeedback } = require("../models/productFeedbackDB");
const { AddressData } = require("../models/AddressDB");
const { OrderData } = require("../models/OrderDB");
const jwt = require('jsonwebtoken')
const passport = require("passport");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const moment = require('moment')
require('dotenv').config()

// Company Info
const email = process.env.COMPANY_GMAIL
const password = process.env.COMPANY_PASS
const transporterHost = process.env.TRANSPORTER_HOST 
const transporterPort =  process.env.TRANSPORTER_PORT

// Port Number
const port = process.env.PORT || 4000

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
const verifyEmail = async ( userID ) => {
  try {
    console.log( `UserID: ${userID}` )
    // Generating JWT Token
    const token = jwt.sign({ id: userID }, process.env.SECRET, { expiresIn: process.env.JWT_EXPIRES_TIME })

    // Finding User
    const user = await UserData.findById(userID)

    if(!user) {
      throw new Error(`User not Found`)
    }

    // Now place the token into userDB
    user.verificationToken = token
    user.verificationTokenExpires = Date.now() + 3600000
    await user.save()

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
    })
  } catch (error) {
    console.error(`Error sending verification email:`, error);
  }
}

// Otp Sending to Email
const userOtpSent = async (
  userID,
  otp
) => {
  try {

    // Finding the User
    const user = await UserData.findById(userID)

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
async function changePasswordOtpSent (userID) {
  try {

    const user = await UserData.findById(userID)

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
    }).limit(4).lean();
    // Best Selling products list based on the qunatities is 10 or above
    const bestSelling = await ProductData.find({
      quantities: { $gte: 10 },
    }).limit(4).lean()
    // getting all categories, that status is active
    const categories = await CategoryData.find({ isActive: true }).lean();

    if(req.user) {
      let user = await UserData.findOneAndUpdate({ email: req.user.email }, { $set: { isVerified: true } })
      req.session.user = user
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
})

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
  } catch(error) {
    console.error(`Error loading the page: ${error}`);
  }
    
})

// login
const doLogin = asyncHandler( async (req, res, next) => {
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
          await verifyEmail(
            user._id,
            user.firstName,
            user.lastName,
            user.email
          );
          req.session.userSuccess =
            "User is Not Verified, OTP has been Send To the Email";
          return res.redirect("/login");
        } 
        // If the user is blocked or deleted by the Admin
        if (user.isBlocked) {
          const error = new Error("User is Blocked")
          const redirectPath = "/login"
          return next({error, redirectPath})
        } else {
          req.session.user = user;
          console.log(req.session.user);
          console.log(`User is Present`);
          res.redirect("/");
        }
      } else {
        const error = new Error("Credentials is Incorrect")
        const redirectPath = "/login"
        return next({error, redirectPath})
      }
    } else {
      const error = new Error("No User is Found!")
      const redirectPath = "/login"
      return next({error, redirectPath})
    }
})

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
  req.session.loginMessage = false
})

// User Sign Up
const doSignup = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, mobileNumber } = req.body;
  let existedUser = await UserData.findOne({ email: email });
  console.log(existedUser);

  // If the User is already an Existing User
  if (existedUser) {
    const error = new Error('User is Already existed')
    const redirectPath = '/login'
    return next( {error, redirectPath } )
  } else {
    // if the User is new to Protein Pulze Plaza(PZ)
    // Password Hashing for Security purpose
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserData.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      mobileNumber,
    });
    // also, sending an mail to the user for verifying the user is the same or real
    await verifyEmail(user._id);
    req.session.loginMessage =
      "User Registration successfully, Please verify Email";
      // Redirecting back to signup page after User submit the signup and also providing a message
    res.redirect("/signup");
  }
})


// email verification
const emailVerify = asyncHandler(async (req, res, next) => {
  // User ID 
    console.log(req.query); 
    const token = req.query.uniqueID;
    const resend = req.query.otp
    // Check If the user has Token

    console.log(`Recieved`);
    if(!token) {
      return res.status(400).send(`Verification Token is Required`)
    }

    // Finding the user Document with the Token
    let user = await UserData.findOne({ verificationToken: token });

    // User doesn't match the Token
    if (!user) {
      return res.status(400).send('Invalid Verification Token.');
    }

    // Checking the token is Expired or not
    if(user.verificationTokenExpires && Date.now() > user.verificationTokenExpires) {
      return res.status(400).send('Verification Token has expired..');
    }

    // Finding the user from the collection
    if (user) {
      // Fn to generate OTP
      const otp = await otpGenerate();
      
      
      // setting expire time , here i have set to 10 Minutes
      let expiresAt = Date.now() + 30 * 60 * 1000;

      // console.log(otp);
      if(resend == 0) {
          // Creating a OTP modal instance
          await OtpData.create({
            userID: user._id,
            otp,
            expiresAt
          });
  
  
          // OTP sending to User
          await userOtpSent(
            user._id,
            otp,
            expiresAt
          );
  
  
      // Rendering the OTP page for Email Verification
      res.render("user/signup-otp-page", { userID: user._id, errMessage: req.session.errMessage, token });
      req.session.errMessage = false
      return
      }


      // If the OTP is Incorrect
      const userOtp = await OtpData.findOne({ userID: user._id }).sort({ createdAt: -1 })
      if(userOtp && Date.now() < userOtp.expiresAt) {
        res.render("user/signup-otp-page", { userID: user._id, errMessage: req.session.errMessage, token });
        req.session.errMessage = false
        return
      } 

        // Creating a OTP modal instance
        await OtpData.create({
          userID: user._id,
          otp,
          expiresAt
        });


        // OTP sending to User
        await userOtpSent(
          user._id,
          otp,
          expiresAt
        );


    // Rendering the OTP page for Email Verification
    res.render("user/signup-otp-page", { userID: user._id, errMessage: req.session.errMessage, token });
    req.session.errMessage = false
    }
})

// (Now the OTP is send we have to verify the OTP) - OTP verifying
const otpVerify = asyncHandler(async (req, res, next) => {
  const token = req.body.uniqueID;
  let userOtp = req.body.userOtp;
  console.log(`Token: ${token}`); 
  // Finding the user
  const user = await UserData.findOne({ verificationToken: token })
  // If the user doesn't Exist
  if(!user) {
    return res.status(400).send(`User is not Found!`)
  }

  // console.log(`Start`);
  // console.log(user);
  // console.log(`End`);

  let generatedOtp = await OtpData.findOne({ userID: user._id }).sort({ createdAt: -1 })
  console.log(`Generated OTP`);
  // console.log(generatedOtp);
    userOtp = Number(userOtp);
    // Checking the user OTP is valid 
    if (generatedOtp.otp === userOtp) {
      // If thge OTP is correct then the make the user verfiyied
      // and also make the token undefined, so that hackers or anyone cannot maipulate the data and access them. 
      await UserData.findByIdAndUpdate(
        { _id: user._id },
        { $set: { isVerified: true, verificationToken: null, verificationTokenExpires: null } },
      );
      await OtpData.deleteMany({ userID: user._id })
      console.log(`User Created Successfully with verified Email`);
      return res.redirect("/login");
    } else {
      // If the user is Incorrect
      const error = new Error("OTP is Incorrect")
      const redirectPath = `/verify-email?uniqueID=${token}`
      return next({ error, redirectPath })
    }

})

// Forgot password link (Step 1: loads Forgot Password Page)
const forgotPassword = asyncHandler(async (req, res) => {
  res.render("user/forgot-password", 
    { userErr: req.session.errMessage,
      userSuccess: req.session.userSuccess
    });
    req.session.errMessage = false;
  req.session.userSuccess = false;
}) 

// Forgot password (step 2: Email checking and after checking it, if it's corrcet email will be send with a Reset Link )
const checkEmailForPassword = asyncHandler(async (req, res, next) => {
  let { email } = req.body;
  email = email.trim();
  // Check if the User Exists
  let user = await UserData.findOne({ email: email });

  // If the user has no account
  if (!user) {
    const error = new Error("No User Found! Try another Email")
    const redirectPath = "/forgot-password"
    return next({ error, redirectPath })
  }

  if (user.isBlocked) {
    const error = new Error("User is Blocked")
    const redirectPath = "/forgot-password"
    return next({ error, redirectPath })
  }
  
  if (!user.isVerified) {
    const error = new Error("Email is not verified yet! Please Verify it First")
    const redirectPath = "/forgot-password"
    return next({ error, redirectPath })
  }
  
  // If the User is has no issue
  // Fn to send an OTP to the Email 
  changePasswordOtpSent(
    user._id
  );
  req.session.userSuccess = "Password reset link is sent to your Email";
  res.redirect("/login");
})

// forgot password Page (Resulting when clicking on the password Reset Link )
const resetPassword = asyncHandler(async (req, res) => {
    const userID = req.query.userID;
    // finding the user
    let user = await UserData.findById({ _id: userID }).lean();
    console.log(user);
    res.render("user/reset-password", { user });
})

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
})

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
    })
})

// view user page (Dashboard)
const dashboard = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID }).lean();
    const address = await AddressData.findOne({ userID: userID }).lean();
    const orders = await OrderData.find({ userID })

    // User's Order Count and status
    const userOrdersDetails = await OrderData.aggregate([
      {
        $match: { userID: new mongoose.Types.ObjectId(userID) }
      },
      {
        $group: { _id: null, 
          pendingOrders: {
          $sum: {
            $cond: [
              { $eq: ["$status", "Pending"] }, 
              1, 
              0
            ]
          }
        }, 
          completedOrders: {
          $sum: {
            $cond: [
              { $eq: ["$status", "Delivered"] }, 
              1, 
              0
            ]
          }
        }, 
      }
      }
    ])

    let totalOrders
    let pendingOrders
    let completedOrders

    if(orders.length <= 0) {
      return res.render("user/user-dashboard", {
        auth: true,
        isDashboard: true,
        user,
        billingAddress: address.billingAddress[0],
        totalOrders:0,
        pendingOrders:0,
        completedOrders:0
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
        totalOrders:0,
        pendingOrders:0,
        completedOrders:0
      });
    }
    
    // User Order Details
    totalOrders = orders == null ? 0 : orders.length
    pendingOrders = orders == null ? 0 : orders[0].pendingOrders
    completedOrders = orders == null ? 0 : orders[0].completedOrders
    
    return res.render("user/user-dashboard", {
      auth: true,
      isDashboard: true,
      user,
      billingAddress: address.billingAddress[0],
      totalOrders,
      pendingOrders,
      completedOrders
    });
  } catch (error) {
    console.error(error);
  }
})

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
})

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
    if(!address) {
      return res.render("user/view-account-address", {
        auth: true,
        isDashboard: true,
        user
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
})

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
    if(!address) {
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
})

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
})

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
})

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
    throw new Error("An Error occurred " + error)
  }
})

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
    throw new Error("An Error occurred" + error)
  }
})

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
})

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
})

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
    throw new Error("Error occurred "+ error)
  }
})

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
})

// Wishlist
const wishlist = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userID = req.session.user._id;
    const user = await UserData.findById({ _id: userID }).lean();
    return res.render("user/view-wishlist", {
      auth: true,
      isDashboard: true,
      user,
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
})

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
    if(!address) {
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

})

// Order cancel
const cancelOrder = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    const { orderID, orderUpdate } = req.body;
    const userID = req.session.user._id;

    const order = await OrderData.findById({_id: orderID})

        // Order Stock management
        for(const prod of order.products) {
          let quantity = Number(prod.quantity)
          await ProductData.findByIdAndUpdate( prod.productID, { $inc: { quantities: quantity } })
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
})

// view product
const product = asyncHandler(async (req, res) => {

    if (!req.session.user) {
      return res.redirect("/login");
    }
    const productID = req.params.productID;
    const product = await ProductData.findById({ _id: productID }).lean();
    // let productName = product.name.split('-')[0]
    let productName = product.name
    console.log(productName);
    let similarProducts = product.name.includes('-') 
    ? await ProductData.find({ name: { $regex: productName } }).lean()
    : await ProductData.find({name: productName }).lean()
    similarProducts = similarProducts.map( product => {
      let { flavour, size } = product
      return { flavour, size }
    } )
    console.log(similarProducts);
    const realtedProducts = await ProductData.find({
      categoryName: product.categoryName,
    }).lean();

    res.render("user/view-product", {
      auth: true,
      product,
      realtedProducts,
      user: req.session.user,
      similarProducts
    });
})

// Sort Products
const sortProducts = asyncHandler(async(req, res, next) => {
  if (!req.session.user) {
    return res.json({ status: false, redirected: "/login", message: "Please login to Continue" });
  }

  let sort = req.query.sortType
  console.log(sort);
  let sortOpt = {}

    sortOpt = sort == 'lowToHigh' ? { price: 1 } : (sort == 'highToLow' ? { price: -1 } 
      : (sort == 'ascending' ? { name: 1 } 
        : (sort == 'descending' ? { name: -1 } 
          : (sort == 'averageRating' ? { rating: -1 } 
            : (sort == 'newArrivals' ? { createdAt: -1 } 
              : {} ) ) ) ) )
              // console.log(sortOpt);
              
    let products = await ProductData.find({}).sort(sortOpt).lean()

    return res.json({ status: true, products })
})


// Product Searching
const searchProducts = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login", message: "Please login to Continue" });
    }
    // console.log(`hlooo`);
    let search = req.query.search.trim()
    let products = await ProductData.find({ $or:
       [
        { name: { $regex: search, $options: 'i' }},
        { categoryName: { $regex: search, $options: 'i' } }
      ]
       })
    // console.log(products);
    req.session.products = products
    return res.json({status: true, redirected: '/products', products})
  } catch (error) {
    console.error(error);
  }
})

// Product Search Results
const searchResults = asyncHandler(async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id
    // req.session.products = null
    const user = await UserData.findById({ _id: userID })
    let products = req.session.products

    return res.render('user/view-searched-products', {
      auth: true,
      user,
      products
    })

})

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
      sortType
    } = req.query;

    console.log(req.query);
    // Products Sorting
    let sortOpt = {}
    sortOpt = sortType == 'lowToHigh' ? { price: 1 } : (sortType == 'highToLow' ? { price: -1 } 
      : (sortType == 'ascending' ? { name: 1 } 
        : (sortType == 'descending' ? { name: -1 } 
          : (sortType == 'averageRating' ? { rating: -1 } 
            : (sortType == 'newArrivals' ? { createdAt: -1 } 
              : {} ) ) ) ) )

              
    // Finding product Availability
    let filters = {}
    if(availability) {
      filters.quantities = { $gt: 0 }
    } else {
      filters.quantities = { $gte: 0 }
    }

    // Filtering Price 
    if(priceRange) {
      let amountCondt = {
        "uptoThousand": { salePrice: { $gte: 0 , $lte: 999  } },
        "btwThousandAndTwoThousand": { salePrice: { $gt: 1000, $lte: 1999 } },
        "btwTwoThousandAndThreeThousand": { salePrice: { $gte: 2000 , $lte: 2999  } },
        "btwThreeThousandAndFourThousand": { salePrice: { $gte: 3000 , $lte: 3999  } },
        "btwFourThousandAndFiveThousand": { salePrice: { $gte: 4000 , $lte: 4999  } },
        "aboveFiveThousand": { salePrice: { $gte: 5000 } },
      }
      Object.assign(filters, amountCondt[priceRange] || {})
    }

    
    // Filtering Based on Discount
    if(discountPercentage) {
      let discountCondt = {
        "tenPercentageAndBelow": { offer: { $gte:0, $lte: 10 } },
        "tenPercentageAndAbove": { offer: { $gte: 10 } },
        "twentyPercentageAndAbove": { offer: { $gte: 20 } },
        "thirtyPercentageAndAbove": { offer: { $gte: 30 } },
        "fourthPercentageAndAbove": { offer: { $gte: 40 } },
        "fifthPercentageAndAbove": { offer: { $gte: 50 } },
      }
      Object.assign(filters, discountCondt[discountPercentage] || {})
    }
    
    // filtering Flavours
    if(flavour && Array.isArray(flavour) && flavour.length > 0) {
        filters.flavour = { $in: flavour }
      } else if(flavour) {
      filters.flavour = { $in: [ flavour ] }
    }

    // filtering Brands
    if(brands && Array.isArray(brands) && brands.length > 0) {
        filters.brand = { $in: brands }
      } else if(brands) {
      filters.brand = { $in: [ brands ] }
    }

    let filterProducts = await ProductData.find(filters).sort(sortOpt).lean()

    filterProducts = filterProducts = null ? 0 : filterProducts

    return res.json({ status: true, filterProducts, redirected: '/products'  });
  } catch (error) {
    console.error(error);
  }
})

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
})

// Add To Cart (Product)
const addToCart = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login", message: "please login to continue" });
    }
    
    const productID = req.body.productID;
    let count = req.body.count
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
      const cartProductIndex = cart.products.findIndex( prod => prod.productID == productID );
      if (cartProductIndex !== -1) {
        if (cart.products[cartProductIndex].quantity >= productLimit || count >= productLimit) {
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
})

// User Cart
const myCart = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    let totalAmount;
    let subTotal;
    let totalSaleAmount;
    let totalDiscountAmount;
    const userID = req.session.user._id;
    // Get User cart products
    const cart = await CartData.find({ userID }).lean();
    if (!cart || cart.length === 0 || cart[0].products.length <= 0) {
      return res.render("user/view-my-cart", {
        auth: true,
        user: req.session.user,
        cart: null,
        discountPercentage: 0,
        totalSaleAmount: 0,
        totalDiscountAmount: 0,
      });
    }

    // Cart total Amount
    const cartTotal = await CartData.aggregate([
      { $match: { userID: new mongoose.Types.ObjectId(userID) } },
      { $unwind: "$products" },
      {
        $group: {
          _id: null,
          subTotal: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
          totalSaleAmount: {
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
        // userCart: cart[0].products,
        // products: productDetails[0].products,
        discountPercentage: 0,
        totalSaleAmount: 0,
        totalDiscountAmount: 0,
      });
    }

    subTotal = cartTotal[0].subTotal;
    totalSaleAmount = cartTotal[0].totalSaleAmount;
    totalDiscountAmount = cartTotal[0].totalDiscountAmount;

    let deliveryCharge = 0;
    let savedprice = Number(subTotal - totalSaleAmount);
    let discountPercentage = (savedprice / subTotal) * 100;
    discountPercentage = Math.trunc(discountPercentage);

    // Delivery Charge
    deliveryCharge = subTotal >= 15000 ? 100 : 0;

    // Total Amount (includes delivery charge too)
    totalAmount = totalSaleAmount + deliveryCharge;

    const productDetails = await CartData.find({})
      .populate("products.productID")
      .lean();
    // console.log(productDetails[0].products);
    // console.log(productDetails[0].products);
    res.render("user/view-my-cart", {
      auth: true,
      user: req.session.user,
      cart,
      userCart: cart[0].products,
      products: productDetails[0].products,
      discountPercentage,
      totalSaleAmount,
      savedprice,
      totalAmount,
      deliveryCharge,
      loginErr: req.session.errMessage
    })

    req.session.errMessage = false
  } catch (error) {
    console.error(error);
  }
})

// Removing a product from Cart
const deleteCartProduct = asyncHandler(async (req, res) => {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    const cartProductID = req.body.cartProductID;
    const userID = req.session.user._id;
    const productID = req.body.productID;

    // Removing the product completely from the cart
    await CartData.findOneAndUpdate(
      { userID, "products._id": cartProductID },
      {
        $pull: { products: { _id: cartProductID } },
      }
    );

    return res.json({
      status: true,
      message: "Product Removed from Cart",
      redirected: "/dashboard/my-cart",
    });

})

// Cart product quantity
const updateCartProductQuantity = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ status: false, redirected: "/login" });
    }
    let subTotal;
    let totalAmount = 0;
    let totalSaleAmount;
    let totalDiscountAmount;
    const userID = req.session.user._id;
    const productID = req.body.productID;
    let count = req.body.count;
    count = Number(count);
    let quantity = req.body.quantity;
    quantity = Number(quantity);
    let productQuantity;
    const productLimit = 4;
    const product = await ProductData.findById({ _id: productID });

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

    // Cart total Amount
    const cartTotal = await CartData.aggregate([
      { $match: { userID: new mongoose.Types.ObjectId(userID) } },
      { $unwind: "$products" },
      {
        $group: {
          _id: null,
          subTotal: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
          totalSaleAmount: {
            $sum: { $multiply: ["$products.quantity", "$products.salePrice"] },
          },
          totalDiscountAmount: {
            $sum: { $subtract: ["$products.price", "$products.salePrice"] },
          },
        },
      },
    ]);

    subTotal = cartTotal[0].subTotal;
    totalSaleAmount = cartTotal[0].totalSaleAmount;
    totalDiscountAmount = cartTotal[0].totalDiscountAmount;

    let deliveryCharge = 0;
    let savedprice = subTotal - totalSaleAmount;
    let discountPercentage = (savedprice / subTotal) * 100;
    discountPercentage = Math.trunc(discountPercentage);

    // Addition Delivery Fees
    totalAmount = totalSaleAmount + 50;

    // Delivery Charge
    deliveryCharge = subTotal >= 15000 ? 100 : 0;

    productQuantity = cart.products[cartProductIndex].quantity;
    return res.json({
      status: true,
      productQuantity,
      cartProductIndex,
      redirected: "/dashboard/my-cart",
      discountPercentage,
      totalSaleAmount,
      savedprice,
      totalAmount,
      deliveryCharge,
    });
  } catch (error) {
    console.error(error);
  }
})

// Order Checkout
const orderPreCheckout = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const userID = req.session.user._id;
    const cartID = req.body.cartID;
    let subTotal;
    let totalAmount = 0;
    let totalSaleAmount;
    let totalDiscountAmount;
    const user = await UserData.findById({ _id: userID }).lean();
    const address = await AddressData.findOne({ userID }).lean();
    const cart = await CartData.findOne({ _id: cartID, userID }).lean();
    // const userAddress = await AddressData.findOne({ userID });

    console.log(cart.products);

    // product Quantity(Stock) check
    for(const prod of cart.products) {
      const product = await ProductData.findById({ _id: prod.productID }).lean()
      if (!product) {
        return res.status(404).send("Product not found");
      }
      
      if(prod.quantity > product.quantities) {
        const error = new Error("The quantity of some products exceeds the available stock. Please adjust the quantities to match the available stock levels")
        const redirectPath = '/dashboard/my-cart'
        return next({ error, redirectPath });
      }
    }

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
          subTotal: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
          totalSaleAmount: {
            $sum: { $multiply: ["$products.quantity", "$products.salePrice"] },
          },
          totalDiscountAmount: {
            $sum: { $subtract: ["$products.price", "$products.salePrice"] },
          },
        },
      },
    ]);

    subTotal = cartTotal[0].subTotal;
    totalSaleAmount = cartTotal[0].totalSaleAmount;
    totalDiscountAmount = cartTotal[0].totalDiscountAmount;

    let tax = 0;
    let deliveryCharge;
    let savedprice = subTotal - totalSaleAmount;
    let discountPercentage = (savedprice / subTotal) * 100;
    discountPercentage = Math.trunc(discountPercentage);

    // Tax Calculating
    tax = subTotal >= 15000 ? 300 : 150;

    // Delivery Charge
    deliveryCharge = subTotal >= 15000 ? 100 : 0;

    // Total Amount
    totalAmount = totalSaleAmount + deliveryCharge + tax;

    if(!address) {
      return res.render("user/view-checkout", {
      auth: true,
      products: cart.products,
      user: req.session.user,
      discountPercentage,
      totalSaleAmount,
      savedprice,
      totalAmount,
      tax,
      deliveryCharge,
      cart,
      user,
    });
    }

    return res.render("user/view-checkout", {
      auth: true,
      products: cart.products,
      user: req.session.user,
      discountPercentage,
      totalSaleAmount,
      savedprice,
      totalAmount,
      tax,
      deliveryCharge,
      cart,
      user,
      address,
      billingAddress: address.billingAddress[0],
      shippingAddress: address.shippingAddress,
    });
  } catch (error) {
    console.error(error);
  }
})

const orderCheckout = asyncHandler(async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    let {
      firstName,
      lastName,
      companyName,
      address,
      zipcode,
      email,
      mobileNumber,
      paymentMethod,
      orderNotes,
      cartID,
    } = req.body;

    const userID = req.session.user._id;
    const orderAddressID = req.body.shippingAddressID
      ? req.body.shippingAddressID
      : null;
    orderNotes = orderNotes == "" ? "Nill" : orderNotes;
    zipcode = Number(zipcode);
    mobileNumber = Number(mobileNumber);
    let totalPrice;
    let totalSalePrice;
    let totalAmount = 0;

    let paymentStatus = paymentMethod == "COD" ? "Unpaid" : "Paid";
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
          totalPrice: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
          totalSalePrice: {
            $sum: { $multiply: ["$products.quantity", "$products.salePrice"] },
          },
        },
      },
    ]);

    // Cart Products
    const cart = await CartData.findById({ _id: cartID });

    totalPrice = cartTotal[0].totalPrice;
    totalSalePrice = cartTotal[0].totalSalePrice;

    let tax = 0;
    let deliveryCharge;
    let savedprice = totalPrice - totalSalePrice;
    let discountPercentage = (savedprice / totalPrice) * 100;
    discountPercentage = Math.trunc(discountPercentage);

    // Tax Calculating
    tax = totalPrice >= 15000 ? 300 : 150;

    // Delivery Charge
    deliveryCharge = totalPrice >= 15000 ? 100 : 0;

    // Total Amount
    totalAmount = totalSalePrice + deliveryCharge + tax;
    console.log(totalAmount);

    // Order Details creation
    // Order Number Creation
    let orderNumber = "#PZ" + cartID;
    orderNumber = orderNumber.slice(0, 12);

      // Order Stock management
      for(const prod of cart.products) {
        let quantity = -Number(prod.quantity)
        await ProductData.findByIdAndUpdate( prod.productID, { $inc: { quantities: quantity } })
      }

    
      // If the user is new and doesnot have any billing or shipping adress then  the inputed address will be user's address for the current order
      const userAddress = await AddressData.findOne({ userID }).lean();
      if(!userAddress) {
        // return res.render("user/post-checkout-page", {});
          let billingAddress = req.body;
          // Order creation with Billing Address
          await OrderData.create({
            orderNumber,
            userID,
            address: {
              firstName,
              lastName,
              companyName,
              address: billingAddress.address,
              country: billingAddress.country,
              state: billingAddress.state,
              city: billingAddress.city,
              zipcode: billingAddress.zipcode,
              mobileNumber: billingAddress.mobileNumber,
            },
            paymentMethod,
            totalSalePrice: totalAmount,
            totalPrice,
            orderNote: orderNotes,
            deliveryFee: deliveryCharge,
            discount: discountPercentage,
            orderActivity: [
              {
                orderStatus: "Pending",
                message: "Your order has been confirmed.",
              },
            ],
            paymentStatus,
            products: cart.products,
          });
    
        await CartData.findByIdAndDelete({ _id: cartID });
    
        return res.render("user/post-checkout-page", {billingAddress});
      }

    // If the User has selected Billing Address Billing Address //
    if (!orderAddressID) {
      const orderAddress = await AddressData.aggregate([
        {
          $match: { userID: new mongoose.Types.ObjectId(userID) },
        },
        {
          $unwind: "$billingAddress",
        },
        {
          $project: { billingAddress: 1, userID: 1 },
        },
      ]);

      let billingAddress = orderAddress[0].billingAddress;

      // Country
      let country = req.body.country
        ? req.body.country
        : billingAddress.country;

      // // State
      let state = req.body.state ? req.body.state : billingAddress.state;

      // // City
      let city = req.body.city ? req.body.city : billingAddress.city;

      // Order creation with Billing Address
      await OrderData.create({
        orderNumber,
        userID,
        address: {
          firstName,
          lastName,
          companyName,
          address,
          country,
          state,
          city,
          zipcode,
          mobileNumber,
        },
        paymentMethod,
        totalSalePrice: totalAmount,
        totalPrice,
        orderNote: orderNotes,
        deliveryFee: deliveryCharge,
        discount: discountPercentage,
        orderActivity: [
          {
            orderStatus: "Pending",
            message: "Your order has been confirmed.",
          },
        ],
        paymentStatus,
        products: cart.products,
      });

      await CartData.findByIdAndDelete({ _id: cartID });

      return res.render("user/post-checkout-page", {});
    }

    // If the User have selected Shipping Address for the Current order
    const orderAddress = await AddressData.aggregate([
      {
        $match: { userID: new mongoose.Types.ObjectId(userID) },
      },
      {
        $unwind: "$shippingAddress",
      },
      {
        $match: {
          "shippingAddress._id": new mongoose.Types.ObjectId(orderAddressID),
        },
      },
      {
        $project: { shippingAddress: 1, userID: 1 },
      },
    ]);

    let shippingAddress = orderAddress[0].shippingAddress;

    // Order creation using Billing Address
    await OrderData.create({
      orderNumber,
      userID,
      address: {
        firstName,
        lastName,
        companyName,
        address: shippingAddress.address,
        country: shippingAddress.country,
        state: shippingAddress.state,
        city: shippingAddress.city,
        zipcode: shippingAddress.zipcode,
        mobileNumber: shippingAddress.mobile,
      },
      paymentMethod,
      totalSalePrice,
      totalPrice: totalAmount,
      orderNote: orderNotes,
      deliveryFee: deliveryCharge,
      discount: discountPercentage,
      orderActivity: [
        {
          orderStatus: "Pending",
          message: "Your order has been confirmed.",
        },
      ],
      paymentStatus,
      products: cart.products,
    });

    await CartData.findByIdAndDelete({ _id: cartID });
    return res.render("user/post-checkout-page", {});
  } catch (error) {
    console.error(error);
  }
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
})

// Logout
const logout = asyncHandler(async (req, res) => {
  try { 
     const user = req.session.user
     if(user) {
      req.session.user = null
      return res.redirect("/login")
     }
  } catch (error) {
    throw new Error("User Not Found")
  }
})

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
  deleteCartProduct,
  updateCartProductQuantity,
  orderPreCheckout,
  orderCheckout,
  wallet,
  logout,
};
