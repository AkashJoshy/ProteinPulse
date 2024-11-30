$(document).ready(function () {
    $('.carousal-homepage').slick({
        dots: true,          
        infinite: true,       
        speed: 500,          
        slidesToShow: 1,     
        slidesToScroll: 1,    
        autoplay: true,      
        autoplaySpeed: 2000,  
        arrows: true      
    });

    $('.carousal-homepage').css('visibility', 'visible');
});