// GSAP Animations for Auth Pages (Login/Register)

document.addEventListener('DOMContentLoaded', function() {
    // Check if GSAP is loaded
    if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded');
        return;
    }

    // Animate logo
    gsap.from('.text-center.mb-8', {
        duration: 0.8,
        y: -50,
        opacity: 0,
        ease: 'power3.out'
    });

    // Animate card
    gsap.from('.bg-white.rounded-2xl', {
        duration: 1,
        y: 50,
        opacity: 0,
        ease: 'power3.out',
        delay: 0.2
    });

    // Animate form inputs
    const formInputs = document.querySelectorAll('input, select, button[type="submit"]');
    gsap.from(formInputs, {
        duration: 0.6,
        x: -20,
        opacity: 0,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.5
    });

    // Animate avatar preview (if exists)
    const avatarPreview = document.getElementById('avatar-preview');
    if (avatarPreview) {
        gsap.from(avatarPreview, {
            duration: 0.8,
            scale: 0,
            opacity: 0,
            ease: 'back.out(1.7)',
            delay: 0.7
        });
    }

    // Add hover animation to submit button
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.addEventListener('mouseenter', function() {
            gsap.to(this, {
                duration: 0.3,
                scale: 1.05,
                ease: 'power2.out'
            });
        });

        submitBtn.addEventListener('mouseleave', function() {
            gsap.to(this, {
                duration: 0.3,
                scale: 1,
                ease: 'power2.out'
            });
        });
    }

    // Animate back link
    gsap.from('.text-center.mt-6', {
        duration: 0.6,
        y: 20,
        opacity: 0,
        ease: 'power2.out',
        delay: 1
    });
});
