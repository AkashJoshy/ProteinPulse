const { UserData } = require("../models/userDB");
const { CategoryData } = require("../models/categoryDB");
const { ProductData } = require("../models/productDB");
const { CouponData } = require('../models/CouponDB')
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
        res.redirect("/admin/dashboard");
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

// Admin DashBoard
const dashboard = asyncHandler(async(req, res, next) => {
  if(!req.session.admin) {
    return res.redirect('/admin/')
  }

  return res.render('admin/dashboard', {
    admin: true, 
    admin1: req.session.admin
  })
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
    const page = Number(req.query.page) || 1

    const limit = req.query.limit || 3
    const search = req.query.search || ""
    const skip = (page - 1) * limit

    console.log(`Search: ${search}`);

    // Define an Search Filter, cause countDocument expects object not array
    const searchFilter = search !== "" ? { name: { $regex: search, $options: `i` } } : {}

    const totalDoc = await CategoryData.countDocuments(searchFilter)
    const totalPages =  Math.ceil(totalDoc/limit)

    // Pagination
    const pagination = {
      isPrevious: page > 1,
      currentPage: page,
      isNext: page < totalPages,
      totalPages
    }
    
    let categories = await CategoryData.find(searchFilter).limit(limit).skip(skip).lean();
    return res.render("admin/view-categories", {
      admin: true,
      categories,
      admin1: req.session.admin,
      pagination
    });
})

// category queryies like search, filter, sort
const categoryQuery = asyncHandler(async (req, res, next) => {
    if(!req.session.admin) {
      return res.json({ status: false, redirected: '/admin/' })
    }
    const search = req.query.search || ""
    const page = Number(req.query.page) || 1
    const limit = 3
    const skip = (page - 1) * limit

    // Define an Search Filter, cause countDocument expects object not array
    const searchFilter = search !== "" ? { name: { $regex: search, $options: `i` } } : {}

    // total Doc and total Pages
    const totalDoc = await CategoryData.countDocuments(searchFilter)
    const totalPages = Math.ceil( totalDoc / limit )
    
    // Pagination
    const pagination = {
      isPrevious: page > 1,
      currentPage: page,
      isNext: page < totalPages,
      totalPages
    }

    let categories = await CategoryData.find(searchFilter).limit(limit).skip(skip).lean()
  //  let categories = await CategoryData.find(searchFilter).lean()
    return res.json({ status: true, categories, redirected:'/admin/category', pagination })
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


// Delete Category
const deleteCategory = asyncHandler(async (req, res, next) => {
  if(!req.session.admin) {
    return res.json({ status: false, redirected: '/admin/' })
  }
  const categoryID = req.params.categoryID

  // Deleting Category and storing details in a variable called category
  const category = await CategoryData.findByIdAndDelete({ _id: categoryID }).lean()
  
  return res.json({ status: true, message: `${category.name} Deleted` })
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
    const productID = req.body.productID
    console.log(productID)
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
    console.log(orders)
    
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

// Get Single Order
const viewOrder = asyncHandler(async(req, res, next) => {
  if(!req.session.admin) {
    return res.redirect('/admin/')
  }

  const orderID = req.params.orderID

  // single Order Details
  const order = await OrderData.findById({ _id: orderID }).lean()
  order.createdAt = moment(order.createdAt).format('MMMM Do YYYY HH:mm:ss')

//  console.log(order)

  return res.render('admin/view-order', {
    admin: true,
    order,
    admin1: req.session.admin,
  })
})

// Change Order Status
const updateOrderStatus = asyncHandler(async(req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: '/admin/' })
    }
    let {
      orderID,
      orderStatus
    } = req.body
    console.log(orderStatus);

    let status = {
      message: '',
      payment: ''
    }
 
    status.message = orderStatus == 'Pending' ? `Your order is pending and will be processed soon`
      : ( orderStatus == 'Processing' ? `Your order is currently being processed`
        : ( orderStatus == 'Shipped' ? `Your order has been shipped` 
          : ( orderStatus == 'Out for Delivery' ? `Your order is out for delivery and should arrive soon` 
            : ( orderStatus == 'Delivered' ? `Your order has been delivered` 
              : ( orderStatus == 'Cancelled' ? `Your order has been cancelled`
                : ( orderStatus == 'Returned' ? `Your order has been returned`
                  : ( orderStatus == 'Refunded' ? `Your order has been successfully refunded` 
                    : `Your order is holding. Update soon` ) ) ) ) ) ) )

    status.payment =  orderStatus == 'Pending' ? `Unpaid`
    : ( orderStatus == 'Processing' ? `Unpaid`
      : ( orderStatus == 'Shipped' ? `Unpaid` 
        : ( orderStatus == 'Out for Delivery' ? `Unpaid` 
          : ( orderStatus == 'Delivered' ? `Paid` 
            : ( orderStatus == 'Cancelled' ? `cancelled`
              : ( orderStatus == 'Returned' ? `Paid`
                : ( orderStatus == 'Refunded' ? `Refund` 
                  : `Your order is holding. Update soon` ) ) ) ) ) ) )

  //  console.log(status)

    // Order Status updating
    const order = await OrderData.findByIdAndUpdate(
      {_id: orderID},
      {
        $set: { status: orderStatus, paymentStatus: status.payment },
      $push: { orderActivity: { orderStatus: orderStatus, message: status.message }  }
    })

    // And also change the product status too
    // checks if any products in the order Collection
    let orderProducts
    if(order.products.length > 0) {
      orderProducts = await Promise.all(order.products.map( async(product) =>{
        await OrderData.findOneAndUpdate({ _id: orderID, 'products.productID': product.productID }, 
          { $set: { 'products.$.status': orderStatus } }
        )
      }))
    }

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

// Coupon Management
const couponPage = asyncHandler(async (req, res, next) => {
  if(!req.session.admin) {
    return res.redirect('/admin/')
  }

  let coupons = await CouponData.find({}).lean()

  coupons = coupons.map(coupon => {
    let { expiryDate } = coupon
    let formattedDate = moment(expiryDate).format('YYYY-MM-DD')
    return { ...coupon, expiryDate: formattedDate }
  })

  res.render("admin/view-coupons", {
    admin: true,
    coupons,
    admin1: req.session.admin,
    successMsg: req.session.successMsg,
    errMsg: req.session.errMessage,
  })
  req.session.successMsg = false
  req.session.errMessage = false
  return
})

// Add Coupon
const addCoupon = asyncHandler(async (req, res, next) => {
  if(!req.session.admin) {
    return res.redirect('/admin/')
  }

  let {
    code,
    couponType,
    description,
    maxDiscount,
    limit,
    minOrderValue,
    discount,
    expiryDate
  } = req.body

  // Converting String's to Number
  maxDiscount = Number(maxDiscount),
  limit = Number(limit)
  minOrderValue = Number(minOrderValue)
  discount = Number(discount)

  // Expiry Date
//  expiryDate = moment(expiryDate)

  // Check if the Coupon with same code already existed...
  const coupon = await CouponData.findOne({code: code})

  // If the Coupon code is new
  if(!coupon) {
    await CouponData.create({
      code,
      couponType,
      description,
      maxDiscount,
      limit,
      minOrderValue,
      discount,
      expiryDate
    })
    req.session.successMsg = "New Coupon Added"
    return res.redirect('/admin/coupon-management')
  }

  // Avoid the duplication of Coupon Code
  const error = new Error("Coupon already existed")
  const redirectPath = "/admin/coupon-management"
  return next({ error, redirectPath })
})

// Delete Coupon
const deleteCoupon = asyncHandler(async (req, res, next) => {
  if(!req.session.admin) {
    return res.json({ status: false, redirected: '/admin/' })
  }
  const couponID = req.params.couponID
  await CouponData.findByIdAndDelete({ _id: couponID })
  console.log(couponID)
  return res.json({ status: true, message: "Coupon Deleted" })
})

// Sales reports
const salesReports = asyncHandler(async(req, res, next) => {
  if(!req.session.admin) {
    return res.redirect('/admin/')
  }

  return res.render('admin/view-sales-reports', {
    admin: true,
    admin1: req.session.admin,
  })
})


// Get Sales reports
const getSalesReports = asyncHandler(async(req, res, next) => {
  if(!req.session.admin) {
    return res.json({ status: false, redirected: '/admin/' })
  }

  let { startDate, endDate } = req.query
  let orders = await OrderData.find({ createdAt: { $gte: startDate, $lte: endDate }, paymentStatus: 'Unpaid' }).lean()
//  console.log(startDate, endDate)
  console.log(orders)

  return res.json({ status: true, orders })

})


// Carousal Management
const getCarousels = asyncHandler(async(req, res, next) => {
  if(!req.session.admin) {
    return res.redirect('/admin/')
  }

  return res.render('admin/view-carousels', {
    admin: true,
    admin1: req.session.admin,
  })
})


// View Add Carousel page
const viewAddCarousel = asyncHandler(async (req, res, next) => {
  if(!req.session.admin) {
    return res.redirect('/admin/')
  }
  
  return res.render('admin/add-carousel', {
    admin: true,
    admin1: req.session.admin,
  })
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
  dashboard,
  getCustomers,
  getCategories,
  categoryQuery,
  viewCustomer,
  editCustomer,
  softDeleteCustomer,
  restoreCustomer,
  addCategory,
  saveAddCategory,
  editCategory,
  saveEditCategory,
  deleteCategory,
  getProducts,
  addProduct,
  saveProduct,
  editProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  sortProducts,
  getOrders,
  viewOrder,
  updateOrderStatus,
  orderSorting,
  couponPage,
  addCoupon,
  deleteCoupon,
  salesReports,
  getSalesReports,
  getCarousels,
  viewAddCarousel,
  settings,
  logout,
};
