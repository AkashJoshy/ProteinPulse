const { Schema, model } = require('mongoose')
const cron = require('node-cron')

// User Transactions Schema - Money
const WalletTransactionSchema = new Schema({
    transactionID: {
        type: String,
        unique: true,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionType: {
        type: String,
        enum: ['credit', 'debit', 'referral']
    },
    paymentType: {
        type: String,
        enum: ['Razorpay', 'PayPal', 'Referral', 'Wallet'],
        required: true
    },
    description: {
        type: String,
        required: true
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