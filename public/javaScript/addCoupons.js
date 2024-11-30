
(() => {
    'use strict';

    // Define the pattern for validation

    const pattern = /^(?![^\w\s])[A-Za-z0-9\s]*(?:[ ,%][A-Za-z0-9\s]*)*(?:\b(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})\b)?$/;

    // Function to validate a single input
    function validateInput(input) {
        if (!pattern.test(input.value.trim()) || input.value.trim() === '') {
            input.style.borderColor = "red";
            return false;
        } else {
            input.style.borderColor = "green";
            return true;
        }
    }

    // Function to validate all inputs in a form
    function validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('.form-control');
        inputs.forEach(input => {
            if (!validateInput(input)) {
                isValid = false;
            }
        });
        return isValid;
    }

    // Fetch all forms with class 'needs-validation'
    const forms = document.querySelectorAll('.needs-validation');
    
    // Add event listeners to each form
    Array.from(forms).forEach(form => {
        // Validate inputs on form submission
        form.addEventListener('submit', event => {
            if (!validateForm(form)) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Add event listeners to inputs for real-time validation
    document.querySelectorAll('.form-control').forEach(input => {
        // Validate input on every input event
        input.addEventListener('input', () => validateInput(input));
        
        // Remove default styling on focus
        input.addEventListener('focus', () => {
            input.style.boxShadow = 'none';
            input.style.backgroundColor = 'white';
        });
    });
})();
