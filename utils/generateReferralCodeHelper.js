const { v4: uuidv4 } = require('uuid');
const { UserData } = require('../models/userDB') 


// Creating Unique Referal code for Each user
const generateReferralCode = async () => {
    let referralCode 
    let isUnique = false

    while(!isUnique) {
        referralCode = uuidv4().replace(/-/g, '')
        referralCode = referralCode.slice(0, 10)

        let existingReferalCode = await UserData.findOne({ referralCode: referralCode })

        // If the code is Unique, stop the loop
        if(!existingReferalCode) {
            isUnique = true
        }

    }

    return referralCode
}


module.exports = generateReferralCode