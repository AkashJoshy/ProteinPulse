(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");
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

        form.classList.add("was-validated");
      },
      false
    );
  });
})();
