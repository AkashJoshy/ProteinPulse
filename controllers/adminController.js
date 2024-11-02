const { UserData } = require("../models/userDB");
const { CategoryData } = require("../models/categoryDB");
const { ProductData } = require("../models/productDB");
const { CouponData } = require("../models/CouponDB");
const { OfferData } = require("../models/OfferDB")
const asyncHandler = require("express-async-handler");
const PDFDocument = require('pdfkit')
const fs = require('fs')
const stream = require('stream')
const moment = require("moment");
const bcrypt = require("bcrypt");
const { OrderData } = require("../models/OrderDB");
const path = require("path");
const { products } = require("./userController");

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
});

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
      const error = new Error("Password is Incorrect");
      const redirectPath = "/admin/";
      return next({ error, redirectPath });
    }
  } else {
    const error = new Error("Admin is not Found");
    const redirectPath = "/admin/";
    return next({ error, redirectPath });
  }
});

// Admin DashBoard
const dashboard = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  // Total Products
  const products = await ProductData.find({}).countDocuments()

  // Total Users
  const users = await UserData.find({ isAdmin: false }).countDocuments()

  // Total Orders
  const orders = await OrderData.find({}).countDocuments()

  // Total sales [payment succesfull]
  const totalSales = await OrderData.find({ paymentStatus: 'Paid' }).countDocuments()


  return res.render("admin/dashboard", {
    admin: true,
    admin1: req.session.admin,
    products,
    users,
    orders,
    totalSales,
  });
});

// All Customers
const getCustomers = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const page = req.query.page || 1;
    const limit = 10;

    const skip = (page - 1) * limit;

    const totalCustomers = await ProductData.countDocuments();
    const totalPages = Math.ceil(totalCustomers / limit);

    const users = await UserData.find({ isAdmin: false })
      .skip(skip)
      .limit(limit)
      .lean();

    // Pagination
    const pagination = {
      currentPage: page,
      previousPage: page > 1,
      nextPage: page < totalPages,
      totalPages,
    };

    res.render("admin/view-customers", {
      admin: true,
      users,
      admin1: req.session.admin,
      pagination,
    });
  } catch (error) {
    console.error(error);
  }
});

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
});

// Delete Customer (Soft Delete)
const softDeleteCustomer = asyncHandler(async (req, res) => {
  try {
    const userID = req.body.userID;
    await UserData.findByIdAndUpdate({ _id: userID }, { isBlocked: true });
    return res.json({ status: true, redirected: "/admin/customers" });
  } catch (error) {
    throw new Error("Error Occured");
  }
});

// Restore Customer
const restoreCustomer = asyncHandler(async (req, res) => {
  try {
    const userID = req.body.userID;
    await UserData.findByIdAndUpdate({ _id: userID }, { isBlocked: false });
    return res.json({ status: true, redirected: "/admin/customers" });
  } catch (error) {
    console.error(error);
  }
});

// Category
const getCategories = asyncHandler(async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }
  const page = Number(req.query.page) || 1;

  const limit = req.query.limit || 3;
  const search = req.query.search || "";
  const skip = (page - 1) * limit;

  console.log(`Search: ${search}`);

  // Define an Search Filter, cause countDocument expects object not array
  const searchFilter =
    search !== "" ? { name: { $regex: search, $options: `i` } } : {};

  const totalDoc = await CategoryData.countDocuments(searchFilter);
  const totalPages = Math.ceil(totalDoc / limit);

  // Pagination
  const pagination = {
    isPrevious: page > 1,
    currentPage: page,
    isNext: page < totalPages,
    totalPages,
  };

  let categories = await CategoryData.find(searchFilter)
    .limit(limit)
    .skip(skip)
    .lean();
  return res.render("admin/view-categories", {
    admin: true,
    categories,
    admin1: req.session.admin,
    pagination,
  });
});

// category queryies like search, filter, sort
const categoryQuery = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }
  const search = req.query.search || "";
  const page = Number(req.query.page) || 1;
  const limit = 3;
  const skip = (page - 1) * limit;

  // Define an Search Filter, cause countDocument expects object not array
  const searchFilter =
    search !== "" ? { name: { $regex: search, $options: `i` } } : {};

  // total Doc and total Pages
  const totalDoc = await CategoryData.countDocuments(searchFilter);
  const totalPages = Math.ceil(totalDoc / limit);

  // Pagination
  const pagination = {
    isPrevious: page > 1,
    currentPage: page,
    isNext: page < totalPages,
    totalPages,
  };

  let categories = await CategoryData.find(searchFilter)
    .limit(limit)
    .skip(skip)
    .lean();
  //  let categories = await CategoryData.find(searchFilter).lean()
  return res.json({
    status: true,
    categories,
    redirected: "/admin/category",
    pagination,
  });
});

// Add Category
const addCategory = asyncHandler(async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }
  return res.render("admin/add-category", {
    admin: true,
    admin1: req.session.admin,
  });
});

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
});

// View Edit Category
const editCategory = asyncHandler(async (req, res) => {
  const categoryID = req.params.categoryID;
  const category = await CategoryData.findById({ _id: categoryID }).lean();
  res.render("admin/edit-category", {
    admin: true,
    category,
    admin1: req.session.admin,
  });
});

// Edit Category
const saveEditCategory = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
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
});

// Delete Category
const deleteCategory = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }
  const categoryID = req.params.categoryID;

  // Deleting Category and storing details in a variable called category
  const category = await CategoryData.findByIdAndDelete({
    _id: categoryID,
  }).lean();

  return res.json({ status: true, message: `${category.name} Deleted` });
});

// View all Products
const getProducts = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const page = Number(req.query.page) || 1;
    const limit = 2;

    // skip calculating for per Page
    const skip = (page - 1) * limit;

    // Total Product calculation
    const totalProduct = await ProductData.find().countDocuments();
    // Total Page - Here limit is 2, so Total prod / limit
    const totalPages = Math.ceil(totalProduct / limit);

    // Products fetching to current page
    let products = await ProductData.find().skip(skip).limit(limit).lean();

    products = products.map((product) => {
      let { createdAt } = product;
      let formatedDate = moment(createdAt).format("MMMM Do YYYY HH:mm:ss");
      return { ...product, createdAt: formatedDate };
    });

    // Pagination
    const pagination = {
      currentPage: page,
      previousPage: page > 1,
      nextPage: page < totalPages,
      totalPages,
    };

    return res.render("admin/view-products", {
      admin: true,
      products,
      admin1: req.session.admin,
      pagination,
    });
  } catch (error) {
    console.error(error);
  }
});

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
});

//
const saveProduct = asyncHandler(async (req, res) => {
  try {
    let {
      name,
      categoryName,
      description,
      highlights,
      price,
      rating,
      flavour,
      brand,
      size,
      units,
      origin,
      bestBefore,
    } = req.body;
    console.log(req.body);
    price = Number(price);
    rating = Number(rating);
    // console.log(req.files);
    size = size + units;
    let imageUrl = req.files.map((file) => file.filename);
    await ProductData.create({
      name,
      categoryName,
      description,
      highlights,
      price,
      salePrice: price,
      rating,
      flavour,
      brand,
      size,
      origin,
      bestBefore,
      imageUrl,
    });
    res.redirect("/admin/products");
  } catch (error) {
    console.error(`the Error ${error}`);
    throw new Error("Something Wrong" + error);
  }
});

// Edit Product
const editProduct = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }
    const productID = req.params.productID;
    const product = await ProductData.findById({ _id: productID }).lean();
    // const [size, unit] = product.size.split(" ");
    let size = parseInt(product.size)
    // Separating the unit from size
    let match = product.size.match(/[a-zA-Z]+/)
    let unit = match[0]
    console.log(`Matching Part`, match)
    const categories = await CategoryData.find({}, { name: 1 }).lean();
    console.log(`products`)
    console.log(product)
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
});

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
      rating,
      flavour,
      size,
      unit,
      origin,
      bestBefore,
      prodID,
    } = req.body;
    // console.log(req.body);
    // console.log(req.files);
    // To get the index value of the Image To Update
    let imageIndex = req.files.map((file) => {
      let fileLength = "file".length;
      let fileName = file.fieldname.slice(fileLength);
      fileName = Number(fileName);
      return fileName;
    });
    // console.log(imageIndex);
    price = Number(price);
    rating = Number(rating);
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
    size = size + " " + unit;
    console.log(size);

    await ProductData.findByIdAndUpdate(
      { _id: prodID },
      {
        name,
        categoryName,
        description,
        highlights,
        price,
        salePrice: price,
        rating,
        flavour,
        size,
        origin,
        bestBefore,
        imageUrl,
      }
    );
    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
  }
});


// Delete Product Image
const deleteProductImage = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }

  let {
    prodID,
    imageUrl
  } = req.params

  console.log(imageUrl)
  console.log(prodID)

  let product = await ProductData.findById({ _id: prodID })

  // if the product is not existing
  if (!product) {
    return res.json({ status: false, message: "Product not Found" })
  }

  let isImageExisting = product.imageUrl.some(url => url === imageUrl)

  if (!isImageExisting) {
    return res.json({ status: false, message: "Product Image not Found" })
  }

  // find index 
  let imageIndex = product.imageUrl.findIndex(url => url === imageUrl)

  // Image spliced
  console.log(imageIndex)
  const imageUrlsCopy = product.imageUrl.slice()

  // pulling the imageUrl from DB
  let updatedImageUrls = imageUrlsCopy.filter(async (url, index) => {
    if (index === imageIndex) {
      await ProductData.findByIdAndUpdate({ _id: prodID },
        { $pull: { imageUrl: imageUrl } }
      )
    }
  })

  // Delete from local storage(folder)
  let dirPath = path.dirname(__dirname)
  console.log(path.join(dirPath, '/public/uploads', imageUrl))
  let imgPath = path.join(dirPath, '/public/uploads', imageUrl)
  fs.unlink(imgPath, err => {
    if (err) {
      return res.json({ status: false, message: "Image not deleted" })
    }
  })

  return res.json({ status: true, message: "Image Deleted" });
})

// Upadate Stock product
const updateProductStock = asyncHandler(async (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: "/admin/" });
    }
    const productID = req.body.productID;
    const stock = req.body.stock;
    console.log(productID)

    const product = await ProductData.findById({ _id: productID })
    console.log(product);


    if (!product) {
      return res.json({ status: false, message: "Product not Found!" })
    }

    await ProductData.findByIdAndUpdate(
      { _id: productID },
      { $inc: { quantities: stock } }
    );
    return res.json({ status: true, message: `${product.name} stock updated` })
  } catch (error) {
    console.error(error);
  }
});

// Delete Product
const deleteProduct = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: "/admin/" });
    }
    const productID = req.body.productID;
    await ProductData.findByIdAndDelete({ _id: productID });
    return res.json({ status: true, redirected: "/admin/products" });
  } catch (error) {
    console.error(error);
  }
});

// Sort Products
const sortProducts = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: "/admin/" });
    }
    const filter = req.query.filter;
    const page = Number(req.query.page) || 1;
    const limit = 2;
    const skip = (page - 1) * limit;

    // Total Products
    const totalProducts = await ProductData.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    // Sorting Dynamically with option
    let sortOpt = {};

    sortOpt =
      filter == "lowToHigh"
        ? { price: 1 }
        : filter == "highToLow"
          ? { price: -1 }
          : filter == "ascending"
            ? { name: 1 }
            : filter == "descending"
              ? { name: -1 }
              : filter == "averageRating"
                ? { rating: -1 }
                : filter == "newArrivals"
                  ? { createdAt: -1 }
                  : {};
    // console.log(sortOpt);

    // Pagination
    const pagination = {
      currentPage: page,
      previousPage: page > 1,
      nextPage: page < totalPages,
      totalPages,
    };

    let products = await ProductData.find({})
      .sort(sortOpt)
      .skip(skip)
      .limit(limit)
      .lean();
    products = products.map((product) => {
      let { createdAt } = product;
      let formatedDate = moment(createdAt).format("MMMM Do YYYY HH:mm:ss");
      return { ...product, createdAt: formatedDate };
    });
    return res.json({ status: true, products, pagination });
  } catch (error) {
    console.error(error);
  }
});

// Get Orders
const getOrders = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/");
    }

    const page = req.query.page || 1;
    const limit = 7;

    const skip = (page - 1) * limit;

    const totalOrders = await OrderData.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    let orders = await OrderData.find({}).skip(skip).limit(limit).lean();

    // Pagination
    const pagination = {
      currentPage: page,
      previousPage: page > 1,
      nextPage: page < totalPages,
      totalPages,
    };

    orders = orders.map((order) => {
      let { createdAt } = order;
      let formatedDate = moment(createdAt).format("MMMM Do YYYY HH:mm:ss");
      return { ...order, createdAt: formatedDate };
    });
    console.log(orders);

    return res.render("admin/view-orders", {
      admin: true,
      orders,
      admin1: req.session.admin,
      pagination,
    });
  } catch (error) {
    console.error(error);
  }
});

// Get Single Order
const viewOrder = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  const orderID = req.params.orderID;

  // single Order Details
  let order = await OrderData.findById({ _id: orderID }).lean();
  order.createdAt = moment(order.createdAt).format("MMMM Do YYYY HH:mm:ss");

  // console.log(`Order`);
  //  console.log(order)

  let orderProducts = await Promise.all(order.products.map(async (product) => {
    let prod = await ProductData.findById({ _id: product.productID })
    if (!prod || !prod?.imageUrl) {
      return { ...product, image: `image_not_available.png` }
    }
    return { ...product }
  }))


  return res.render("admin/view-order", {
    admin: true,
    order,
    admin1: req.session.admin,
    orderProducts
  });
});

// Change Order Status
const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: "/admin/" });
    }
    let { orderID, orderStatus } = req.body;
    console.log(orderStatus);

    let status = {
      message: "",
      payment: "",
    };

    status.message =
      orderStatus == "Pending"
        ? `Your order is pending and will be processed soon`
        : orderStatus == "Processing"
          ? `Your order is currently being processed`
          : orderStatus == "Shipped"
            ? `Your order has been shipped`
            : orderStatus == "Out for Delivery"
              ? `Your order is out for delivery and should arrive soon`
              : orderStatus == "Delivered"
                ? `Your order has been delivered`
                : orderStatus == "Cancelled"
                  ? `Your order has been cancelled`
                  : orderStatus == "Returned"
                    ? `Your order has been returned`
                    : orderStatus == "Refunded"
                      ? `Your order has been successfully refunded`
                      : `Your order is holding. Update soon`;

    status.payment =
      orderStatus == "Pending"
        ? `Unpaid`
        : orderStatus == "Processing"
          ? `Unpaid`
          : orderStatus == "Shipped"
            ? `Unpaid`
            : orderStatus == "Out for Delivery"
              ? `Unpaid`
              : orderStatus == "Delivered"
                ? `Paid`
                : orderStatus == "Cancelled"
                  ? `cancelled`
                  : orderStatus == "Returned"
                    ? `Paid`
                    : orderStatus == "Refunded"
                      ? `Refund`
                      : `Your order is holding. Update soon`;

    //  console.log(status)

    // Order Status updating
    const order = await OrderData.findByIdAndUpdate(
      { _id: orderID },
      {
        $set: { status: orderStatus, paymentStatus: status.payment },
        $push: {
          orderActivity: { orderStatus: orderStatus, message: status.message },
        },
      }
    );

    // And also change the product status too
    // checks if any products in the order Collection
    let orderProducts;
    if (order.products.length > 0) {
      orderProducts = await Promise.all(
        order.products.map(async (product) => {
          await OrderData.findOneAndUpdate(
            { _id: orderID, "products.productID": product.productID },
            { $set: { "products.$.status": orderStatus } }
          );
        })
      );
    }

    return res.json({ status: true, redirected: "/admin/orders" });
  } catch (error) {
    console.error(error);
  }
});


// order product status changing
const updateOrderProductStatus = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }
  const {
    orderID,
    orderProductID,
    orderProductStatus
  } = req.body

})

// Order Sorting
const orderSorting = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: "/admin/" });
    }

    let filterName = req.params.filter;

    if (filterName == "no-filter") {
      const orders = await OrderData.find({}).lean();
      return res.json({ status: true, redirected: "/admin/orders", orders });
    }

    if (filterName == "ascending") {
      const orders = await OrderData.find({}).sort({ orderNumber: 1 }).lean();
      return res.json({ status: true, orders });
    }

    if (filterName == "descending") {
      const orders = await OrderData.find({}).sort({ orderNumber: -1 }).lean();
      return res.json({ status: true, orders });
    }

    if (filterName == "high-to-low") {
      const orders = await OrderData.find({})
        .sort({ totalSalePrice: -1 })
        .lean();
      return res.json({ status: true, orders });
    }

    const orders = await OrderData.find({}).sort({ totalSalePrice: 1 }).lean();

    return res.json({ status: true, redirected: "/admin/orders", orders });
  } catch (error) {
    console.error(error);
  }
});

// Coupon Management
const couponPage = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  let page = req.query.page || 1
  let limit = 2;

  let skip = (page - 1) * limit

  let coupons = await CouponData.find({}).skip(skip).limit(limit).lean();

  // Total Coupons Count
  let totalCoupons = await CouponData.find().countDocuments()

  // Total Pages
  let totalPages = Math.ceil(totalCoupons / limit)

  // Pagination
  const pagination = {
    isPrevious: page > 1,
    current: page,
    isNext: page < totalPages,
    totalPages
  }

  coupons = coupons.map((coupon) => {
    let { expiryDate } = coupon;
    let formattedDate = moment(expiryDate).format("YYYY-MM-DD");
    return { ...coupon, expiryDate: formattedDate };
  });

  res.render("admin/view-coupons", {
    admin: true,
    coupons,
    pagination,
    admin1: req.session.admin,
    successMsg: req.session.successMsg,
    errMsg: req.session.errMessage,
  });
  req.session.successMsg = false;
  req.session.errMessage = false;
  return;
});

// Add Coupon
const addCoupon = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  let {
    code,
    couponType,
    description,
    maxDiscount,
    limit,
    minOrderValue,
    discount,
    expiryDate,
  } = req.body;

  // Converting String's to Number
  (maxDiscount = Number(maxDiscount)), (limit = Number(limit));
  minOrderValue = Number(minOrderValue);
  discount = Number(discount);

  // Expiry Date
  //  expiryDate = moment(expiryDate)

  // Check if the Coupon with same code already existed...
  const coupon = await CouponData.findOne({ code: code });

  // If the Coupon code is new
  if (!coupon) {
    await CouponData.create({
      code,
      couponType,
      description,
      maxDiscount,
      limit,
      minOrderValue,
      discount,
      expiryDate,
    });
    req.session.successMsg = "New Coupon Added";
    return res.redirect("/admin/coupon-management");
  }

  // Avoid the duplication of Coupon Code
  const error = new Error("Coupon already existed");
  const redirectPath = "/admin/coupon-management";
  return next({ error, redirectPath });
});

// Delete Coupon
const deleteCoupon = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }
  const couponID = req.params.couponID;
  await CouponData.findByIdAndDelete({ _id: couponID });
  console.log(couponID);
  return res.json({ status: true, message: "Coupon Deleted" });
});


// Delete Offer
const deleteOffer = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: '/admin/' })
  }
  const offerID = req.params.offerID

  await OfferData.findByIdAndDelete({ _id: offerID })
  return res.json({ status: true, message: 'Offer deleted successfully' })
})


// Sales reports
const salesReports = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  return res.render("admin/view-sales-reports", {
    admin: true,
    admin1: req.session.admin,
  });
});

// Get Sales reports
const getSalesReports = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }

  let { startDate, endDate } = req.query;

  startDate = new Date(startDate)
  endDate = new Date(endDate)

  let orders = await OrderData.find({
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: "Paid",
  }).lean();

  // Order Total
  const orderSalesTotal = await OrderData.aggregate([
    {
      $match: {
        paymentStatus: { $eq: "Paid" },
        createdAt: { $gte: startDate, $lte: endDate }
      },
    },
    {
      $unwind: {
        path: "$coupons",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        totalPrice: { $sum: "$totalPrice" },
        totalCouponPrice: { $sum: "$coupons.deductedPrice" },
        salesCount: { $sum: 1 },
      },
    },
  ]);

  console.log(`Order Sales Total`);
  console.log(orderSalesTotal);

  // calculating sales total and coupon based on the specific date
  const totalPrice = orderSalesTotal && orderSalesTotal[0] ? orderSalesTotal[0].totalPrice : 0;
  const totalSales = orderSalesTotal && orderSalesTotal[0] ? orderSalesTotal[0].salesCount : 0;
  const totalCouponPrice = orderSalesTotal && orderSalesTotal[0] ? orderSalesTotal[0].totalCouponPrice : 0;

  const overallTotal = totalPrice + totalCouponPrice;

  return res.json({
    status: true,
    orders,
    totalPrice,
    totalSales,
    totalCouponPrice,
    overallTotal,
  });
});


// Download Sales Report
const downloadSalesReport = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }

  let { startDate, endDate } = req.query;

  let orders = await OrderData.find({
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: "Paid",
  }).lean();


  const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
  const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

  const filename = `sales_report_${formattedStartDate}_to_${formattedEndDate}.pdf`

  const parentDir = path.dirname(__dirname)

  let filePath = path.join(parentDir, 'public', 'reports', filename)

  let dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const writeStream = fs.createWriteStream(filePath);
  const doc = new PDFDocument();
  doc.pipe(writeStream)


  doc.font('Helvetica-Bold').fontSize(20).fillColor('orange')
    .text('Sales Report', { align: 'center' })
    .moveDown(0.5)
    .fontSize(18)
    .fillColor('black')
    .text(`Coverage Period: ${formattedStartDate} to ${formattedEndDate}`, { align: 'center' })
    .moveDown(1.5)

  orders.forEach(order => {
    doc.font('Helvetica').fontSize(14).text(`Order No: ${order.orderNumber}`, { underline: true }).moveDown(0.2)
    doc.font('Helvetica').fontSize(12).text(`Customer Name: ${order.customer}`)
    doc.text(`Total Price: ${order.totalPrice}`, { continued: true }).fillColor('green')
    doc.text(`Payment Method: ${order.paymentMethod}`, { align: 'right' }).fillColor('black');
    doc.text(`Payment Status: ${order.paymentStatus}`);
    doc.text(`Date: ${order.createdAt.toISOString().split('T')[0]}`, { align: "right" })
    doc.moveDown(2);

    doc.lineWidth(1)
      .moveTo(50, doc.y) 
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#cccccc')
      .stroke()

    doc.moveDown(2);
  });

  doc.end();


  writeStream.on('error', (err) => {
    console.error(`Error writing PDF: ${err.message}`);
  });

  return res.json({ status: true, startDate: formattedStartDate, endDate: formattedEndDate })
})


// Sales chart
const salesChart = asyncHandler(async (req, res, next) => {
  const filter = req.query.filter;
  let labels = [];
  let startDate;
  let endingDate;
  let groupBy;
  const now = new Date();

  if (filter === 'day') {
    const currentDayOfWeek = now.getDay(); // 0 (Sunday) - 6 (Saturday)
    console.log(currentDayOfWeek)

    // Calculate start date for the current week (Sunday)
    startDate = new Date(now);
    startDate.setDate(now.getDate() - currentDayOfWeek); // Set to the Sunday of the current week
    startDate.setHours(0, 0, 0, 0); // Start of the week

    // Calculate end date for today
    endingDate = new Date(now);
    endingDate.setHours(23, 59, 59, 999); // End of today

    console.log("Start Date:", startDate);
    console.log("End Date:", endingDate);

    // Group by day of the week
    groupBy = { $dayOfWeek: '$createdAt' };
    labels.push('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat');
  } else if (filter === 'week') {
    startDate = new Date(now)
    // start date is set to 6 weeks ago
    startDate.setDate(now.getDate() - 6 * 7)
    startDate.setHours(0, 0, 0, 0)
    endingDate = new Date(now)
    endingDate.setHours(23, 59, 59, 999)

    groupBy = { $week: '$createdAt' };
    labels.push('Week1', 'Week2', 'Week3', 'Week4', 'Week5', 'Week6');
  } else if (filter === 'month') {
    startDate = new Date(now.getFullYear(), 0, 1)
    startDate.setHours(0, 0, 0, 0)
    console.log(startDate)

    endingDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endingDate.setHours(23, 59, 59, 999)

    // Label Month pushing
    for (let month = 0; month < 12; month++) {
      labels.push(new Date(now.getFullYear(), month).toLocaleString('default', { month: 'long' }))
    }
    groupBy = { $month: '$createdAt' }

  } else {
    const currentYear = now.getFullYear()
    startDate = new Date(currentYear - 3, 0, 1)
    startDate.setHours(0, 0, 0, 0);

    endingDate = new Date(currentYear, 11, 31);
    endingDate.setHours(23, 59, 59, 999);

    for (let year = currentYear - 3; year <= currentYear; year++) {
      labels.push(year.toString())
    }

    groupBy = { $year: '$createdAt' }

  }

  console.log(`Labelss`);
  console.log(labels);

  // Fetch the sales data for the given date range
  const salesChartData = await OrderData.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endingDate
        }
      }
    },
    {
      $group: {
        _id: groupBy,
        totalSales: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);


  let salesData = filter == 'day' ? Array(7).fill(0)
    : (filter === 'week' ? Array(6).fill(0)
      : (filter === 'month' ? Array(12).fill(0)
        : (filter === 'month' ? Array(4).fill(0) : Array(4).fill(0))))
  console.log(salesData)

  // Fill in sales data based on the aggregation results
  salesChartData.forEach(item => {
    // item._id will be the day of the week (0 for Sunday, 1 for Monday, ...)
    if (filter === 'day') {
      const dayIndex = item._id - 1; // Adjust to match the index in the dailySales array
      if (dayIndex >= 0 && dayIndex < 7) {
        salesData[dayIndex] = item.totalSales;
        // salesData.reverse()
      }
    } else if (filter === 'week') {
      const currentWeek = now.getWeek();
      const weekIndex = currentWeek - item._id - 1
      if (weekIndex >= 0 && weekIndex < 6) {
        salesData[weekIndex] = item.totalSales;
      }
    } else if (filter === 'month') {
      const monthIndex = item._id - 1
      if (monthIndex >= 0 && monthIndex < 12) {
        salesData[monthIndex] = item.totalSales
      }
    } else {
      let currentYear = now.getFullYear()
      console.log(item._id)

      let yearIndex = currentYear - item._id;
      console.log(`yearIndex`)
      console.log(yearIndex)

      if (yearIndex >= 0 && yearIndex < 4) {
        salesData[3 - yearIndex] = item.totalSales;
      }

    }
  });

  salesData = filter === 'week' ? salesData.reverse() : salesData

  Date.prototype.getWeek = function () {
    const firstDayOfYear = new Date(this.getFullYear(), 0, 1);
    const pastDaysOfYear = (this - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };


  console.log(salesData)

  // Return the sales data in the response
  res.json({ status: true, updatedSalesChartData: salesData, labels: labels });
});



// Carousal Management
const getCarousels = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  return res.render("admin/view-carousels", {
    admin: true,
    admin1: req.session.admin,
  });
});

// View Add Carousel page
const viewAddCarousel = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  return res.render("admin/add-carousel", {
    admin: true,
    admin1: req.session.admin,
  });
});

// Products and categories Offer page
const offerPage = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }

  let products = await ProductData.find({}).lean()
  let categories = await CategoryData.find({}).lean()
  const offers = await OfferData.find({}).lean()

  return res.render("admin/view-offers", {
    admin: true,
    admin1: req.session.admin,
    products,
    categories,
    offers
  });
});


// Offers - Creating New Offers
const addOffers = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }

  let {
    productID,
    categoryID,
    offerType,
    discountPercentage,
    startingDate,
    endingDate
  } = req.body

  let discountPrice
  discountPercentage = Number(discountPercentage)

  let entity = offerType === 'product'
    ? await ProductData.findById({ _id: productID })
    : await CategoryData.findById({ _id: categoryID })

  // Discount Price
  discountPrice = (discountPercentage * entity.price) / 100

  if (offerType == 'product') {
    let existingOffer = await OfferData.findOne({ productID: productID, isActive: true })
    if (existingOffer) {
      existingOffer.discountPercentage = discountPercentage
      existingOffer.discount = discountPrice
      existingOffer.startingDate = startingDate
      existingOffer.expiryDate = endingDate
      await existingOffer.save()
      // Updating salesPrice
      entity.salePrice = entity.price - discountPrice
      await entity.save()
      const offers = await OfferData.find({}).lean()
      return res.json({ status: true, offers, message: `Product offer updated` })
    }
  } else if (offerType == 'category') {
    let existingOffer = await OfferData.findOne({ categoryID: categoryID })
    if (existingOffer) {
      existingOffer.discountPercentage = discountPercentage
      existingOffer.startingDate = startingDate
      existingOffer.expiryDate = endingDate
      await existingOffer.save()
      const offers = await OfferData.find({}).lean()
      return res.json({ status: true, offers, message: `Category offer updated` })
    }
  } else {
    // error 
  }

  await OfferData.create({
    name: entity.name,
    offerType,
    productID,
    categoryID,
    discountPercentage,
    discount: offerType == 'product' ? discountPrice : "",
    startingDate,
    expiryDate: endingDate,
  })

  // Updating salesPrice
  entity.salePrice = entity.price - discountPrice
  await entity.save()
  const offers = await OfferData.find({}).lean()

  return res.json({ status: true, offers, message: `New offer created` })

})

// Settings
const settings = asyncHandler(async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/");
  }
  const adminID = req.session.admin._id;
  let currentAdmin = await UserData.findById({ _id: adminID }).lean();
  return res.render("admin/view-settings", {
    admin: true,
    admin1: req.session.admin,
    currentAdmin,
  });
});

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
});

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
  deleteProductImage,
  updateProductStock,
  deleteProduct,
  sortProducts,
  getOrders,
  viewOrder,
  updateOrderStatus,
  updateOrderProductStatus,
  orderSorting,
  couponPage,
  addCoupon,
  deleteCoupon,
  deleteOffer,
  salesReports,
  getSalesReports,
  downloadSalesReport,
  salesChart,
  getCarousels,
  viewAddCarousel,
  offerPage,
  addOffers,
  settings,
  logout,
};
