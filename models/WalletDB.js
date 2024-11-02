const { Schema, model } = require('mongoose')
const cron = require('node-cron')
const { v4: uuidv4 } = require('uuid')

// User Transactions Schema - Money
const WalletTransactionSchema = new Schema({
    transactionID: {
        type: String,
        default: () => {
            let transactionID = `#TD` + uuidv4().replace(/-/g, '')
            transactionID = transactionID.slice(0, 16)
            return transactionID
        } 
    },
    amount: {
        type: Number,
    },
    transactionType: {
        type: String,
        enum: ['credit', 'debit', 'referral']
    },
    paymentType: {
        type: String,
        enum: ['Razorpay', 'PayPal', 'Referral', 'Wallet'],
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: ['Pending', 'Failed', 'Success'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Wallet Schema
const WalletSchema = new Schema({
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    balance: {
        type: Number,
        default: 0.0
    },
    transactions: [ WalletTransactionSchema ],
}, { timestamps: true })


const WalletData = model('Wallet', WalletSchema)

module.exports = {
    WalletData
}


// Cron Job to check if the Pending transaction to Failed
cron.schedule('*/5 * * * *', async () => {
    try {
      // Current Date 
      const dateNow = new Date()
 
      // Fetch all Expired Offers where isActive is true
      const pendingTransactions = await WalletData.find({ 'transactions.status': 'Pending' })
  
      if(pendingTransactions.length > 0) {
          // update the array of expiredOffers
          await WalletData.updateMany({ 'transactions.status': 'Pending' },
            { $set: {'transactions.$.status': 'Failed' }})
      }
    } catch (error) {
         console.error(`Error in Offers is ${error}`)
    }
 });