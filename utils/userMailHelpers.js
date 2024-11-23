const { UserData } = require('../models/userDB')
const nodemailer = require('nodemailer')
require('dotenv').config()

// Company Info
const email = process.env.COMPANY_GMAIL;
const password = process.env.COMPANY_PASS;
const transporterHost = process.env.TRANSPORTER_HOST;
const transporterPort = process.env.TRANSPORTER_PORT;
const port = process.env.PORT || 4000;


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

async function verifyEmail(userID) {
  try {
    // Generating JWT Token
    const token = jwt.sign({ id: userID }, process.env.SECRET, {
      expiresIn: process.env.JWT_EXPIRES_TIME,
    });

    const user = await UserData.findById(userID);

    if (!user) {
      throw new Error(`User not Found`);
    }

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


module.exports = {
  changePasswordOtpSent,
  verifyEmail
}