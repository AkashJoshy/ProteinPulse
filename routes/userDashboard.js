const express = require('express')
const router = express.Router()
const userDashboardController = require('../controllers/userDashboardController')
const userAuthController = require('../middlewares/userAuthMiddleware')


// GET Requests
router.get("/", userAuthController.authHandler, userDashboardController.dashboard);
router.get("/account-details", userAuthController.authHandler, userDashboardController.accountDetails)
router.get("/orders", userAuthController.authHandler, userDashboardController.myOrders)
router.get("/orders/page", userDashboardController.myOrdersPages)
router.get("/orders/edit-orders/:orderID", userAuthController.authHandler, userDashboardController.viewOrderDetails);
router.get("/wishlist", userAuthController.authHandler, userDashboardController.wishlist);
router.get("/address", userAuthController.authHandler, userDashboardController.accountAddress);
router.get("/address/add-address", userAuthController.authHandler, userDashboardController.addAddress);
router.get("/address/saved-address", userAuthController.authHandler, userDashboardController.viewAddresses);
router.get("/address/edit-address/:addressType/:addressID", userAuthController.authHandler, userDashboardController.getAddressEdit);
router.get("/wallet", userAuthController.authHandler, userDashboardController.wallet);
router.get("/wallet/page", userDashboardController.walletTransactionPages);


// POST Requests
router.post("/address/add-address", userAuthController.authHandler, userDashboardController.saveAddress);
router.post("/address/update-address", userAuthController.authHandler, userDashboardController.updateAddress)
router.post("/add-wallet-amount", userDashboardController.addToWallet);


// PUT Requests
router.put("/verify-wallet-topup", userDashboardController.verifyWalletTopup);
router.put("/account-details/update-user-details", userDashboardController.updateUserDetails);
router.put("/account-details/change-profile-picture", userDashboardController.updateUserProfilePic);
router.put("/account-details/change-password", userDashboardController.changePassword);
router.put("/address/delete-address", userDashboardController.deleteAddress)


// PATCH Requests
router.patch("/wishlist/remove/:productID", userDashboardController.removeWishlistProduct)


module.exports = router