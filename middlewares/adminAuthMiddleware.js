const asyncHandler = require('express-async-handler');

const authHandler = asyncHandler(async (req, res, next) => {
    try {
        if(!req.session.admin) {
            return res.redirect('/admin/'); 
        }
        next();
    } catch (error) {
        console.error(`Error in authHandler: ${error.message}`);
        return res.status(500).json({ message: "Internal server error." });
    }
});

module.exports = {
    authHandler
};
