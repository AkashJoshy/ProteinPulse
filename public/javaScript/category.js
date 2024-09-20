/************************************************Form Validation************************************/ 
(() => {
    "use strict";
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll(".needs-validation");
    const inputs = document.querySelectorAll("input");
    const valid = document.querySelector(".valid-feedback");
    const inValid = valid.nextElementSibling;
  
    // Loop over them and prevent submission
    Array.from(forms).forEach((form) => {
      form.addEventListener(
        "submit",
        (event) => {
          if (!form.checkValidity()) {
            event.stopPropagation();
            event.preventDefault();
          }

          console.log(event);
          

          form.classList.add("was-validated");
        },
        false
      );
    });
  })();
  /*********************************************///Form Validation************************************/ 