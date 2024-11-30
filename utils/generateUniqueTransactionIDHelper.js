const { v4: uuidv4 } = require('uuid')
const { WalletData } = require('../models/WalletDB')


const generateTransactionID = async (userID) => {
    let transactionID
    let unique = false

    while (!unique) {
        transactionID = `#TD` + uuidv4().replace(/-/g, '')
        transactionID = transactionID.slice(0, 16)

        let updatedWalletTransaction = await WalletData.findOne({ userID: userID, 'transactions.transactionID': { $ne: transactionID } })
        if (updatedWalletTransaction) {
            unique = true
        }

    }

    return transactionID
}

module.exports = generateTransactionID