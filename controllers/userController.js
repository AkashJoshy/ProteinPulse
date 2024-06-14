const {UserData} = require('../models/userDB')
const {CategoryData} = require('../models/categoryDB')

//  User Home Page
const homePage = async (req, res) => {
    const categories = await CategoryData.find().lean()
    res.render('user/home-page', {auth: true, categories})
}

const Login = async(req, res) => {
    res.render('user/login-page')
}

const doLogin = async(req, res) => {
    console.log(req.body)
    try {
        let user = await UserData.find({email: req.body.email})
        console.log(user)
        console.log(user.firstName)
        if(user.length > 0) {
            res.redirect('/')
        } else {
           // let userFailed = "Incorrect Email or Password"
            res.redirect('/login')    
        }
    } catch (error) {
        console.error(error);
    }
}

const socialLogin = async(req, res) => {
    
    res.render('user/login-social-page')
}

const signup = async (req, res) => {
    res.render('user/signup-page')
}

const doSignup = async(req, res) => {
    console.log(req.body);
    try {
        const user = await UserData.create(req.body)
        await user.save()
    } catch (error) {
        console.error(error)
    }
    res.redirect('/signup-otp')
}

const signupOtpConfirm = async(req, res) => {
    res.render('user/signup-otp-page')
}

const forgotPassword = async(req, res)=> {
    res.render('user/forgot-password')
}

const forgotPasswordOtpConfirm = async(req, res) => {
    res.render('user/forgot-password-otp-page')
}

const categories = async (req, res) => {
    const categoryName = req.params.categoryName
    res.render('user/categories-page', {auth: true, categoryName})
}

const sample = async(req, res) => {
    res.render('sample')
}

module.exports = {
    homePage,
    Login,
    doLogin,
    socialLogin,
    signup,
    doSignup,
    signupOtpConfirm,
    forgotPassword,
    forgotPasswordOtpConfirm,
    categories,
    sample
}