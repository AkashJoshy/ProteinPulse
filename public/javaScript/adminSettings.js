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
          
          // const passwordFormData = new FormData(form)
  
          const clickedButton = event.submitter.id
  
          // update User Details
          if(clickedButton === 'updateAdminDetails') {
            $.ajax({
              url: '/admin/settings/update-admin-details',
              type: 'PUT',
              data: new FormData(form),
              processData: false, 
              contentType: false,
              success: response => {
                if (response.status) {
                  Swal.fire(response.message).then(() => window.location.reload() )
                } else {
                  Swal.fire('User Details cannot be updated')
                  window.location.href = response.redirected; 
                }
              },
              error: (error) => {
                alert(`Form was not Submitted`)
              } 
            })
          } else if (clickedButton === 'changeProfilePic') {
            // Change Profile Pic
            $.ajax({
              url: '/dashboard/account-details/change-profile-picture',
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
              url: '/dashboard/account-details/change-password',
              type: 'PUT',
              data: new FormData(form),
              processData: false, 
              contentType: false,
              success: response => {
                if (response.status) {
                alert('Password changed successfully! Redirecting...');
                window.location.href = response.redirected; 
              } else {
                window.location.href = response.redirected; 
                alert('Failed to change password. Please try again.');
              }
            },
            error: (error) => {
              alert(`Form was not Submitted`)
            } 
          })
        }
          
      }
        
        form.classList.add('was-validated')
      }, false)
    })
  })()