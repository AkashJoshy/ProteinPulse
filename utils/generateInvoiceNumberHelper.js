
let counter = 0

function generateInvoiceNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    counter++
    return `INV-${date}-${counter.toString().padStart(4, "0")}`
}

module.exports = generateInvoiceNumber