// Form Validation
(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      } else {
        event.preventDefault()
        const clickedButton = event.submitter.id
        const formData = $('form').serializeArray();
        const searchSort = document.querySelector('.search-sort');
        let sortType = searchSort.value
        formData.push({ name: 'sortType', value: sortType })
        // update User Details
        if(clickedButton == 'applyFilters') {
          $.ajax({
            url: '/user/products/filters',
            type: 'GET',
            data: formData,
            success: response => {
              if (response.status) {
                console.log(`Arrived`);
                let productFilters = response.filterProducts
                console.log(typeof productFilters);
                
                let html = ``
                if(productFilters == 0) {
                  document.querySelector('#all-products-container').innerHTML = null;
                  document.querySelector('.product-err-msg').innerHTML = "No Product Available";
                  return
                }
                
                productFilters.forEach((productFilter, index) => {
                  html += `
                  <div id="products" class="col-12 col-md-6 col-xxl-4 mt-3">
                  <div class=" mt-3 products-container">
                      <a href="/user/products/${productFilter._id}" style="text-decoration: none;">
                          <div class="card mx-auto shadow-lg"
                          style="width: 16rem;cursor: pointer;"
                          >
                          ${productFilter.offer > 0 
                            ? 
                             `
                            <div class="offer-section px-2 text-center">
                                OFFER ${productFilter.offer}%
                            </div>
                            `
                            :
                            ``
                          }
                              <img style="height: 8rem; width: 10.5rem;" src="/uploads/${productFilter.imageUrl[0]}"
                                  class="card-img-top mt-4 mx-auto product-image pt-2" alt="..." />
                              <div class="card-body rounded-3"
                                  // {(isStock this.quantities)}
                                  ${productFilter.quantities <= 0 ?
                                    `
                                    style="background-color: #717171d1;"
                                    `
                                    :
                                    `
                                    style="background-color: white;"
                                    `
                                  }
                                  >
                                  <h6 class="card-title text-center text-black">
                                      ${productFilter.name}
                                  </h6>
                                  <h5 class="card-text text-black">₹${productFilter.salePrice}
                                        ${productFilter.salePrice != productFilter.price ?
                                    `<span
                                        class="px-2 text-decoration-line-through text-secondary">₹${productFilter.price}
                                    </span>`
                                    :
                                    ``
                                }
                                  </h5>
                                  <span class="fa fa-star checked"></span>
                                  <span class="fa fa-star checked"></span>
                                  <span class="fa fa-star checked"></span>
                                  <span class="fa fa-star checked"></span>
                                  <span class="fa fa-star checked"></span>
                                  ${ productFilter.quantities <= 0 ?

                                    `<div>
                                    <a href="#" class="btn mt-3"
                                    style="background-color: rgb(255, 43, 43); color: white;">SOLD OUT</a>
                                    </div>`
                                    :
                                    `<div>
                                    <a onclick="addToCart("${productFilter._id}")" class="btn mt-3 w-100 shadow-sm"
                                    style="background-color: #F46F36; color: white;">ADD TO CART</a>
                                    </div>`
                                  }

                              </div>
                          </div>
                      </a>
                  </div>
                  </div>
                  `
                  // then the looped Array ${html} is applying 
                  document.querySelector('.product-err-msg').innerHTML = null;
                  document.querySelector('#all-products-container').innerHTML = html;

                })
              } else {
                window.location.href = response.redirected; 
              }
            },
            error: (error) => {
              Swal.fire(`Error: ${error}`)
            } 
          })
        }  
    }
      
      form.classList.add('was-validated')
    }, false)
  })
})()