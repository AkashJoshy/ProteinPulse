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
                    form.classList.add("was-validated");
                    return
                }

                const clickedButton = event.submitter.id
                if (clickedButton == 'addProductOffer' || clickedButton == 'categoryOfferBtn') {
                    event.preventDefault()
                    // Product Offer
                    $.ajax({
                        url: `/admin/add-offers`,
                        method: 'POST',
                        data: $(event.target).serialize(),
                        success: response => {
                            if (response.status) {
                                let offers = response.offers
                                let html = ``
                                // tbody    

                                offers.forEach(offer => {
                                    html += `
                                    <tr>
                                        <th> ${offer.name} </th>
                                        <td> ${offer.offerType} </td>
                                        <td style="padding-left: 35px;" > ${offer.discountPercentage}% </td>
                                        <td> ${offer.discount} </td>
                                        <td> ${offer.startingDate} </td>
                                        <td> ${offer.expiryDate} </td>
                                        ${offer.isActive ? 
                                            `<td><i class="fa-solid fa-trash text-danger" style="padding-left: 15px;"
                                            onclick="deleteCoupon('${offer._id}', this.parentElement.parentElement)"></i></td>`
                                            :
                                            `<td>Expired</td>`
                                        }
                    
                                    </tr>
                                    `
                                })

                                document.querySelector('tbody').innerHTML = html

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

                                form.reset()
                                form.classList.remove("was-validated")
                            } else {
                                window.location.href = response.redirected
                            }
                        }
                    })
                    // } else if (clickedButton == 'categoryOfferBtn') {

                } else {
                    Swal.fire("No offers to apply")
                }




                form.classList.add("was-validated");
            },
            false
        );
    });
})();