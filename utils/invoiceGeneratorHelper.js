const generateInvoiceNumber = require('./generateInvoiceNumberHelper')
const PDFDocument = require('pdfkit')
const path = require('path')
const fs = require('fs')


const invoiceGenerator = (order) => {
    try {
        let date = new Date()
        let formattedDate = new Date(date).toISOString().split('T')[0];
        const doc = new PDFDocument()
        let invoice = generateInvoiceNumber()

        const companyDetails = {
            name: "Your Company Name",
            address: "123 Business Road",
            zipcode: "98765",
            phone: "123-456-7890",
        };

        const customerDetails = {
            name: `${order.customer}`,
            address: `${order.address.address}`,
            zipcode: `${order.address.zipcode}`,
            phone: `${order.address.mobileNumber}`,
        };

        const timestamp = date.getTime();
        const parentDir = path.dirname(__dirname)
        const fileName = `invoice_${order.customer}_${formattedDate}_${timestamp}.pdf`
        const filePath = path.join(parentDir, 'public', 'invoices', fileName)
        const logoPath = path.join(parentDir, 'public', 'picture', 'logo', 'logoUser.png')

        let dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        

        const writeStream = fs.createWriteStream(filePath)
        doc.pipe(writeStream);

        doc.image(logoPath, 30, 20, {
            width: 50,
            height: 50,
            align: 'left',
            valign: 'top'
        });

        doc.font('Helvetica').fontSize(12).text('PROTEIN PULZE PLAZA', 90, 45);
        const text = 'INVOICE';
        const textX = 400;
        const textY = 40;

        doc.font('Helvetica-Bold').fontSize(30);

        doc.rect(376, 30, 6, 38)
            .fill('#000000');
        doc.rect(383, 30, 3, 38)
            .fill('#000000');
        doc.rect(388, 30, 6, 38)
            .fill('#000000');

        const textWidth = doc.widthOfString(text);
        const textHeight = doc.currentLineHeight();

        doc.rect(textX - 5, textY - 10, textWidth + 10, textHeight + 10)
            .fill('#F46F36');

        doc.fillColor('#000000')
            .text(text, textX, textY);

        doc.font('Helvetica').fontSize(11)
            .text('Invoice Number: ', 40, 90);
        doc.text(`${invoice}`, 125, 90)

        doc.text(`Date:`, 40, 115)
        doc.text(`${formattedDate}`, 70, 115)

        let position = 150

        doc.moveDown()
        doc.moveTo(0, doc.y).lineTo(650, doc.y).stroke()
        doc.moveDown()

        doc.text(`Order Status: ${order.status}`, 40, position)
        doc.moveDown()

        // position+=30
        doc.text(`Payment Method: ${order.paymentMethod}`, 40, position, { align: 'right' })
        doc.moveDown()

        position += 25
        doc.text(`Payment Status: ${order.paymentStatus}`, 40, position)
        doc.moveDown()

        doc.text(`Order Date: ${new Date(order.createdAt).toISOString().split('T')[0]}`, 40, position, { align: 'right' })
        doc.moveDown()
        
        position += 25
        if (order.status === 'Refunded') {
            doc.text(`Order is refunded because of product defect`, 40, position)
        } else if (order.status === 'Returned') {
            doc.text(`Order has been returned`, 40, position)
        } else {
            doc.text(order.orderActivity[order.orderActivity.length - 1].message, 40, position)
        }


        doc.moveDown()
        doc.moveTo(0, doc.y).lineTo(650, doc.y).stroke()
        doc.moveDown()

        position += 30

        doc.fontSize(12).text("Bill from:", 50, position + 5, { align: 'left' });
        doc.fontSize(10)
            .text(`${companyDetails.name}`, 50, position + 25)
            .text(`${companyDetails.address}`, 50, position + 45)
            .text(`${companyDetails.zipcode}`, 50, position + 65)
            .text(`Phone: ${companyDetails.phone}`, 50, position + 85);


        doc.fontSize(12).text("Bill to:", 380, position + 5, { align: 'left' });
        doc.fontSize(10)
            .text(`${customerDetails.name}`, 380, position + 25)
            .text(`${customerDetails.address}`, 380, position + 45)
            .text(`${customerDetails.zipcode}`, 380, position + 65)
            .text(`Phone: ${customerDetails.phone}`, 380, position + 85);

        doc.moveDown(2)
        doc.moveTo(0, doc.y).lineTo(650, doc.y).stroke()
        doc.moveDown(1)
        position+=125

        doc.fontSize(12).font('Helvetica-Bold').text(`Product`, 30, position)
        doc.text(`Price`, 350, position)
        doc.text(`Quantity`, 410, position)
        doc.text(`Amount`, 480, position)

        // doc.moveDown()
        doc.moveTo(0, doc.y).lineTo(650, doc.y).stroke()
        doc.moveDown()

        doc.fontSize(10).font('Helvetica')

        let yPosition = position +30;
        const lineHeight = 35;

        order.products.forEach(product => {
            doc.text(`${product.productName}`, 30, yPosition)
            if(order.status == 'Cancelled' || order.status == 'Returned' || order.status == 'Refunded') {
                yPosition+=15
                doc.fontSize(7).fillColor('#808080')
                doc.text(`(${product.status})`, 30, yPosition)
                doc.fontSize(10).fillColor('#000000')
            }
            doc.text(`₹ ${product.price}`, 350, yPosition)
            doc.text(`${product.quantity}`, 430, yPosition)
            doc.text(`₹${product.quantity * product.price}`, 480, yPosition)

            yPosition += lineHeight
        })
        doc.moveDown(2)

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()

        doc.moveDown(1)
        doc.text(`Terms & Conditions:`, 30)

        doc.moveDown(1)
        let totalsYPosition = yPosition + 50;

        doc.font('Helvetica').fontSize(12).text(`Subtotal:`, 380, totalsYPosition);
        doc.text(`₹${order.totalSalePrice + order.discountPrice}.00`, 480, totalsYPosition, { align: 'right' });
        totalsYPosition += 20;

        doc.text(`Discount:`, 380, totalsYPosition);
        doc.text(`₹${order.discountPrice}.00`, 480, totalsYPosition, { align: 'right' });
        totalsYPosition += 20;

        doc.text(`Coupon Discount:`, 380, totalsYPosition);
        if (order.coupons.length >= 1) {
            doc.text(`₹${order.deliveryCharge - (order.totalPrice - order.totalSalePrice)}.00`, 480, totalsYPosition, { align: 'right' });
        } else {
            doc.text(`₹0.00`, 480, totalsYPosition, { align: 'right' });
        }
        totalsYPosition += 20;

        doc.text(`Delivery Fee:`, 380, totalsYPosition,);
        doc.text(`₹${order.deliveryCharge}`, 480, totalsYPosition, { align: 'right' });
        totalsYPosition += 20;
        
        doc.text(`Tax:`, 380, totalsYPosition,);
        doc.text(`₹0.00`, 480, totalsYPosition, { align: 'right' });
        totalsYPosition += 20;

        if ((order.paymentMethod === 'Razorpay' || order.paymentMethod === 'myWallet') && order.status !== 'Refunded') {
            doc.text(`Paid:`, 380, totalsYPosition);
            doc.text(`₹${order.totalPrice}.00`, 480, totalsYPosition, { align: 'right' });
        } else if ((order.paymentMethod === 'Razorpay' || order.paymentMethod === 'myWallet') && order.status == 'Refunded') {
            doc.text(`Refunded:`, 380, totalsYPosition);
            doc.text(`₹${order.totalPrice}.00`, 480, totalsYPosition, { align: 'right' });
        } else if (order.paymentMethod === 'COD' && order.status === "Delivered") {
            doc.text(`Paid:`, 380, totalsYPosition);
            doc.text(`₹${order.totalPrice}.00`, 480, totalsYPosition, { align: 'right' });
        } else {
            doc.text(`Paid:`, 380, totalsYPosition);
            doc.text(`₹0.00`, 480, totalsYPosition, { align: 'right' });
        }

        totalsYPosition += 30;
        doc.moveTo(50, totalsYPosition).lineTo(550, totalsYPosition).stroke();

        doc.moveDown(3)

        let totalText = `Total: ₹${order.totalPrice}.00`;

        const totalTextWidth = doc.widthOfString(totalText);
        const totalTextHeight = doc.currentLineHeight();

        const rectX = 390;
        const rectWidth = totalTextWidth + 60;
        const rectY = totalsYPosition + 15;

        doc.rect(rectX, rectY, rectWidth, totalTextHeight + 20)
            .fill('#000000');

        doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF')
            .text(totalText, textX, totalsYPosition + 25);

        doc.end()

        console.log(`file Name`)
        console.log(fileName)
        return fileName
    } catch (error) {
        console.log(error)
    }
}


module.exports = invoiceGenerator