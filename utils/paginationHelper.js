

async function getPaginatedData(model, page, limit, sort={}, query={}) {
    try {

        const skip = (page - 1) * limit;
        const totalDocuments = await model.countDocuments(query)
        const totalPages = Math.ceil(totalDocuments / limit)
    
        let data = await model.find(query).sort(sort).skip(skip).limit(limit).lean();
    
        console.log(page);
        console.log(`Total Pages: ${totalPages}`);

        const pagination = {
          currentPage: page,
          isPrevious: page > 1,
          isNext: page < totalPages,
          totalPages,
        };

        return { data, pagination }
    } catch (error) {
        console.log(error.message)
    }

}


module.exports = {
    getPaginatedData
}