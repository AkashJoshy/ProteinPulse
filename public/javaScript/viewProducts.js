

(() => {
    "use strict";
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll(".needs-validation");

    // Loop over them and prevent submission
    Array.from(forms).forEach((form) => {
      form.addEventListener(
        "submit",
        (event) => {
          if (!form.checkValidity()) {
            event.stopPropagation();
            event.preventDefault();
            event.preventDefault();
            form.classList.add("was-validated");
            return
          } 
          
          event.preventDefault();
          $.ajax({
            url: `/admin/product/update-stock`,
            method: 'PUT',
            data: $('#productUpateForm').serialize(),
            success: response => {
              if(response.status) {
                setTimeout(() => {
                  window.location.reload()
                }, 2000)
                // Success Msg
                // Toastify
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
              } else {
                if(response.redirected) {
                  window.location.href = response.redirected
                  return
                } else {
                  Swal.fire(response.message)
                }
              }
            }
          })

          form.classList.add("was-validated");
        },
        false
      );
    });
  })();
  