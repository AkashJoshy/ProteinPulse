(() => {
    "use strict";
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll(".needs-validation");

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

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {

        if (!form.checkValidity()) {
          event.stopPropagation();
          form.classList.add("was-validated"); 
          event.preventDefault()
          return;
        }
        event.preventDefault()
        
        let formData = new FormData(form);
        formData.delete("file0");
        formData.delete("file1");
        formData.delete("file2");
        formData.delete("file3");
        console.log(formData);


        // Get all img tags within the div with id "croppedImages"
        let imgTags = document.querySelectorAll(".cropped-image");

        // Loop through each img tag and convert the base64 src to Blob
        imgTags.forEach((img, index) => {
          let base64Image = img.src;
          if(base64Image != null && base64Image != '') {
            // Extract the MIME type from the base64 string
            let mime = base64Image.match(/data:([^;]+);base64,/)[1];
            let blob = base64ToBlob(base64Image, mime);
            let filename = `cropped-image-${index + 1}.${mime.split("/")[1]}`; // Generate a filename with the appropriate extension
            formData.append(`file${index + 1}`, blob, filename);
          }
        });

      // Id of Submit btn's
      const clickedButton = event.submitter.id

      if(clickedButton == 'add-product') {
        fetch("/admin/add-product", {
          method: "POST",
          body: formData,
        }).then(response => {
          if (response.redirected) {
              console.log('Redirected to:', response.url);
              window.location.href = response.url;
              return;
          }
          return
      }).catch((error) => {
            console.error("Error:", error);
          });
      } else {
        // Here i have takes in else case is edit Product
        fetch("/admin/edit-product", {
          method: "POST",
          body: formData,
        })
          .then((response) => {
            if (response.redirected) {
              console.log("Redirected to:", response.url);
              window.location.href = response.url;
              return;
            }
            return response.json();
          })
          .catch( error => {
            console.error("Error:", error);
          })
      }
        form.classList.add("was-validated");
      },
      false
    );
  });
})();
  