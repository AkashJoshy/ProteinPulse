const inputs = document.querySelectorAll('input')

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.value === " " || input.value === "" || input.value === 0) {
                input.value = input.value.trim()
            }
        })
    })


// Past Dates Disabling

    $(function(){
        var dtToday = new Date();

        var month = dtToday.getMonth() + 1;
        var day = dtToday.getDate();
        var year = dtToday.getFullYear();
        if(month < 10)
            month = '0' + month.toString();
        if(day < 10)
            day = '0' + day.toString();

        var minDate= year + '-' + month + '-' + day;

        $('#bestBefore').attr('min', minDate);
    });
