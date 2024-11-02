
const searchBtn = document.getElementById('searchBtn')
// Debouncing
const debounce = (func, delay) => {
  let timer
  return function () {
    const context = this
    const args = arguments
    clearTimeout(timer)
    timer = setTimeout(() => func.apply(context, args), delay)
  }
}

// Products Search
function searchProduct() {
  searchBtn.addEventListener('input', debounce(function (e) {
    let search = e.target.value.trim()
    if (searchBtn.value == " " || searchBtn.value == "") {
      return
    }
    localStorage.setItem('searchQuery', search)

    // Ajax Request
    $.ajax({
      url: `/user/products/search`,
      method: 'GET',
      data: {
        search: search
      },
      success: response => {
        if (response.status) {
          window.location.href = response.redirected
          searchBtn.value = localStorage.getItem('searchQuery')
        } else {
          window.location.href = response.redirected
        }
      }
    })
  }, 1000))
}
