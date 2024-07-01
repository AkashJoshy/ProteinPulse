const { UserData } = require("../models/userDB");
const { CategoryData } = require("../models/categoryDB");
const { ProductData } = require("../models/productDB");
const asyncHandler = require('express-async-handler')
const moment = require('moment')
const bcrypt = require("bcrypt");
const { OrderData } = require("../models/OrderDB");


// Admin Login In Page
const login = asyncHandler(async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/home-page");
  } else {
    res.render("admin/login-page", {
      admin: true,
      loginErr: req.session.errMessage,
      admin1: req.session.admin,
    });
    req.session.errMessage = false;
  }
})

// Admin Login checking
const doLogin = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const admin = await UserData.findOne({ email: email, isAdmin: true });
    console.log(admin);
    if (admin) {
      const matchedPassword = await bcrypt.compare(password, admin.password);
      if (matchedPassword) {
        req.session.admin = admin;
        res.redirect("/admin/home-page");
      } else {
        const error = new Error('Password is Incorrect')
        const redirectPath = '/admin/'
        return next( {error, redirectPath } )
      }
    } else {
      const error = new Error('Admin is not Found')
      const redirectPath = '/admin/'
      return next( {error, redirectPath } )
    }
})

// Admin Home Page
const homePage = asyncHandler(async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }
  console.log(req.session.admin);
  res.render("admin/home-page", { admin: true, admin1: req.session.admin });
})

// All Customers
const getCustomers = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const page = req.query.page || 1
    const limit = 10

    const skip = (page - 1) * limit

    const totalCustomers = await ProductData.countDocuments()
    const totalPages = Math.ceil(totalCustomers/limit)

    const users = await UserData.find({ isAdmin: false }).skip(skip).limit(limit).lean();

      // Pagination 
      const pagination = {
        currentPage: page,
        previousPage: page > 1,
        nextPage: page < totalPages,
        totalPages
      }

    res.render("admin/view-customers", {
      admin: true,
      users,
      admin1: req.session.admin,
      pagination
    });
  } catch (error) {
    console.error(error);
  }
})

// View Single Edit Customer
const viewCustomer = async (req, res) => {
  const userID = req.params.userID;
  let user = await UserData.findById({ _id: userID }).lean();
  // console.log(user)
  res.render("admin/edit-customer", {
    admin: true,
    user,
    admin1: req.session.admin,
  });
};

// Edit Customer
const editCustomer = asyncHandler(async (req, res) => {
  try {
    console.log(req.body);
    await UserData.findByIdAndUpdate(
      { _id: req.body.userID },
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        mobileNumber: req.body.mobileNumber,
      }
    );
    res.redirect("/admin/customers");
  } catch (error) {
    console.error(error);
  }
})

// Delete Customer (Soft Delete)
const softDeleteCustomer = asyncHandler(async (req, res) => {
  try {
    const userID = req.body.userID;
    await UserData.findByIdAndUpdate({ _id: userID }, { isBlocked: true });
    return res.json({status: true, redirected: '/admin/customers'})
  } catch (error) {
    throw new Error("Error Occured")
  }
})

// Restore Customer
const restoreCustomer = asyncHandler(async (req, res) => {
  try {
    const userID = req.body.userID;
    await UserData.findByIdAndUpdate({ _id: userID }, { isBlocked: false });
    return res.json({status: true, redirected: '/admin/customers'})
  } catch (error) {
    console.error(error);
  }
})

// Category
const getCategories = asyncHandler(async (req, res) => {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    let categories = await CategoryData.find().lean();
    res.render("admin/view-categories", {
      admin: true,
      categories,
      admin1: req.session.admin,
    });

})

// Add Category
const addCategory = asyncHandler(async (req, res) => {
      if (!req.session.admin) {
          return res.redirect("/admin/");
        }
      return res.render("admin/add-category", { admin: true, admin1: req.session.admin });
})

const saveAddCategory = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const { name, description } = req.body;
    let isImage;
    console.log(req.files);
    if (req.files) {
      isImage = req.files.map((file) => file.filename);
    }
    const [image] = isImage;
    let category = await CategoryData.create({
      name,
      description,
      image,
    });
    await category.save();
    res.redirect("/admin/category");
  } catch (error) {
    console.error(error);
  }
})

// View Edit Category
const editCategory = asyncHandler(async (req, res) => {
    const categoryID = req.params.categoryID;
    const category = await CategoryData.findById({ _id: categoryID }).lean();
    res.render("admin/edit-category", {
      admin: true,
      category,
      admin1: req.session.admin,
    });

})

// Edit Category
const saveEditCategory = asyncHandler(async (req, res) => {
  try {
    if(!req.session.admin) {
      return res.redirect('/admin/')
    }
    let isImage;
    const categoryID = req.body.categoryID;
    if (req.files) {
      isImage = req.files.map((file) => file.filename);
      console.log(isImage);
    }
    const [image] = isImage;
    await CategoryData.findByIdAndUpdate(
      { _id: categoryID },
      {
        name: req.body.name,
        description: req.body.description,
        image: image,
      }
    );
    res.redirect("/admin/category");
  } catch (error) {
    console.error(error);
  }
})

// softDeleteCategory
const softDeleteCategory = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({status: false, redirected: '/admin/'})
    }
    const categoryID = req.body.categoryID;
    console.log(categoryID);
    await CategoryData.findOneAndUpdate(
      { _id: categoryID },
      { isActive: false }
    );
    return res.json({status: true, redirected: '/admin/category'})
  } catch (error) {
    console.error(error);
  }
})

// Restore Category
const restoreCategory = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({status: false, redirected: '/admin/'})
    }
    const categoryID = req.body.categoryID;
    await CategoryData.findByIdAndUpdate(
      { _id: categoryID },
      { isActive: true }
    );
    return res.json({status: true, redirected: '/admin/category'})
  } catch (error) {
    console.error(error);
  }
})

// View all Products
const getProducts = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const page = Number(req.query.page) || 1
    const limit = 2

    // skip calculating for per Page
    const skip = (page - 1) * limit

    // Total Product calculation
    const totalProduct = await ProductData.find().countDocuments()
    // Total Page - Here limit is 2, so Total prod / limit
    const totalPages = Math.ceil(totalProduct/limit)

    // Products fetching to current page
    let products = await ProductData.find().skip(skip).limit(limit).lean()

    products = products.map(product => {
      let { createdAt } = product
      let formatedDate = moment(createdAt).format('MMMM Do YYYY HH:mm:ss')
      return {...product, createdAt: formatedDate}
    })

    // Pagination 
    const pagination = {
      currentPage: page,
      previousPage: page > 1,
      nextPage: page < totalPages,
      totalPages
    }

    res.render("admin/view-products", {
      admin: true,
      products,
      admin1: req.session.admin,
      pagination
    });
  } catch (error) {
    console.error(error);
  }
})

// Add Product
const addProduct = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const categories = await CategoryData.find({}, { name: 1 }).lean();
    res.render("admin/add-product", {
      admin: true,
      categories,
      admin1: req.session.admin,
    });
  } catch (error) {
    throw new Error("Something Wrong" + error);
  }
})

//
const saveProduct = asyncHandler(async (req, res) => {
  try {
    let {
      name,
      categoryName,
      description,
      highlights,
      price,
      salePrice,
      rating,
      flavour,
      size,
      units,
      quantities,
      origin,
      bestBefore,
    } = req.body;
    console.log(req.body);
    price = Number(price);
    salePrice = Number(salePrice);
    rating = Number(rating);
    quantities = Number(quantities);
    quantities <= 0 ? 1 : quantities
    // console.log(req.files);
    size = size + units
    let offer = (price - salePrice) / price
    offer = Math.trunc(offer * 100) 
    // let imageUrl = req.files.map((file) => file.filename);
    await ProductData.create({
      name,
      categoryName,
      description,
      highlights,
      price,
      salePrice,
      offer,
      rating,
      flavour,
      size,
      quantities,
      origin,
      bestBefore,
      // imageUrl,
    })
    res.redirect("/admin/products");
  } catch (error) {
    console.error(`the Error ${error}`);
    throw new Error("Something Wrong" + error);
  }
})

// Edit Product
const editProduct = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const productID = req.params.productID;
    const product = await ProductData.findById({ _id: productID }).lean();
    const [size, unit] = product.size.split(' ')
    const categories = await CategoryData.find({}, { name: 1 }).lean();
    res.render("admin/edit-product", {
      admin: true,
      categories,
      product,
      size,
      unit,
      admin: req.session.admin,
    });
  } catch (error) {
    console.error(error);
  }
})

// Update Product
const updateProduct = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    let {
      name,
      categoryName,
      description,
      highlights,
      price,
      salePrice,
      rating,
      flavour,
      size,
      unit,
      quantities,
      origin,
      bestBefore,
      prodID,
    } = req.body;
    // console.log(req.body);
    // console.log(req.files);
    let offer = (price - salePrice) / price
    offer = Math.trunc(offer * 100) 
    // To get the index value of the Image To Update
    let imageIndex = req.files.map((file) => {
      let fileLength = "file".length;
      let fileName = file.fieldname.slice(fileLength);
      fileName = Number(fileName);
      return fileName;
    });
    // console.log(imageIndex);
    price = Number(price);
    salePrice = Number(salePrice);
    rating = Number(rating);
    quantities = Number(quantities);
    quantities = quantities <= 0 ? 1 : quantities
    let product = await ProductData.findById({ _id: prodID });

    // shallow copying of product.imageUrl
    let imageUrl = product.imageUrl.slice();
    // console.log(`ALL Files: ${imageUrl}`);
    // console.log(req.files);
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        imageIndex.forEach((value) => {
          console.log(file.filename);
          console.log(value);
          if (value || value === index + 1) {
            imageUrl[value - 1] = file.filename;
          }
          console.log(value);
        });
      });
    }

    // Ternary operator
    bestBefore = bestBefore === "" ? product.bestBefore : bestBefore;

    // Size
    size = size +" "+ unit
    console.log(size);

    let updatedProduct =  await ProductData.findByIdAndUpdate(
      { _id: prodID },
      {
        name,
        categoryName,
        description,
        highlights,
        price,
        salePrice,
        offer,
        rating,
        flavour,
        size,
        quantities,
        origin,
        bestBefore,
        imageUrl,
      }
    );
    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
  }
})

// Upadate Stock product
const updateProductStock = asyncHandler(async (req, res) => {
  try {
    if(!req.session.admin) {
      return res.redirect('/login')
    }
    console.log(req.body);
    const productID = req.body.productID
    const stock = req.body.stock

    await ProductData.findByIdAndUpdate({ _id: productID }, 
      {$inc: {quantities: stock }}
    )
    return res.redirect('/admin/products')
  } catch (error) {
    console.error(error);
    
  }
})

// Delete Product
const deleteProduct = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({status: false, redirected: '/admin/'})
    }
    const productID = req.body.productID;
    await ProductData.findByIdAndDelete(
      { _id: productID },
    );
    return res.json({status: true, redirected: '/admin/products'})
  } catch (error) {
    console.error(error);
  }
})


// Sort Products
const sortProducts = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({status: false, redirected: '/admin/'})
    }
    const filter = req.query.filter
    const page = Number(req.query.page) || 1
    const limit = 2
    const skip = (page - 1) * limit

    // Total Products
    const totalProducts = await ProductData.countDocuments()
    const totalPages = Math.ceil(totalProducts/limit)

    // Sorting Dynamically with option
    let sortOpt = {}

    sortOpt = filter == 'lowToHigh' ? { price: 1 } : (filter == 'highToLow' ? { price: -1 } 
      : (filter == 'ascending' ? { name: 1 } 
        : (filter == 'descending' ? { name: -1 } 
          : (filter == 'averageRating' ? { rating: -1 } 
            : (filter == 'newArrivals' ? { createdAt: -1 } 
              : {} ) ) ) ) )
              // console.log(sortOpt);
              
    
    // Pagination 
    const pagination = {
      currentPage: page,
      previousPage: page > 1,
      nextPage: page < totalPages,
      totalPages
    }

    let products = await ProductData.find({}).sort(sortOpt).skip(skip).limit(limit).lean()
      products = products.map(product => {
        let { createdAt } = product
        let formatedDate = moment(createdAt).format('MMMM Do YYYY HH:mm:ss')
        return {...product, createdAt: formatedDate}
      })
      return res.json({ status: true, products, pagination })
  } catch (error) {
    console.error(error);
  }
})

// Get Orders
const getOrders = asyncHandler(async(req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect('/admin/')
    }

    const page = req.query.page || 1
    const limit = 7

    const skip = (page - 1) * limit

    const totalOrders = await OrderData.countDocuments()
    const totalPages = Math.ceil(totalOrders/limit)
    
    let orders = await OrderData.find({}).skip(skip).limit(limit).lean()

      // Pagination 
      const pagination = {
        currentPage: page,
        previousPage: page > 1,
        nextPage: page < totalPages,
        totalPages
      }
    
    orders = orders.map(order => {
      let { createdAt } = order 
      let formatedDate = moment(createdAt).format('MMMM Do YYYY HH:mm:ss')
      return { ...order, createdAt: formatedDate }
    })
    return res.render('admin/view-orders', {
      admin: true,
      orders,
      admin1: req.session.admin,
      pagination
    })

  } catch (error) {
    console.error(error);
  }
})

// Change Order Status
const updateOrderStatus = asyncHandler(async(req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: '/admin/'})
    }
    let {
      orderID,
      orderStatus
    } = req.body
    console.log(orderStatus);

    // If Order Status is Delivered
    if(orderStatus == 'Delivered') {
      await OrderData.findByIdAndUpdate(
        {_id: orderID},
        {
          $set: { status: orderStatus, paymentStatus: "Paid" },
          $push: { orderActivity: { orderStatus: orderStatus, message: "Your order has been Delivered." } }
        })
      return res.json({ status: true, redirected: '/admin/orders' })
    }

    if(orderStatus == 'Refunded') {
      await OrderData.findByIdAndUpdate(
        {_id: orderID},
        {
          $set: { status: orderStatus, paymentStatus: "Refunded" },
          $push: { orderActivity: { orderStatus: orderStatus, message: "Your order has been Delivered." } }
        })
      return res.json({ status: true, redirected: '/admin/orders' })
    }


    // Rest Status updating
    const order = await OrderData.findByIdAndUpdate(
      {_id: orderID},
      {
        $set: { status: orderStatus, paymentStatus: "Unpaid"},
      $push: { orderActivity: { orderStatus: orderStatus, message: "Your order has been Delivered." }  }
    })
    console.log(order);
    return res.json({ status: true, redirected: '/admin/orders' })
  } catch (error) {
    console.error(error);
  }
})

// Order Sorting
const orderSorting = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: '/admin/'})
    }
    
    let filterName = req.params.filter
    
    if(filterName == 'no-filter') {
      const orders = await OrderData.find({}).lean()
      return res.json({ status: true, redirected: '/admin/orders', orders })
    }
    
    if(filterName == 'ascending') {
      const orders = await OrderData.find({}).sort({orderNumber: 1}).lean()
      return res.json({ status: true, orders })
    }

    if(filterName == 'descending') {
      const orders = await OrderData.find({}).sort({orderNumber: -1}).lean()
      return res.json({ status: true, orders })
    }

    if(filterName == 'high-to-low') {
      const orders = await OrderData.find({}).sort({totalSalePrice: -1}).lean()
      return res.json({ status: true, orders })
    }

    const orders = await OrderData.find({}).sort({totalSalePrice: 1}).lean()
    
    return res.json({ status: true, redirected: '/admin/orders', orders })
  } catch (error) {
    console.error(error);
    
  }
})


// Settings
const settings = asyncHandler(async (req, res) => {

    if(!req.session.admin) {
      return res.redirect('/admin/')
    }
    const adminID = req.session.admin._id
    let currentAdmin = await UserData.findById({_id: adminID}).lean()
    return res.render('admin/view-settings', {
      admin: true,
      admin1: req.session.admin,
      currentAdmin
    })
})

// Logout
const logout = asyncHandler(async (req, res) => {
  try {
    const adminID = req.params.adminID;
    console.log(adminID);
    const admin = await UserData.findOne({ _id: adminID });
    if (admin) {
      req.session.admin = null;
      res.redirect("/admin/");
    }
  } catch (error) {
    console.error(error);
  }
})

module.exports = {
  login,
  doLogin,
  homePage,
  getCustomers,
  getCategories,
  viewCustomer,
  editCustomer,
  softDeleteCustomer,
  restoreCustomer,
  addCategory,
  saveAddCategory,
  editCategory,
  saveEditCategory,
  softDeleteCategory,
  restoreCategory,
  getProducts,
  addProduct,
  saveProduct,
  editProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  sortProducts,
  getOrders,
  updateOrderStatus,
  orderSorting,
  settings,
  logout,
};
