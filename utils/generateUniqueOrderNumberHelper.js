const { v4: uuidv4 } = require('uuid');
const { OrderData } = require('../models/OrderDB')

// Fn to Generate a unique number and also to check if it is unique in the DB too
const generateOrderNumber = async () => {
    let orderNumber 
    let isUnique = false
    
    while(!isUnique) {
        // Generating a unique order number 
        orderNumber = "#PZ" + uuidv4().replace(/-/g, ''); // Remove Hypen from UUID (which will be easier and nicer for uniqness)
        orderNumber = orderNumber.slice(0, 18);

        // check whether the number is unique 
        let existingNumber = await OrderData.findOne({ orderNumber: orderNumber })
        if(!existingNumber) {
            isUnique = true
        }
       
    }
    
    return orderNumber
}

module.exports = generateOrderNumber;