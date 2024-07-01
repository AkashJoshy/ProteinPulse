(() => {
    "use strict";
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll(".needs-validation");
    const inputs = document.querySelectorAll(".order-form");
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
          
          inputs.forEach(input => {
            console.log(input.value);
            const trimmedValue = input.value.trim()
            if(trimmedValue === ""){
              console.log(trimmedValue);
              input.classList.add(inValid);
              event.preventDefault();
            } else {
              input.classList.remove(inValid);
            }
          })
  
          form.classList.add("was-validated");
        },
        false
      );
    });
  })();


  