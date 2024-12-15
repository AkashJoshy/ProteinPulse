const express = require('express')
const path = require('path')
const {engine} = require('express-handlebars')
const {createMongoConnection} = require('./config/connection')
// const fileUpload = require('express-fileupload')
const session = require('express-session')
const cors = require('cors')
const methodOverride = require('method-override')
const passport = require('passport')
const multer = require('multer')
const morgan = require('morgan')
const { notFound, errorHandler } = require('./middlewares/errorHandlers')
const cookieParser = require('cookie-parser')
const nocache = require('nocache')
require('./config/google-auth')
require('dotenv').config()

// Secret Key 
const SECRET = process.env.SECRET


const userRouter = require('./routes/user')
const adminRouter = require('./routes/admin')
const cartRouter = require('./routes/cart')
const userDashboardRouter = require('./routes/userDashboard')
const userProductsRouter = require('./routes/userProducts')


const app = express()

// Cors(Cross-Orgin Resource Sharing)
app.use(cors())

// morgan
app.use(morgan('dev'))

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, done) => {
        done(null, './public/uploads/')
    },
    filename: (req, file, done) => {
        done(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

// noCache
app.use(nocache())
// Cookie Parser
app.use(cookieParser())


// Multer Config
const upload = multer({storage: storage})

// Session
app.use(session({
    secret: SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000000 }
}))

// Passport
app.use(passport.initialize())
app.use(passport.session())


// view engine
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: __dirname + '/views/layouts/',
    partialsDir: __dirname + '/views/partials/',
    helpers: {
        increment: value => value + 1,
        isStock: value => value <= 0,
        isOffer: value => value > 0,
        isCart: value => value > 0 ? value : 0,
        isActive: value => value === true,
        productCheck: value => value <= 1 ? "Product" : "Products",
        productTotal: (quantity, value) => quantity * value,
        stockWarning: quantity => quantity <= 3,
        isCompany: value => value == "Nill" ? false : true,
        productNumbercheck: value => value < 10 && value > 0 ? '0'+value : value,
        isCancelled: value => value == 'Cancelled' ? true : false,
        isReturned: value => value == 'Returned' ? true : false,
        isDelivered: value => value == 'Delivered' ? true : false,
        isFailed: value => value == 'Failed' ? true : false,
        getLastIndex: value => {
            console.log(`Length is ${value}`)
            return value - 1
        },
        isorderStatusCancelled: value => value == 'Cancelled' ? true : false,
        isorderStatusPending: value => value == 'Pending' ? true : false,
        isorderStatusProcessing: value => value == 'Processing' ? true : false,
        isorderStatusShipped: value => value == 'Shipped' ? true : false,
        isorderStatusOutForDelivery: value => value == 'Out for Delivery' ? true : false,
        isorderStatusDelivery: value => value == 'Delivered' ? true : false,
        isorderStatusRefunded: value => value == 'Refunded' ? true : false,
        isWalletEnough: (walletBalance, totalPrice) => walletBalance < totalPrice,
        isEmpty: length => length > 0 ? true : false,
        isCreditedOrNot: paymentType => paymentType === 'debit' ? true : false,
        isSamePrice: (salesPrice, price) => salesPrice !== price ? true : false,
        orderCount: products => products.reduce((acc, product) => {
           if(product.status !== 'Cancelled'){
            acc++
           }
           return acc
        }, 0),
        orderProgress: value => value == 'Pending' ? 15 : (value == 'Processing' ? 34 : (value == 'Shipped' ? 50 : (value == 'Out for Delivery' ? 64 : (value == 'Delivered' ? 100 : 0) ) ) ),
        paginationNumbers: (start, pages) => {
            let number = []
            for(let i = start; i <= pages; i++) {
                number.push(i)
            }
            return number
        },
        paginationDynamicNumbers: (current, pages) => {
            let limit = 5
            let start = Math.max(1, current - Math.floor(limit / 2))
            let end = Math.min(pages, start + limit - 1)
            let numbers = []

            if(end - start + 1 < limit) {
                start = Math.max(1, end - limit + 1)
            }

            for(let i = start; i<= end; i++) {
                numbers.push(i)
            }

            return numbers
        },
        paginationManipulation: (currentPage, inc) => {
            inc = Number(inc)
            currentPage = Number(currentPage)
            return (currentPage + inc)
        }
    }
}))

// 

app.set('view engine', 'hbs')
app.set('views', __dirname + '/views')


// inbuld middleware
// parsing middleware
app.use(express.urlencoded({extended: true}))
app.use(express.json())

// Method override (for PUT and DElETE)
app.use(methodOverride('_method'))


// file upload
// app.use(fileUpload());

// handling static files
app.use(express.static(path.join(__dirname, 'public')))

// multer handling
app.use(upload.any())


// request handling
app.use('/', userRouter)
app.use('/admin', adminRouter)
app.use('/cart', cartRouter) 
app.use('/user/dashboard', userDashboardRouter)
app.use('/user/products', userProductsRouter)


// Error 404 route
app.get('/404', (req, res, next) => {
    res.status(404).render('error/error-page', {
        admin: false,
        message: req.session.errMessage,
    })
    req.session.errMessage = false
    return
})


// Error Middlewares
app.use(notFound)
app.use(errorHandler)


// mongoDB connection
createMongoConnection()
.then(() => console.log(`Connection is Success`))
.catch(err => console.error(err))

// Port Number
const port = process.env.PORT || 4000

// server port setting
app.listen(port, ()=> console.log(`Server is running on port ${port}`))