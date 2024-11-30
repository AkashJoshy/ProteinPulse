(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");
  const stringFields = document.querySelectorAll('input[type="text"]')

  // Function to convert base64 to Blob
  function base64ToBlob(base64, mime) {
    let byteString = atob(base64.split(",")[1]);
    let ab = new ArrayBuffer(byteString.length);
    let ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  // Loop over forms and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {

        stringFields.forEach(stringField => {
          var pattern = /^[A-Za-z ]+$/;
          if(!pattern.test(stringField.value)) {
            event.stopPropagation();
            event.preventDefault();
            form.classList.add("was-validated"); 
            return;

          }
        })

        if (!form.checkValidity()) {
          event.stopPropagation();
          event.preventDefault();
          form.classList.add("was-validated"); 
          return;
        }
        event.preventDefault();

        // FormData handling
        let formData = new FormData(form);

        // Remove unwanted file fields if needed
        formData.delete("file0");
        formData.delete("file1");
        formData.delete("file2");
        formData.delete("file3");

        // Get all img tags within the div with id "croppedImages"
        let imgTags = document.querySelectorAll(".cropped-image");

        // Loop through each img tag and convert the base64 src to Blob
        imgTags.forEach((img, index) => {
          let base64Image = img.src;
          if (base64Image) {
            let mime = base64Image.match(/data:([^;]+);base64,/)[1];
            let blob = base64ToBlob(base64Image, mime);
            let filename = `cropped-image-${index + 1}.${mime.split("/")[1]}`; // Generate a filename with the appropriate extension
            formData.append(`file${index + 1}`, blob, filename);
          }
        });

        // Append the category name
        const category = document.querySelector(".category-name");
        if (category) {
          let categoryName = category.value;
          formData.append("categoryName", categoryName);
        }

        // Fetch API call
        fetch("/admin/edit-product", {
          method: "PUT",
          body: formData,
        })
          .then((response) => {
            if (response.redirected) {
              window.location.href = response.url;
              return;
            }
            return response.json();
          })
          .catch((error) => {
            console.error("Error:", error);
          });

        // Add validation class
        form.classList.add("was-validated");
      },
      false
    );
  });
})();
