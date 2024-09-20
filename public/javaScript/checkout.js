(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");
  const inputs = document.querySelectorAll(".order-form");
  const validClass = 'is-valid'; // Bootstrap class for valid inputs
  const invalidClass = 'is-invalid'; // Bootstrap class for invalid inputs
  const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');

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

              if(event.submitter.id === 'place-order') {
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
                            if(response.status) {
                                // fn to get Payment info
                                if(response.razorpayStatus) {
                                    razorPayPayment(response.order, response.RAZORPAY_KEY_ID)
                                } else if (response.codStatus) {
                                    window.location.href = response.redirected
                                } else if (response.walletStatus) {
                                    // Add the wallet operation here
                                } else {
                                    Swal.fire("Cant place order due to Internal error")
                                }
                            } else {
                                window.location.href = response.redirected
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
 function razorPayPayment(order, keyID){
    var options = {
        "key": keyID, // Enter the Key ID generated from the Dashboard
        "amount": order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        "currency": "INR",
        "name": "PROTEIN PULZE PLAZA", //your business name
        "description": "Test Transaction",
        "image": "/picture/logo/logoUser.png",
        "order_id": order.id,
        // call the Handler after Payment
        "handler": response => {
            alert(response.razorpay_payment_id);
            alert(response.razorpay_order_id);
            alert(response.razorpay_signature);
            // calls the Fn to verify Razorpay Payment
            verifyPayment(response, order)
        },
        "prefill": { //We recommend using the prefill parameter to auto-fill customer's contact information, especially their phone number
            "name": "Gaurav Kumar", //your customer's name
            "email": "gaurav.kumar@example.com", 
            "contact": "9000090000"  //Provide the customer's phone number for better conversion rates 
        },
        "notes": {
            "address": "Razorpay Corporate Office"
        },
        "theme": {
            "color": "#F46F36"
        }
    };

    var rzp1 = new Razorpay(options);
    rzp1.on('payment.failed', function (response){
        alert(response.error.code);
        alert(response.error.description);
        alert(response.error.source);
        alert(response.error.step);
        alert(response.error.reason);
        alert(response.error.metadata.order_id);
        alert(response.error.metadata.payment_id);
    });
    rzp1.open(); 
    
 } 

// Verify payment (Razorpay)
function verifyPayment(razorpay, order) {
    $.ajax({
        url: `/verify-payment`,
        method: 'POST',
        data: {
            razorpay,
            order
        },
        success: response => {
            
        },
        error: (xhr, status, err) => {
            console.error(err);
        }
    })
}


})();
