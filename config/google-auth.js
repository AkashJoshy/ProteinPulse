const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const { UserData } = require('../models/userDB')
require('dotenv').config()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const PORT = process.env.PORT || 4000

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/google/callback`,
    passReqToCallback: true
  },
  async(request, accessToken, refreshToken, profile, done) => {
    console.log(profile);
    let existingUser = await UserData.findOne({ email: profile.emails[0].value }) 
    if(existingUser) {
        return done(null, existingUser)     
    }
    // New User creation
    const newUser = await UserData.create({
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
    })
    return done(null, newUser)
  }
));

// Serialize User
passport.serializeUser((user, done) => {
    done(null, user.email)
})

// Serialize User
passport.deserializeUser(async(userEmail, done) => {
    try {
        let user =  await UserData.findOne({email: userEmail})
        // console.log(user);
        if(!user) {
            return done(null, false)
        }
        return done(null, user)
    } catch (error) {
        console.error(error);
    }
})

