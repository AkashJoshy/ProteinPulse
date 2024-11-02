
// Quantity 
const quantities = document.querySelectorAll('.quantity-count')
// Function to manage Cart product Quantity
let originalPrice = document.querySelector('.originalPrice')
let discountPercentage = document.querySelector('.discount-percentage')
let discountPrice = document.querySelector('.discount-price')
let couponPercentage = document.querySelector('.coupon-percentage')
let couponDiscountPrice = document.querySelector('.coupon-discount-price')
let totalPrice = document.querySelector('.total-price')
let deliveryCharge = document.querySelector('.delivery-charge')

// Offer selection
// select an available offer
const selectedOffer = document.querySelector('.offer')
const couponMsg = document.querySelector('.coupon-msg')
// Enter a offer code
const inputOffer = document.querySelector('.offer-input')
const appliedCoupons = document.querySelector('.applied-coupons')
const couponsPriceDetails = document.querySelector('.coupons-price-details')
// Offer selection Default name 
const offerDefaultValue = selectedOffer.value

selectedOffer.addEventListener('change', e => {
    couponMsg.innerHTML = ``
    const offerValue = e.target.value.split('(')
    selectedOffer.value = offerDefaultValue
    inputOffer.value = offerValue[0]
    //    console.log(inputOffer.value)
})

// Coupon code inputing 
inputOffer.addEventListener('input', () => {
    couponMsg.innerHTML = ``
})


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
                url: `/cart/delete-product`,
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


// Manage Cart Product Quantities
function manageCartProductQuantity(quantity, count, productID, cartProductID) {
    $.ajax({
        url: `/cart/update-product-quantity`,
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
                originalPrice.textContent = response.originalPrice
                discountPercentage.innerHTML = response.discountPercentage
                deliveryCharge.innerHTML = response.deliveryCharge
                discountPrice.innerHTML = response.discountPrice
                totalPrice.innerHTML = response.totalPrice
                if(couponPercentage) couponPercentage.innerHTML = response.couponDiscountPercentage
                if(couponDiscountPrice) couponDiscountPrice.innerHTML = response.couponPrice
           } else {
            if(response.message) {
                return Swal.fire(response.message)
            }
            window.location.href = response.redirected
           }
        }
    })
}

function applyCoupon() {
    if (inputOffer.value.length > 0) {
        console.log(inputOffer.value);
        $.ajax({
            url: `/cart/apply-coupon/${inputOffer.value}`,
            method: 'PATCH',
            success: response => {
                if (response.status) {
                    if (response.isCoupon) {
                        if (couponMsg) couponMsg.innerHTML = ``;
                        if (appliedCoupons) appliedCoupons.innerHTML += `
                        <div class="border border-2 mb-2 d-inline-flex rounded mx-3" style="background-color: #ffffff;">
                            <i class="fa-solid fa-tag mt-2 ms-2"></i>
                            <h6 class="mt-1 px-1">${response.couponCode}</h6>
                            <i style="font-size: 1.2rem;" onclick="removeCoupon('${response.cartID}', '${response.couponCode}', this.parentElement)" class="fa-solid fa-xmark ms-auto me-3 mt-1"></i>
                        </div>
                        `;

                        couponsPriceDetails.innerHTML = `
                        <div class="d-flex">
                            <h6 class="text-secondary py-2 ">
                            Coupon(
                            <span class="coupon-percentage">${response.couponDiscountPercentage}</span>%)
                            </h6>
                            <h6 class="text-danger ms-auto py-2">
                                ₹
                            <span class="coupon-discount-price">
                            ${response.couponDiscountPrice}
                            </span>
                            </h6>
                        </div>
                        `;

                        totalPrice.innerHTML = response.totalPrice;
                        if(couponPercentage) couponPercentage.innerHTML = response.couponDiscountPercentage;
                        if(couponDiscountPrice) couponDiscountPrice.innerHTML = response.couponDiscountPrice;
                        inputOffer.value = "";
                    } else {
                        // Show Error Messages
                        if (couponMsg) couponMsg.innerHTML = response.message;
                    }
                } else {
                    // If the user is not found, back to login Page
                    window.location.href = response.redirected
                }
            }
        });
    } else {
        console.log(couponPercentage.innerHTML)
    }
}


    // Remove Coupon
    function removeCoupon(cartID, couponCode, element) {
        console.log(cartID)
        console.log(couponCode)
        console.log(element)
        $.ajax({
            url: `/cart/remove-coupon/${couponCode}`,
            method: 'PATCH',
            success: response => {
                if(response.status) {
                      Toastify({
                      text: response.message,
                      duration: 3000,
                      close: true,
                      gravity: "bottom", 
                      position: "right",
                      style: {
                          background: "black",
                          color: "white",
                          borderRadius: "10px"
                      }
                  }).showToast();
                  if (response.isCoupon) {
                    if (couponMsg) couponMsg.innerHTML = ``;
                    // if (appliedCoupons) appliedCoupons.innerHTML += `
                    // <div class="border border-2 mb-2 d-inline-flex rounded mx-3" style="background-color: #ffffff;">
                    //     <i class="fa-solid fa-tag mt-2 ms-2"></i>
                    //     <h6 class="mt-1 px-1">${response.couponCode}</h6>
                    //     <i style="font-size: 1.2rem;" onclick="removeCoupon('${response.cartID}', '${response.couponCode}', this.parentElement)" class="fa-solid fa-xmark ms-auto me-3 mt-1"></i>
                    // </div>
                    // `;

                    couponsPriceDetails.innerHTML = `
                    <div class="d-flex">
                        <h6 class="text-secondary py-2 ">
                        Coupon(
                        <span class="coupon-percentage">${response.couponDiscountPercentage}</span>%)
                        </h6>
                        <h6 class="text-danger ms-auto py-2">
                            ₹
                        <span class="coupon-discount-price">
                        ${response.couponDiscountPrice}
                        </span>
                        </h6>
                    </div>
                    `;
                    console.log(response.couponDiscountPercentage)
                    console.log(response.couponDiscountPrice)
                    totalPrice.innerHTML = response.totalPrice;
                    if(couponPercentage) couponPercentage.innerHTML = response.couponDiscountPercentage;
                    if(couponDiscountPrice) couponDiscountPrice.innerHTML = response.couponDiscountPrice;
                    inputOffer.value = "";
                } else {
                    // Show Error Messages
                    if (couponMsg) couponMsg.innerHTML = response.message;
                }
                // Remover field
                if(element) {
                    $(element).remove()
                }
                } else {
                    window.location.href = response.redirected
                }
            }
        })
    }


