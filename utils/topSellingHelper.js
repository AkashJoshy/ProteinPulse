const { ProductData } = require('../models/productDB')
const cron = require('node-cron')

let topProducts = []
let topCategories = []
let topBrands = []

cron.schedule('* * * * * *', async () => {
    try {
        topProducts = await ProductData.find({}).sort({ totalSales: -1 }).limit(10).lean()

        topCategories = await ProductData.aggregate([
            {
                $group: {
                    _id: '$categoryName',
                    totalSales: { $sum: '$totalSales' }
                }
            },
            {
                $sort: { totalSales: -1 }
            },
            {
                $limit: 10
            }
        ])

        topBrands = await ProductData.aggregate([
            {
                $group: {
                    _id: '$brand',
                    totalSales: { $sum: '$totalSales' }
                }
            },
            {
                $sort: { totalSales: -1 }
            },
            {
                $limit: 10
            }
        ])
      
  
    } catch (error) {
        console.log(error)
    }
});

module.exports = {
    getTopProducts: () => topProducts,
    getTopCategories: () => topCategories,
    getTopBrands: () => topBrands,
}