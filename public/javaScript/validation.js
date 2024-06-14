(() => {
  'use strict'
  
  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')
  const inputs = document.querySelectorAll('input')
  const valid = document.querySelector('.valid-feedback')
  const inValid = valid.nextElementSibling

    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }


        inputs.forEach((input, index) => {
          let val = input.value.trim();
          console.log(val);
          if (val !== input.value) {
            if (val.length === 0) {
              console.log(val.length);
              event.preventDefault()
              console.log(valid);
              console.log();
              console.log(inValid);
              input.classList.add('is-invalid'); // Add invalid class
            } else {
              input.classList.remove('is-invalid'); // Remove invalid class
            }
          } else {
            input.classList.remove('is-invalid'); // Remove invalid class
          }
        });
  
      
        

        form.classList.add('was-validated')

      }, false)
    })
  })()
  
  