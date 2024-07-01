
// Quantity 
const quantities = document.querySelectorAll('.quantity-count')

// Function to remove a product from the Cart
function deleteCartProduct(cartProductID, productID, productName) {
    Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to remove ${productName} from cart?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Yes, Delete it!`,
        cancelButtonText: 'No, cancel!',
    }).then(result => {
        if(result.isConfirmed) {
            $.ajax({
                url: `/delete-cart-product`,
                method: "PUT",
                data: {
                    productID,
                    cartProductID
                },
                success: response => {
                  if(response.status) {
                    Swal.fire(`Successfully removed ${productName}`)
                    .then(() => window.location.href = response.redirected)
                  } else {
                    window.location.href = response.redirected
                  }
                }
              }) 
        }
    })
}

// Function to manage Cart product Quantity
const subtotal = document.querySelector('.subtotal')
const discountPercentage = document.querySelector('.discount-percentage')
const discountAmount = document.querySelector('.discount-amount')
const totalAmount = document.querySelector('.total-amount')


function manageCartProductQuantity(quantity, count, productID, cartProductID) {
    $.ajax({
        // url: `/update-cart-product-quantity/${quantity}/${count}/${productID}/${cartProductID}`,
        url: `/update-cart-product-quantity`,
        method: "PUT",
        data: {
            quantity,
            count,
            productID,
            cartProductID
        },
        success: response => {
           if(response.status) {
                quantities[response.cartProductIndex].innerHTML = response.productQuantity
                subtotal.textContent = response.totalSaleAmount
                discountPercentage.innerHTML = response.discountPercentage
                discountAmount.innerHTML = response.savedprice
                totalAmount.textContent = response.totalAmount
           } else {
            if(response.message) {
                return Swal.fire(response.message)
            }
            window.location.href = response.redirected
           }
        }
    })
}

