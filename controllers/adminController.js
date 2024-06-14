const {UserData} = require('../models/userDB')
const {CategoryData} = require('../models/categoryDB')

// Admin Login In Page
const login = async (req, res) => {
    res.render('admin/login-page', {admin: true})
}

// Admin Login checking
const doLogin = async(req, res) => {
    const {email, password} = req.body
    console.log(email, password);
    res.redirect('/admin/home-page')
}

// Admin Home Page
const homePage = async(req, res) => {
    res.render('admin/home-page', {admin: true})
}

// All Customers
const getCustomers = async (req, res) => {
    try {
        const users = await UserData.find().lean()
        //console.log(users)
        res.render('admin/view-customers', {admin: true, users})
    } catch (error) {
        console.error(error);
    }
}

// View Single Edit Customer
const viewCustomer = async (req, res) => {
    const userID = req.params.userID
    let user = await UserData.findById({_id: userID}).lean()
    // console.log(user)
    res.render('admin/edit-customer', {admin: true, user})
}

// Edit Customer
const editCustomer = async (req, res) => {
    try {
        console.log(req.body)
        await UserData.findByIdAndUpdate({_id: req.body.userID}, {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            mobileNumber: req.body.mobileNumber
        })
        res.redirect('/admin/customers')
    } catch (error) {
        console.error(error);
    }
}

// Delete Customer (Soft Delete)
const softDeleteCustomer = async (req, res) => {
    try {
        const userID = req.params.userID
        await UserData.findByIdAndUpdate(userID, {isBlocked: true})
        res.redirect('/admin/customers')
    } catch (error) {
        console.error(error);
    }
}

// Category 
const getCategories = async (req, res) => {
    try {
        let categories = await CategoryData.find().lean()
        res.render('admin/view-categories', {admin: true, categories})
    } catch (error) {
        console.error(error);
    }
} 

// Add Category
const addCategory = async(req, res) => {
    res.render('admin/add-category', {admin: true})
}

const saveAddCategory = async(req, res) => {
    try {
        
        // const pagePath = "kk"
        let category = await CategoryData.create(req.body)
        await category.save()
        if(req.files && req.files.file) {
            let categoryImage = req.files.file
            await categoryImage.mv('./public/picture/categories/' + category._id + '.jpg', err => {
                if(err) {
                    console.error(err);
                    console.log(`File is Not Uploaded`)
                } else {
                    console.log(`File is Uploaded to Folder`)
                }
            })
        }
        // console.log(req.body)
        res.redirect('/admin/category')
    } catch (error) {
        console.error(error);
    }
}

// View Edit Category
const editCategory = async(req, res) => {
    try {
        const categoryID = req.params.categoryID
        const category = await CategoryData.findById({_id: categoryID}).lean()
        res.render('admin/edit-category', {admin: true, category})
    } catch (error) {
        console.error(error);
    }
}

// Edit Category
const saveEditCategory = async(req, res) => {
    try {
        const categoryID = req.body.categoryID
        if(req?.files?.file) {
            let categoryImage = req.files.file
            categoryImage.mv('./public/picture/categories/' + categoryID + '.jpg')
        }
        await CategoryData.findByIdAndUpdate({_id: categoryID}, {
            name: req.body.name,
            description: req.body.description
        })
        res.redirect('/admin/category')
    } catch (error) {
        console.error(error);
    }
}

// View all Products
const getProducts = async (req, res) => {
    res.render('admin/view-products', {admin: true})
}

const addProduct = async (req, res) => {
    res.render('admin/add-product', {admin: true})
}

const editProduct = async (req, res) => {
    const productID = req.params.productID
    res.render('admin/edit-product', {admin: true})
}

module.exports = {
    login,
    doLogin,
    homePage,
    getCustomers,
    getCategories,
    viewCustomer,
    editCustomer,
    softDeleteCustomer,
    addCategory,
    saveAddCategory,
    editCategory,
    saveEditCategory,
    getProducts,
    addProduct,
    editProduct
}