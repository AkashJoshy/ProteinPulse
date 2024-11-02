(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");


  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
          event.stopPropagation();
          event.preventDefault();
          form.classList.add("was-validated");
          return
        } else {
          event.preventDefault()
          $.ajax({
            url: `/user/dashboard/add-wallet-amount`,
            method: 'POST',
            data: $(form).serialize(),
            success: response => {
              if (response.status) {
                const keyID = response.RAZORPAY_KEY_ID
                let topUp = response.order
                const user = response.user
                var options = {
                  "key": keyID, // Enter the Key ID generated from the Dashboard
                  "amount": topUp.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
                  "currency": "INR",
                  "name": "PROTEIN PULZE PLAZA", //your business name
                  "description": "Test Transaction",
                  "image": "/picture/logo/logoUser.png",
                  "order_id": topUp.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
                  "handler": function (response) {
                      verifyWalletPayment(response, topUp)
                  },
                  "prefill": {
                    "name": user.firstName + " " + user.lastName,
                    "email": user.email,
                    "contact": user.mobileNumber
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
                  console.error('Payment failed:', response.error); // Log the full error for debugging
                  alert(response.error.description);
              
                  Swal.fire({
                      title: 'Payment Failed',
                      text: 'Your payment could not be processed. Please try again.',
                      icon: 'error',
                      showCancelButton: true,
                      confirmButtonText: 'Retry Payment',
                      cancelButtonText: 'Go to Wallet'
                  }).then((result) => {
                      if (result.isConfirmed) {
                          // Re-open Razorpay
                          rzp1.open();
                      } else {
                          window.location.reload();
                      }
                  });
              });
              
              rzp1.open();
              
              } else {
                if (response.message) {
                  Swal.fire(response.message)
                  .then(() => window.location.href = response.redirected)
                  .catch(err => window.location.reload())
                  return
                }
                window.location.href = response.redirected
              }
            }
          })

          form.classList.add("was-validated");

        }

      },
      false
    );
  });

  // Verify Payment
  function verifyWalletPayment(razorpay, topUp) {
    $.ajax({
      url: `/user/dashboard/verify-wallet-topup`,
      method: 'PUT',
      data: {
        razorpay,
        topUp
      },
      success: response => {
        if(response.status) {
          let topupMsg
          let topUpAmount = document.querySelector('#topUpAmount')
          if(response.success) {
            let walletBalance = document.querySelector('#wallet-balance')
            topupMsg = response.message
            walletBalance.innerHTML = response.totalBalance
            topUpAmount.value = ''
            forms.forEach(form => {
              form.reset()
              form.classList.remove("was-validated");
            })
          } else {
            topUpAmount.value = ''
            topupMsg = response.message
            forms.forEach(form => {
              form.reset()
              form.classList.remove("was-validated");
            })
          }
          
          Toastify({
            text: topupMsg,
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
        } else {
          if(response.message) {
            Swal.fire(response.message).then(()=> window.location.reload())
            return
          }
          window.location.href = response.redirected
        }
      }
    })
  }

})();
