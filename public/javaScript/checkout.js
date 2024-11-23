(() => {
    "use strict";

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll(".needs-validation");
    const inputs = document.querySelectorAll(".order-form");
    const validClass = 'is-valid'; // Bootstrap class for valid inputs
    const invalidClass = 'is-invalid'; // Bootstrap class for invalid inputs

    // Function to validate inputs
    function validateInputs(event) {
        let allValid = true;
        inputs.forEach(input => {
            const trimmedValue = input.value.trim();
            if (trimmedValue === "") {
                input.classList.add(invalidClass);
                input.classList.remove(validClass);
                allValid = false;
            } else {
                input.classList.remove(invalidClass);
                input.classList.add(validClass);
            }
        });
        return allValid;
    }

    // Loop over forms and prevent submission
    Array.from(forms).forEach((form) => {
        form.addEventListener(
            "submit",
            (event) => {
                // Perform input validation
                if (!validateInputs(event) && !form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                    form.classList.add("was-validated");
                    return; // Stop further processing if validation fails
                }

                if (event.submitter.id === 'place-order') {
                    event.preventDefault()
                    const formData = new FormData(form)
                    // Place order (COD, RAzorpay and Wallet)
                    $.ajax({
                        url: '/place-order',
                        method: 'POST',
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: response => {
                            if (response.status) {
                                if (response.insuffient) {
                                    Swal.fire(response.message)
                                    return
                                }
                                // fn to get Payment info
                                if (response.razorpayStatus) {
                                    razorPayPayment(response.order, response.RAZORPAY_KEY_ID, response.user)
                                } else if (response.codStatus) {
                                    window.location.href = response.redirected
                                } else if (response.walletStatus) {
                                } else {
                                    Swal.fire("Cant place order due to Internal error")
                                }
                            } else {
                                if (response.redirected) {

                                    window.location.href = response.redirected
                                } else {
                                    Swal.fire(response.message).then(()=> window.location.href = '/cart')
                                }
                            }
                        },
                        error: (xhr, status, error) => {
                            console.error(error);
                            Swal.fire("Error", "There was a problem processing your payment. Please try again.", "error");
                        }
                    })

                }

                form.classList.add("was-validated");
            },
            false
        );
    });

    // Razorpay payment
    function razorPayPayment(order, keyID, userDetails) {
        var options = {
            "key": keyID,
            "amount": order.amount,
            "currency": "INR",
            "name": "PROTEIN PULZE PLAZA",
            "description": "Test Transaction",
            "image": "/picture/logo/logoUser.png",
            "order_id": order.id,
            "handler": function (response) {
                // alert(response.razorpay_payment_id);
                // alert(response.razorpay_order_id);
                // alert(response.razorpay_signature);
                // calls the Fn to verify Razorpay Payment
                verifyPayment(response, order)
            },
            "prefill": {
                "name": userDetails.firstName + " " + userDetails.lastName,
                "email": userDetails.email,
                "contact": userDetails.mobileNumber
            },
            "notes": {
                "address": "Razorpay Corporate Office"
            },
            "theme": {
                "color": "#F46F36"
            }
        };

        var rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', function (response) {
            // alert("Payment failed!");
            alert(response.error.description);
            Swal.fire({
                title: 'Payment Failed',
                text: 'Your payment could not be processed. Please try again.',
                icon: 'error',
                showCancelButton: true,
                confirmButtonText: 'Retry Payment',
                cancelButtonText: 'Go to Cart'
            }).then((result) => {
                if (result.isConfirmed) {
                    rzp1.open();
                } else {
                    window.location.href = '/cart';
                }
            });
        });
        rzp1.open();

    }

    // Verify payment (Razorpay)
    function verifyPayment(razorpay, order) {
        if (razorpay.razorpay_payment_id) {
            $.ajax({
                url: `/verify-payment`,
                method: 'PUT',
                data: {
                    razorpay,
                    order
                },
                success: response => {
                    if (response.status) {
                        if (response.success) {
                            window.location.href = response.redirected
                        } else {
                            Swal.fire("Payment failed").then(() => window.location.href = response.redirected)
                        }
                    }
                    else {
                        if (!response.redirected) {
                            window.location.href = response.redirected
                            return
                        }
                        Swal.fire(response.message)
                    }
                },
                error: (xhr, status, err) => {
                    console.error(err);
                }
            })
        } else {
            Swal.fire("Payment failed").then(() => window.location.href = '/dashboard/my-cart')
        }
    }


})();
