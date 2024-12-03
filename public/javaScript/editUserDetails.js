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
        // update User Details
        if(clickedButton === 'updateUserDetails') {
          $.ajax({
            url: '/user/dashboard/account-details/update-user-details',
            type: 'PUT',
            data: new FormData(form),
            processData: false, 
            contentType: false,
            success: response => {
              if (response.status) {
                Swal.fire('User Details Updated').then(() => window.location.href = response.redirected )
              } else {
                Swal.fire('User not found!').then(() => window.location.href = response.redirected )
              }
            },
            error: (error) => {
              alert(`Form was not Submitted`)
            } 
          })
        } else if (clickedButton == 'changeProfilePic' || clickedButton == 'changeProfilePicSm') {
          // Change Profile Pic
          $.ajax({
            url: '/user/dashboard/account-details/change-profile-picture',
            type: 'PUT',
            data: new FormData(form),
            processData: false, 
            contentType: false,
            success: response => {
              if(response.status) {
                Swal.fire('Profile Pic Succesfully changed')
              } else {
                window.location.href = response.redirected;
              }
          }
        })
      } else {
        // Change Password
          $.ajax({
            url: '/user/dashboard/account-details/change-password',
            type: 'PUT',
            data: new FormData(form),
            processData: false, 
            contentType: false,
            success: response => {
              if (response.status) {
              Swal.fire('Password changed successfully! Redirecting...').then(() => window.location.href = response.redirected )
            } else {
              Swal.fire('Failed to change password. Please try again.').then(() => window.location.href = response.redirected )
            }
          },
          error: (error) => {
            Swal.fire(`Form was not Submitted` + error)
          } 
        })
      }
        
    }
      
      form.classList.add('was-validated')
    }, false)
  })
})()