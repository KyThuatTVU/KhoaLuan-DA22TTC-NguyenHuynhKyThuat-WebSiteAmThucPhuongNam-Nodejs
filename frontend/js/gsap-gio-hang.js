// GSAP Animations for Cart Page (gio-hang.html)
document.addEventListener('DOMContentLoaded', function() {
    // Register GSAP plugins if available
    if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    // Page load animation
    gsap.from('.container h1', {
        duration: 1,
        y: -50,
        opacity: 0,
        ease: 'power3.out'
    });

    gsap.from('.container p', {
        duration: 1,
        y: -30,
        opacity: 0,
        delay: 0.2,
        ease: 'power3.out'
    });

    // Cart items animation
    gsap.from('.bg-white.rounded-xl', {
        duration: 0.8,
        y: 30,
        opacity: 0,
        delay: 0.4,
        ease: 'power2.out'
    });

    // Stagger animation for cart items when they load
    const cartItemsObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const cartItems = document.querySelectorAll('#cart-items > div');
                if (cartItems.length > 0) {
                    gsap.from(cartItems, {
                        duration: 0.6,
                        x: -30,
                        opacity: 0,
                        stagger: 0.1,
                        ease: 'power2.out'
                    });
                }
            }
        });
    });

    const cartContainer = document.getElementById('cart-items');
    if (cartContainer) {
        cartItemsObserver.observe(cartContainer, { childList: true });
    }

    // Order summary animation
    gsap.from('.sticky', {
        duration: 0.8,
        x: 30,
        opacity: 0,
        delay: 0.6,
        ease: 'power2.out'
    });

    // Recommended products animation with scroll trigger
    if (typeof ScrollTrigger !== 'undefined') {
        gsap.from('.grid.grid-cols-1.md\\:grid-cols-4 > div', {
            duration: 0.8,
            y: 50,
            opacity: 0,
            stagger: 0.2,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '.grid.grid-cols-1.md\\:grid-cols-4',
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse'
            }
        });
    }

    // Button hover animations
    const buttons = document.querySelectorAll('button, a');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            gsap.to(this, {
                duration: 0.3,
                scale: 1.05,
                ease: 'power2.out'
            });
        });

        button.addEventListener('mouseleave', function() {
            gsap.to(this, {
                duration: 0.3,
                scale: 1,
                ease: 'power2.out'
            });
        });
    });

    // Quantity buttons animation
    const quantityButtons = document.querySelectorAll('#cart-items button');
    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            gsap.to(this, {
                duration: 0.1,
                scale: 0.95,
                yoyo: true,
                repeat: 1,
                ease: 'power2.inOut'
            });
        });
    });

    // Empty cart animation
    const emptyCart = document.getElementById('empty-cart');
    if (emptyCart && !emptyCart.classList.contains('hidden')) {
        gsap.from(emptyCart, {
            duration: 1,
            scale: 0.8,
            opacity: 0,
            delay: 0.5,
            ease: 'back.out(1.7)'
        });
    }

    // Trust badges animation
    gsap.from('.trust-badges .flex', {
        duration: 0.8,
        y: 20,
        opacity: 0,
        delay: 0.8,
        stagger: 0.1,
        ease: 'power2.out'
    });
});