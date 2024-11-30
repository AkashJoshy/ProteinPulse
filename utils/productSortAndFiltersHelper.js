const productSortAndFilters = (availability, priceRange, brands, flavour, discountPercentage, sortType) => {

    let sortOpt = {};
    sortOpt =
        sortType == "lowToHigh"
            ? { price: 1 }
            : sortType == "highToLow"
                ? { price: -1 }
                : sortType == "ascending"
                    ? { name: 1 }
                    : sortType == "descending"
                        ? { name: -1 }
                        : sortType == "averageRating"
                            ? { rating: -1 }
                            : sortType == "newArrivals"
                                ? { createdAt: -1 }
                                : {};

    let filters = {};
    if (availability) {
        filters.quantities = { $gt: 0 };
    } else {
        filters.quantities = { $gte: 0 };
    }

    if (priceRange) {
        let amountCondt = {
            uptoThousand: { salePrice: { $gte: 0, $lte: 999 } },
            btwThousandAndTwoThousand: { salePrice: { $gt: 1000, $lte: 1999 } },
            btwTwoThousandAndThreeThousand: {
                salePrice: { $gte: 2000, $lte: 2999 },
            },
            btwThreeThousandAndFourThousand: {
                salePrice: { $gte: 3000, $lte: 3999 },
            },
            btwFourThousandAndFiveThousand: {
                salePrice: { $gte: 4000, $lte: 4999 },
            },
            aboveFiveThousand: { salePrice: { $gte: 5000 } },
        };
        Object.assign(filters, amountCondt[priceRange] || {});
    }

    // Filtering Based on Discount
    if (discountPercentage) {
        let discountCondt = {
            tenPercentageAndBelow: { offer: { $gte: 0, $lte: 10 } },
            tenPercentageAndAbove: { offer: { $gte: 10 } },
            twentyPercentageAndAbove: { offer: { $gte: 20 } },
            thirtyPercentageAndAbove: { offer: { $gte: 30 } },
            fourthPercentageAndAbove: { offer: { $gte: 40 } },
            fifthPercentageAndAbove: { offer: { $gte: 50 } },
        };
        Object.assign(filters, discountCondt[discountPercentage] || {});
    }

    // filtering Flavours
    if (flavour && Array.isArray(flavour) && flavour.length > 0) {
        filters.flavour = { $in: flavour };
    } else if (flavour) {
        filters.flavour = { $in: [flavour] };
    }

    if (brands && Array.isArray(brands) && brands.length > 0) {
        filters.brand = { $in: brands };
    } else if (brands) {
        filters.brand = { $in: [brands] };
    }

    return { sortOpt, filters }
}


module.exports = productSortAndFilters