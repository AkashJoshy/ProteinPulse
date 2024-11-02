const express = require('express')
const router = express.Router()
const userDashboardController = require('../controllers/userDashboardController')


// GET Requests
router.get("/", userDashboardController.dashboard);
router.get("/account-details", userDashboardController.accountDetails)
router.get("/orders", userDashboardController.myOrders)
router.get("/orders/page", userDashboardController.myOrdersPages)
router.get("/orders/edit-orders/:orderID", userDashboardController.viewOrderDetails);
router.get("/wishlist", userDashboardController.wishlist);
router.get("/address", userDashboardController.accountAddress);
router.get("/address/add-address", userDashboardController.addAddress);
router.get("/address/saved-address", userDashboardController.viewAddresses);
router.get("/address/edit-address/:addressType/:addressID", userDashboardController.getAddressEdit);
router.get("/wallet", userDashboardController.wallet);
router.get("/wallet/page", userDashboardController.walletTransactionPages);


// POST Requests
router.post("/address/add-address", userDashboardController.saveAddress);
router.post("/address/update-address", userDashboardController.updateAddress)
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