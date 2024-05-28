
const homePage = async (req, res) => {
    res.render('user/homePage')
    // res.send(`<h1> The Home Page </h1>`)
}

module.exports = {
    homePage
}