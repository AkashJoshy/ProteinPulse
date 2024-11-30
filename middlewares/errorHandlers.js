
// Not Found 
const notFound  = (req, res, next) => {
    const error = new Error(`Not Found: ${req.originalUrl}`)
    // res.status(404)
    error.status = 404
    next(error)
}


// Error Handler
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode == 200 ? 500 : res.statusCode
    res.status(statusCode)
    const redirectPath = err.redirectPath || '/404'
    const {error: { message: errormessage } } = err
    req.session.errMessage = errormessage || 'Unexpected error occured'
    res.redirect(redirectPath)
}

// router.get("/404", (req, res) => {
//     res.status(404).send("404")
// });

module.exports = {
    notFound,
    errorHandler
}