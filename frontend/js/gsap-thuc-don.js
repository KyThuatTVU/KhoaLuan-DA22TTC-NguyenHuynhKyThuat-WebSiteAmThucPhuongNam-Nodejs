// GSAP Animations for Menu Page
gsap.registerPlugin(ScrollTrigger);

// Animate menu cards on load
function animateMenuCards() {
    const cards = document.querySelectorAll('.dish-card');
    
    gsap.from(cards, {
        opacity: 0,
        y: 50,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        clearProps: 'all'
    });
}

// Animate on scroll
function setupScrollAnimations() {
    const cards = document.querySelectorAll('.dish-card');
    
    cards.forEach((card, index) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top bottom-=100',
                toggleActions: 'play none none reverse'
            },
            opacity: 0,
            y: 50,
            duration: 0.6,
            delay: index * 0.05,
            ease: 'power2.out'
        });
    });
}

// Hover effects
function setupHoverEffects() {
    const cards = document.querySelectorAll('.dish-card');
    
    cards.forEach(card => {
        const image = card.querySelector('.dish-image');
        const overlay = card.querySelector('.image-overlay');
        
        card.addEventListener('mouseenter', () => {
            gsap.to(image, {
                scale: 1.1,
                duration: 0.5,
                ease: 'power2.out'
            });
            
            gsap.to(overlay, {
                opacity: 1,
                duration: 0.3
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(image, {
                scale: 1,
                duration: 0.5,
                ease: 'power2.out'
            });
            
            gsap.to(overlay, {
                opacity: 0,
                duration: 0.3
            });
        });
    });
}

// Initialize animations when products are loaded
const originalRenderMenuProducts = window.renderMenuProducts;
if (originalRenderMenuProducts) {
    window.renderMenuProducts = function() {
        originalRenderMenuProducts.apply(this, arguments);
        
        // Wait for DOM to update
        setTimeout(() => {
            animateMenuCards();
            setupHoverEffects();
        }, 100);
    };
}

// Page load animation
document.addEventListener('DOMContentLoaded', () => {
    // Animate page header
    gsap.from('.bg-gradient-to-r', {
        opacity: 0,
        y: -50,
        duration: 0.8,
        ease: 'power2.out'
    });
    
    // Animate filter sidebar
    gsap.from('.lg\\:w-1\\/4', {
        opacity: 0,
        x: -50,
        duration: 0.8,
        delay: 0.2,
        ease: 'power2.out'
    });
    
    // Animate sort bar
    gsap.from('.bg-white.rounded-xl.p-4', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.3,
        ease: 'power2.out'
    });
});

// Smooth scroll to top when changing category
function smoothScrollToProducts() {
    const productsSection = document.getElementById('menu-products');
    if (productsSection) {
        gsap.to(window, {
            duration: 0.8,
            scrollTo: {
                y: productsSection,
                offsetY: 100
            },
            ease: 'power2.inOut'
        });
    }
}

// Export for use in menu.js
window.smoothScrollToProducts = smoothScrollToProducts;
window.animateMenuCards = animateMenuCards;
