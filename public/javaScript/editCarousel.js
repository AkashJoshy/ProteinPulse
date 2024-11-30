(() => {
    "use strict";

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll(".needs-validation");

    Array.from(forms).forEach((form) => {
        form.addEventListener(
            "submit",
            (event) => {
                if (!form.checkValidity()) {
                    event.stopPropagation();
                    event.preventDefault();
                } else {
                    event.preventDefault();
                    let submitter = event.submitter.id
                    if(submitter == 'edit-carousel') {
                        let data = $(forms).serializeArray()
                        $.ajax({
                            url: `/admin/edit-carousel`,
                            method: 'PUT',
                            data: data ,
                            success: response => {
                                if(response.status) {
                                    window.location.href = response.redirected
                                } else {
                                    if(response.message) {
                                        Swal.fire(response.message).then(() => window.location.href = response.redirected)
                                        return
                                    }
                                    window.location.href = response.redirected
                                }
                            }
                        })
                    }
                }


                form.classList.add("was-validated");
            },
            false
        );
    });
})();
