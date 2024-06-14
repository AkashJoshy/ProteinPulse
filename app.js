const express = require('express')
const path = require('path')
const {engine} = require('express-handlebars')
const {createMongoConnection} = require('./config/connection')
const fileUpload = require('express-fileupload')

const userRouter = require('./routes/user')
const adminRouter = require('./routes/admin')

const app = express()

// view engine
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: __dirname + '/views/layouts/',
    partialsDir: __dirname + '/views/partials/'
}))

app.set('view engine', 'hbs')
app.set('views', __dirname + '/views')


// inbuld middleware
// parsing middleware
app.use(express.urlencoded({extended: true}))
app.use(express.json())

// file upload
app.use(fileUpload());

// handling static files
app.use(express.static(path.join(__dirname, 'public')))

// request handling
app.use('/', userRouter)
app.use('/admin', adminRouter)

// mongoDB connection
createMongoConnection()
.then(() => console.log(`Connection is Success`))
.catch(err => console.error(err))


// port number
const port = 3000

// server port setting
app.listen(port, ()=> console.log(`Server is running on port ${port}`))