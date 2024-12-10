const { UserData } = require("../models/userDB");
const { CategoryData } = require("../models/categoryDB");
const { ProductData } = require("../models/productDB");
const { CouponData } = require("../models/CouponDB");
const { OfferData } = require("../models/OfferDB")
const { CarouselData } = require('../models/CarouselDB')
const asyncHandler = require("express-async-handler");
const PDFDocument = require('pdfkit')
const fs = require('fs')
const stream = require('stream')
const moment = require("moment");
const bcrypt = require("bcrypt");
const { OrderData } = require("../models/OrderDB");
const path = require("path");
const { products } = require("./userController");
const { getPaginatedData } = require('../utils/paginationHelper')
const { getTopProducts, getTopCategories, getTopBrands } = require('../utils/topSellingHelper')


// Admin Login In Page
const login = asyncHandler(async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }

  res.render("admin/login-page", {
    admin: true,
    loginErr: req.session.errMessage,
    admin1: req.session.admin,
  });
  req.session.errMessage = false;
  return
});

// Admin Login checking
const doLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const admin = await UserData.findOne({ email: email, isAdmin: true });

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
  try {
    const products = await ProductData.find({}).countDocuments()
    const users = await UserData.find({ isAdmin: false }).countDocuments()
    const orders = await OrderData.find({ status: { $nin: ["Refunded", "Canceled"] } }).countDocuments()

    const topProducts = getTopProducts()
    const topCategories = getTopCategories()
    const topBrands = getTopBrands()

    const totalSales = await OrderData.find({ paymentStatus: 'Paid', status: { $nin: ["Refunded", "Canceled"] } }).countDocuments()

    return res.render("admin/dashboard", {
      admin: true,
      admin1: req.session.admin,
      products,
      users,
      orders,
      totalSales,
      topProducts,
      topCategories,
      topBrands
    });
  } catch (error) {
    console.error(error);

  }
});

// All Customers
const getCustomers = asyncHandler(async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = req.query.limit || 4

    let query = { isAdmin: false }
    let { data, pagination } = await getPaginatedData(UserData, page, limit, {}, query)

    res.render("admin/view-customers", {
      admin: true,
      users: data,
      admin1: req.session.admin,
      pagination,
    });
  } catch (error) {
    console.error(error);
  }
});

const searchCustomers = asyncHandler(async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const search = req.query.search || ''
    const limit = 4;
    let query

    if (search.length >= 1) {
      query = {
        isAdmin: false,
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } }
        ]
      }
    } else {
      query = {
        isAdmin: false,
      }
    }

    let { data, pagination } = await getPaginatedData(UserData, page, limit, {}, query)

    if (data.length <= 0) {
      pagination = null
    }

    return res.json({ status: true, customers: data, pagination });
  } catch (error) {
    console.error(error)
  }

})

// View Single Edit Customer
const viewCustomer = async (req, res) => {
  const userID = req.params.userID;
  let user = await UserData.findById({ _id: userID }).lean();

  res.render("admin/edit-customer", {
    admin: true,
    user,
    admin1: req.session.admin,
  });
};

// Edit Customer
const editCustomer = asyncHandler(async (req, res) => {
  try {
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
  const page = Number(req.query.page) || 1;
  const limit = req.query.limit || 3;
  const search = req.query.search || "";

  const searchFilter =
    search !== "" ? { name: { $regex: search, $options: `i` } } : {};

  let { data, pagination } = await getPaginatedData(CategoryData, page, limit, searchFilter)

  return res.render("admin/view-categories", {
    admin: true,
    categories: data,
    admin1: req.session.admin,
    pagination,
  });
});

// category queryies like search, filter, sort
const categoryQuery = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: '/admin/' })
  }
  const search = req.query.search || "";
  const page = Number(req.query.page) || 1;
  const limit = 3;

  const searchFilter =
    search !== "" ? { name: { $regex: search, $options: `i` } } : {};

  let { data, pagination } = await getPaginatedData(CategoryData, page, limit, searchFilter)

  return res.json({
    status: true,
    categories: data,
    redirected: "/admin/category",
    pagination,
  });
});

// Add Category
const addCategory = asyncHandler(async (req, res) => {

  return res.render("admin/add-category", {
    admin: true,
    admin1: req.session.admin,
  });
});

// Add new Product
const saveAddCategory = asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body;
    let isImage;

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

    let isImage;
    const categoryID = req.body.categoryID;
    if (req.files) {
      isImage = req.files.map((file) => file.filename);
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

  const category = await CategoryData.findByIdAndDelete({
    _id: categoryID,
  }).lean();

  return res.json({ status: true, message: `${category.name} Deleted` });
});

// View all Products
const getProducts = asyncHandler(async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 2;

    let { data, pagination } = await getPaginatedData(ProductData, page, limit)

    let products = data.map((product) => {
      let { createdAt } = product;
      let formatedDate = moment(createdAt).format("MMMM Do YYYY HH:mm:ss");
      return { ...product, createdAt: formatedDate };
    });

    res.render("admin/view-products", {
      admin: true,
      products: data,
      admin1: req.session.admin,
      pagination,
      errMsg: req.session.errMessage,
    })
    req.session.errMessage = false
    return
  } catch (error) {
    console.error(error);
  }
});

// Add Product
const addProduct = asyncHandler(async (req, res) => {
  try {
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

// Add new Product
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

    price = Number(price);
    rating = Number(rating);
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
    return res.redirect("/admin/products");
  } catch (error) {
    console.error(`the Error ${error}`);
    throw new Error("Something Wrong" + error);
  }
});

// Edit Product
const editProduct = asyncHandler(async (req, res) => {
  try {
    const productID = req.params.productID;
    let product = await ProductData.findById({ _id: productID }).lean();

    let size = parseInt(product.size)
    let match = product.size.match(/[a-zA-Z]+/)
    let unit = match[0]

    const categories = await CategoryData.find({}, { name: 1 }).lean();
    const formattedDate = new Date(product.bestBefore).toISOString().split("T")[0]
    product.bestBefore = formattedDate

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

    let imageIndex = req.files.map((file) => {
      let fileLength = "file".length;
      let fileName = file.fieldname.slice(fileLength);
      fileName = Number(fileName);
      return fileName;
    });
    price = Number(price);
    rating = Number(rating);
    let product = await ProductData.findById({ _id: prodID });

    if (!product) {
      const err = new Error("Product not Found")
      const redirectPath = "/admin/products";
      return next({ error: err, redirectPath });
    }

    let imageUrl = product.imageUrl.slice();
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        imageIndex.forEach((value) => {
          if (value || value === index + 1) {
            imageUrl[value - 1] = file.filename;
          }
        });
      });
    }

    bestBefore = bestBefore === "" ? product.bestBefore : bestBefore;

    size = size + " " + unit;

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

  let product = await ProductData.findById({ _id: prodID })

  if (!product) {
    return res.json({ status: false, message: "Product not Found" })
  }

  let isImageExisting = product.imageUrl.some(url => url === imageUrl)

  if (!isImageExisting) {
    return res.json({ status: false, message: "Product Image not Found" })
  }

  let imageIndex = product.imageUrl.findIndex(url => url === imageUrl)
  const imageUrlsCopy = product.imageUrl.slice()

  let updatedImageUrls = imageUrlsCopy.filter(async (url, index) => {
    if (index === imageIndex) {
      await ProductData.findByIdAndUpdate({ _id: prodID },
        { $pull: { imageUrl: imageUrl } }
      )
    }
  })


  let dirPath = path.dirname(__dirname)
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

    const product = await ProductData.findById({ _id: productID })

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
    let product = await ProductData.findById({ _id: productID }).lean()
    if (!product) {
      return res.json({ status: true, islessPrice: true, message: `Product not found!` })
    }

    if (product.salePrice <= 200) {
      return res.json({ status: true, islessPrice: true, message: `The Product can't be deleted` })
    }

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

    let { data, pagination } = await getPaginatedData(ProductData, page, limit, sortOpt)

    let products = data.map((product) => {
      let { createdAt } = product;
      let formatedDate = moment(createdAt).format("MMMM Do YYYY HH:mm:ss");
      return { ...product, createdAt: formatedDate };
    });
    return res.json({ status: true, products: data, pagination });
  } catch (error) {
    console.error(error);
  }
});

// Search Products
const searchProducts = asyncHandler(async (req, res) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }

  const page = Number(req.query.page) || 1
  const search = req.query.search
  let limit = 2

  try {
    let query
    if (search.length >= 1) {
      query = {
        $or: [
          {
            name: { $regex: search, $options: 'i' }
          },
          {
            categoryName: { $regex: search, $options: 'i' }
          }
        ]
      }
    } else {
      query = {}
    }
    let { data, pagination } = await getPaginatedData(ProductData, page, limit, {}, query)

    if (data.length <= 0) {
      return res.json({ status: true, pagination: null });
    }

    return res.json({ status: true, products: data, pagination });
  } catch (error) {
    console.error(error)
  }
})

// Get Orders
const getOrders = asyncHandler(async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 2;

    let { data, pagination } = await getPaginatedData(OrderData, page, limit)

    let orders = data.map((order) => {
      let { createdAt } = order;
      let formatedDate = moment(createdAt).format("MMMM Do YYYY HH:mm:ss");
      return { ...order, createdAt: formatedDate };
    });

    res.render("admin/view-orders", {
      admin: true,
      orders,
      admin1: req.session.admin,
      pagination,
      errMsg: req.session.errMessage
    });
    req.session.errMessage = false
    return
  } catch (error) {
    console.error(error);
  }
});

// Get Single Order
const viewOrder = asyncHandler(async (req, res, next) => {
  const orderID = req.params.orderID;

  let order = await OrderData.findById({ _id: orderID }).lean();

  if (!order) {
    const err = new Error("Order not found!")
    const redirectPath = '/admin/orders'
    return next({ error: err, redirectPath });
  }

  order.createdAt = moment(order.createdAt).format("MMMM Do YYYY HH:mm:ss");

  return res.render("admin/view-order", {
    admin: true,
    order,
    admin1: req.session.admin,
  });
});

// Change Order Status
const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: "/admin/" });
    }
    let { orderID, orderStatus } = req.body;

    let isOrder = await OrderData.findById({ _id: orderID })

    if (!isOrder) {
      return res.json({ status: false, redirected: "/admin/orders", message: 'Order not found!' });
    }

    let isProductsInOrder = await Promise.all(
      isOrder.products.map(async (prod) => {
        let product = await ProductData.findById({ _id: prod.productID })
        return product ? product : null
      })
    )

    isProductsInOrder = isProductsInOrder.filter(prod => prod !== null)

    if (isProductsInOrder <= 0) {
      return res.json({ status: false, redirected: "/admin/orders", message: 'No products available for the order' });
    }

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


    const order = await OrderData.findByIdAndUpdate(
      { _id: orderID },
      {
        $set: { status: orderStatus, paymentStatus: status.payment },
        $push: {
          orderActivity: { orderStatus: orderStatus, message: status.message },
        },
      }
    );

    let orderProducts
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

  let order = await OrderData.findById({ _id: orderID }).lean()
  let product = await ProductData.findById({ _id: orderProductID }).lean()


  if (!order) {
    return res.json({ status: false, redirected: "/admin/orders", message: 'No order found!' });
  }


  if (!product) {
    return res.json({ status: false, redirected: "/admin/orders", message: 'No order found!' });
  }

  await OrderData.findOneAndUpdate({ _id: orderID, 'products.productID': orderProductID },
    { $set: { 'products.$.status': orderProductStatus, status: orderProductStatus } }
  )

  return res.json({ status: true, orderStatus: orderProductStatus })
})


// edit carousel
const editCarousel = asyncHandler(async (req, res) => {
  try {

    if (!req.session.admin) {
      return res.json({ status: false, redirected: '/admin/' })
    }

    const {
      name,
      subDestination,
      destinationID,
      expiryDate,
      carouselID
    } = req.body

    let carousel = await CarouselData.findById(carouselID)

    if (!carousel) {
      return res.json({ status: false, message: 'No carousel found', redirected: '/admin/carousel-management' })
    }

    let carouselLink
    let type
    if (subDestination == 'product') {
      let product = await ProductData.findById(destinationID)
      if (!product) {
        carouselLink = '/404'
      }
      type = 'Product'
      carouselLink = `user/products/${product._id}`
    } else {
      let category = await CategoryData.findById(destinationID)

      if (!category) {
        carouselLink = '/404'
      }
      type = 'Category'
      carouselLink = `/user-categories/${category.name}`
    }

    let data = {}

    if (req.files?.[0]?.fileName) {
      let imageUrl = req.files[0].fileName
      data.name = name
      data.link = carouselLink
      data.imageUrl = imageUrl
      data.type = type
    } else {
      data.name = name
      data.link = carouselLink
      data.type = type
    }

    if (expiryDate) {
      data.expiryDate = expiryDate
    }

    await CarouselData.findByIdAndUpdate(carouselID,
      { $set: data }
    )

    return res.json({
      status: true,
      message: `${name} updated`,
      redirected: '/admin/carousel-management'
    })
  } catch (error) {
    console.log(error)
  }
})


// Admin Edit details
const updateAdminDetails = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: '/admin/' })
    }
    console.log(req.body);

    let {
      firstName,
      lastName,
      mobileNumber,
      adminID
    } = req.body

    let admin = await UserData.findById(adminID).lean()

    if (!admin) {
      req.session.admin = false
      return res.json({ status: false, redirected: '/admin/' })
    }

    await UserData.findByIdAndUpdate(adminID, {
      $set: {
        firstName,
        lastName,
        mobileNumber
      }
    })

    return res.json({ status: true, message: `Admin details updated successfully` })
  } catch (error) {
    console.log(error)
  }
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

  let page = req.query.page || 1
  let limit = 2;

  let sortOption = { isActive: -1 }
  let { data, pagination } = await getPaginatedData(CouponData, page, limit, sortOption)

  let coupons = data.map((coupon) => {
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

  (maxDiscount = Number(maxDiscount)), (limit = Number(limit));
  minOrderValue = Number(minOrderValue);
  discount = Number(discount);

  const coupon = await CouponData.findOne({ code: code });

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
  return res.json({ status: true, message: "Coupon Deleted" });
});

// Delete Carousel
const deleteCarousel = asyncHandler(async (req, res) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" });
  }

  const carouselID = req.params.carouselID
  const carousel = await CarouselData.findById(carouselID)

  if (!carousel) {
    return res.json({
      status: false,
      message: `No Carousel found`,
      redirected: "/admin/"
    });
  }

  let dirPath = path.dirname(__dirname)
  let imgPath = path.join(dirPath, '/public/uploads', carousel.imageUrl)
  fs.unlink(imgPath, err => {
    if (err) {
      return res.json({ status: false, message: "Image not deleted" })
    }
  })

  await CarouselData.findByIdAndDelete(carouselID)
  return res.json({ status: true, message: "Carousel Deleted" });
})

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
    status: { $nin: ["Refunded", "Canceled"] }
  }).lean();

  const orderSalesTotal = await OrderData.aggregate([
    {
      $match: {
        paymentStatus: { $eq: "Paid" },
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ["Refunded", "Canceled"] },
      },
    },
    {
      $group: {
        _id: "$_id",
        totalPrice: { $first: "$totalPrice" },
        totalCouponPrice: { $sum: "$coupons.deductedPrice" },
      },
    },
    {
      $group: {
        _id: null,
        totalPrice: { $sum: "$totalPrice" },
        totalCouponPrice: { $sum: "$totalCouponPrice" },
        salesCount: { $sum: 1 },
      },
    },
  ]);

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
    status: { $nin: ["Refunded", "Canceled"] }
  }).lean();

  const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
  const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

  const filename = `sales_report_${formattedStartDate}_to_${formattedEndDate}.pdf`;
  const parentDir = path.dirname(__dirname);
  const filePath = path.join(parentDir, 'public', 'reports', filename);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(filePath);
  const doc = new PDFDocument();
  doc.pipe(writeStream);

  const logoPath = path.join(parentDir, 'public', 'picture', 'logo', 'logoUser.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 20, {
      width: 50,
      height: 50,
      align: 'left',
      valign: 'top',
    });
  }

  doc.font('Helvetica')
    .fontSize(12)
    .text('PROTEIN PULZE PLAZA', 90, 45);

  doc.font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('#F46F36')
    .text('Sales Report', { align: 'center' })
    .moveDown(1);


  doc.fontSize(18)
    .fillColor('black')
    .text(`Coverage Period: ${formattedStartDate} to ${formattedEndDate}`, {
      align: 'center',
    })
    .moveDown(1.5);


  orders.forEach((order) => {
    doc.font('Helvetica-Bold')
      .fontSize(14)
      .text(`Order No: ${order.orderNumber}`, 50, doc.y);

    doc.moveDown(0.5);
    doc.font('Helvetica')
      .fontSize(12)
      .fillColor('black')
      .text(`Customer Name: ${order.customer}`, 50)
      .text(`Date: ${new Date(order.createdAt).toISOString().split('T')[0]}`, 300, doc.y, { align: 'right' })
      .text(`Payment Method: ${order.paymentMethod}`, 50)
      .fillColor('green')
      .text(`Payment Status: ${order.paymentStatus}`, 300, doc.y, { align: 'right' })
      .fillColor('black')
      .text(`Total Price: ₹${order.totalPrice}`, 50, doc.y);

    doc.moveDown(1.5);

    doc.lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#cccccc')
      .stroke();

    doc.moveDown(1.5);
  });

  doc.end();

  writeStream.on('error', (err) => {
    console.error(`Error writing PDF: ${err.message}`);
  });

  return res.json({ status: true, startDate: formattedStartDate, endDate: formattedEndDate })
})


// Sales chart
const salesChart = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: '/admin/' })
  }
  const filter = req.query.filter;
  let labels = [];
  let startDate;
  let endingDate;
  let groupBy;
  const now = new Date();

  if (filter === 'day') {
    const currentDayOfWeek = now.getDay();

    // Calculate start date for the current week (Sunday)
    startDate = new Date(now);
    startDate.setDate(now.getDate() - currentDayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    // Calculate end date for today
    endingDate = new Date(now);
    endingDate.setHours(23, 59, 59, 999);

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

    endingDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endingDate.setHours(23, 59, 59, 999)

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

  salesChartData.forEach(item => {
    if (filter === 'day') {
      const dayIndex = item._id - 1;
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
      let yearIndex = currentYear - item._id;

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

  res.json({ status: true, updatedSalesChartData: salesData, labels: labels });
});



// Carousel Management
const getCarousels = asyncHandler(async (req, res, next) => {
  try {
    let page = req.query.page || 1
    let limit = req.query.limit || 2

    let { data, pagination } = await getPaginatedData(CarouselData, page, limit)

    res.render("admin/view-carousels", {
      admin: true,
      admin1: req.session.admin,
      carousels: data,
      pagination,
      errMsg: req.session.errMessage,
    })
    req.session.errMessage = false
    return
  } catch (error) {
    console.log(error)
  }
});

// Carousel Pagination Query
const carouselQuery = asyncHandler(async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.json({ status: false, redirected: '/admin/' })
    }

    let page = Number(req.query.page) || 1
    let limit = Number(req.query.limit) || 2
    let { data, pagination } = await getPaginatedData(CarouselData, page, limit)

    data.forEach(carousel => {
      carousel.expiryDate = moment(carousel.expiryDate).format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ') + ' (India Standard Time)'
    })

    return res.json({ status: true, carousels: data, pagination })
  } catch (error) {
    console.error(error)
  }
})

// View Carousel
const viewCarousel = asyncHandler(async (req, res, next) => {
  try {
    let carouselID = req.params.carouselID
    let carousel = await CarouselData.findById(carouselID).lean()

    if (!carousel) {
      const error = new Error("No carousal found!")
      const redirectPath = "/admin/carousel-management"
      return next({ error, redirectPath });
    }

    let subDestination = carousel.link.split('/')
    subDestination = subDestination[subDestination.length - 1]

    let destination = carousel.type == 'Product'
      ? await ProductData.findById(subDestination, { name: 1 }).lean()
      : await CategoryData.findOne({ name: subDestination }, { name: 1 }).lean()

    return res.render('admin/edit-carousel', {
      admin: true,
      admin1: req.session.admin,
      carousel,
      destination
    })

  } catch (error) {
    console.error(error)
  }
})

// View Add Carousel page
const viewAddCarousel = asyncHandler(async (req, res, next) => {
  try {

    let categories = await CategoryData.find({ isActive: true }, { name: 1 }).lean()
    let products = await ProductData.find({ isActive: true }, { name: 1 }).lean()

    return res.render("admin/add-carousel", {
      admin: true,
      admin1: req.session.admin,
      categories,
      products
    })

  } catch (error) {

  }
});

const getCarouselOptions = asyncHandler(async (req, res) => {
  if (!req.session.admin) {
    return res.json({ status: false, redirected: "/admin/" })
  }

  try {
    const option = req.query.option

    if (!option) {
      return res.json({ status: false, message: "Select any option" })
    }

    let destinations
    if (option == 'category') {
      destinations = await CategoryData.find({ isActive: true }, { name: 1 }).lean()
    } else if (option == 'product') {
      destinations = await ProductData.find({ isActive: true }, { name: 1 }).lean()
    } else {
      return res.json({ status: false, message: "Select any option" })
    }

    return res.json({ status: true, destinations })
  } catch (error) {
    console.error(error)
  }
})

// Products and categories Offer page
const offerPage = asyncHandler(async (req, res, next) => {
  try {
    let page = req.query.page || 1
    let limit = req.query.limit || 5

    let { data, pagination } = await getPaginatedData(OfferData, page, limit)
    let products = await ProductData.find({}).lean()
    let categories = await CategoryData.find({}).lean()

    return res.render("admin/view-offers", {
      admin: true,
      admin1: req.session.admin,
      products,
      categories,
      offers: data,
      pagination
    });
  } catch (error) {
    console.log(error)
  }
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

  discountPrice = (discountPercentage * entity.price) / 100

  if (offerType == 'product') {
    let existingOffer = await OfferData.findOne({ productID: productID, isActive: true })
    if (existingOffer) {
      existingOffer.discountPercentage = discountPercentage
      existingOffer.discount = discountPrice
      existingOffer.startingDate = startingDate
      existingOffer.expiryDate = endingDate
      await existingOffer.save()
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

  entity.salePrice = entity.price - discountPrice
  await entity.save()
  const offers = await OfferData.find({}).lean()

  return res.json({ status: true, offers, message: `New offer created` })

})

// Add Carousal
const addCarousel = asyncHandler(async (req, res, next) => {
  try {
    let {
      name,
      subDestination,
      destinationID,
      expiryDate
    } = req.body

    const imageUrl = req.files[0].filename
    let carouselLink
    let type
    if (subDestination == 'product') {
      let product = await ProductData.findById(destinationID)
      if (!product) {
        carouselLink = '/404'
      }
      type = 'Product'
      carouselLink = `user/products/${product._id}`
    } else {
      let category = await CategoryData.findById(destinationID)

      if (!category) {
        carouselLink = '/404'
      }
      type = 'Category'
      carouselLink = `/user-categories/${category.name}`
    }

    await CarouselData.create({
      name,
      type,
      link: carouselLink,
      imageUrl,
      expiryDate
    })
    return res.redirect('/admin/carousel-management')
  } catch (error) {
    console.error(error)
  }
})

// Settings
const settings = asyncHandler(async (req, res) => {

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

    const admin = await UserData.findOne({ _id: adminID });
    if (admin) {
      req.session.admin = null;
      return res.redirect("/admin/");
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
  searchCustomers,
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
  searchProducts,
  getOrders,
  viewOrder,
  updateOrderStatus,
  updateOrderProductStatus,
  updateAdminDetails,
  orderSorting,
  couponPage,
  addCoupon,
  deleteCoupon,
  deleteOffer,
  deleteCarousel,
  editCarousel,
  salesReports,
  getSalesReports,
  downloadSalesReport,
  salesChart,
  getCarousels,
  carouselQuery,
  viewCarousel,
  viewAddCarousel,
  getCarouselOptions,
  offerPage,
  addOffers,
  addCarousel,
  settings,
  logout,
};
