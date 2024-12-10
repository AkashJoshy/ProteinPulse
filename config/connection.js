const { connect } = require('mongoose')
require('dotenv').config()

const MONGODB = process.env.MONGO_URI

const createMongoConnection = async () => {
   try {
    await connect(MONGODB, {
        autoCreate: true
    })
    console.log('MongoDB Connected....')
   } catch(error) {
    console.error('MongoDB Connection Error:', error);
   }
}

module.exports = {
    createMongoConnection
}