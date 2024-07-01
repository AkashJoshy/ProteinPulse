const asyncHandler = require('express-async-handler')

const authHandler = asyncHandler( async(req, res, next) => {
    try {
        if(!req.session.user) {
            return res.redirect('/login')
        }
        next()
    } catch (error) {
        throw new Error(`Error Fetching Page: ${error.message}`)
    }

})

module.exports = {authHandler}