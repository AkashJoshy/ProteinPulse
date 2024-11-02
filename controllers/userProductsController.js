const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const { UserData } = require('../models/userDB')
const { ProductData } = require('../models/productDB')
const { CategoryData } = require('../models/categoryDB')
const { CouponData } = require('../models/CouponDB')
const { OfferData } = require('../models/OfferDB')
const { ProductFeedback } = require('../models/productFeedbackDB')



const products = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const userID = req.session.user._id;
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        const err = new Error("User not Found")
        const redirectPath = "/login";
        return next({ error: err, redirectPath });
    }

    const products = await ProductData.find({ quantities: { $gt: 0 } }).lean();
    
    return res.render("user/view-products", {
        auth: true,
        isDashboard: true,
        user,
        products,
    });
});

// view product
const product = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        const err = new Error("User not Found")
        const redirectPath = "/login";
        return next({ error: err, redirectPath });
    }

    const productID = req.params.productID;

    const isWishlisted = user.wishlist.some(product => productID.toString() === product.productID.toString())

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
        isWishlisted
    });
});

// Products Filters
const productFilters = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.json({ status: false, redirected: "/login" });
        }
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
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

        return res.json({ status: true, filterProducts, redirected: "/user/products" });
    } catch (error) {
        console.error(error.message);
    }
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

    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        const err = new Error("User not Found")
        const redirectPath = "/login";
        return next({ error: err, redirectPath });
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
    delete sortOpt._id;
    let products = await ProductData.find({}).sort(sortOpt).lean();

    return res.json({ status: true, products });
});

const searchResults = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login')
    }

    const userID = req.session.user._id;
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        const err = new Error("User not Found")
        const redirectPath = "/login";
        return next({ error: err, redirectPath });
    }
    
    let products
    products = req.session.products

    return res.render('user/view-searched-products', {
        auth: true,
        isDashboard: false,
        user,
        products,
    })
})

// Product Searching
const searchProducts = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.json({
                status: false,
                redirected: "/login",
                message: "Please login to Continue",
            });
        }

        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }

        req.session.products = []
        // console.log(`hlooo`);
        let search = req.query.search.trim();
        let products = await ProductData.find({
            $or: [
                { name: { $regex: search, $options: "i" } },
                { categoryName: { $regex: search, $options: "i" } },
            ],
        });
        console.log(products);
        if (products.length == 0) {
            return res.json({
                status: false,
                redirected: "/user/products/search-results",
            });
        }

        req.session.products = products ;
        return res.json({
            status: true,
            redirected: "/user/products/search-results",
            products
        });
    } catch (error) {
        console.error(error);
    }
});

// Product Review
const productReview = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }
        console.log(req.body);
        const userID = req.session.user._id
        const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

        if (!user) {
            req.session.user = null;
            const err = new Error("User not Found")
            const redirectPath = "/login";
            return next({ error: err, redirectPath });
        }
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
            return res.redirect(`/user/product/${productID}`);
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

// User Wishlist
const updateWishlist = asyncHandler(async (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            status: false,
            redirected: "/login",
            message: "Please Login to continue",
        });
    }
    const userID = req.session.user._id
    const user = await UserData.findOne({ _id: userID, isBlocked: false }).lean();

    if (!user) {
        req.session.user = null;
        const err = new Error("User not Found")
        const redirectPath = "/login";
        return next({ error: err, redirectPath });
    }

    let productID = req.params.productID;
    let productIndex = user.wishlist.findIndex(
        (product) => product.productID == productID
    );

    if (productIndex == -1) {
        if (user.wishlist.length >= 4) {
            return res.json({
                status: true,
                isFavourate: false,
                message: "Maximum wishlist limit exceeded",
            });
        } else {
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


module.exports = {
    products,
    product,
    productFilters,
    sortProducts,
    searchResults,
    searchProducts,
    productReview,
    updateWishlist
}