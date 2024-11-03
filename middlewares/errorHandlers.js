const { default: Swal } = require("sweetalert2")

// Not Found 
const notFound  = (req, res, next) => {
    const error = new Error(`Not Found: ${req.originalUrl}`)
    res.status(404)
    next(error)
}


// Error Handler
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode == 200 ? 500 : res.statusCode
    res.status(statusCode)
    const redirectPath = err.redirectPath
    console.log(err);
    const {error: { message: errormessage } } = err
    console.log(errormessage);
    req.session.errMessage = errormessage
    res.redirect(redirectPath)
}
// req.session.errMessage

module.exports = {
    notFound,
    errorHandler
}