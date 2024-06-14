const {connect} = require('mongoose')

const createMongoConnection = async () => {
   try {
    await connect('mongodb://127.0.0.1/proteinpulse_plaza', {
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