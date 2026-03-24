// GSAP Animations for Product Detail Page
gsap.registerPlugin(ScrollTrigger);

// Animate product detail sections
function animateProductDetail() {
    // Check if elements exist before animating
    const breadcrumb = document.querySelector('.bg-white.shadow-sm');
    if (breadcrumb) {
        gsap.from(breadcrumb, {
            opacity: 0,
            y: -20,
            duration: 0.5,
            ease: 'power2.out'
        });
    }
    
    // Animate image gallery
    const imageContainer = document.querySelector('.main-image-container');
    if (imageContainer) {
        gsap.from(imageContainer, {
            opacity: 0,
            scale: 0.95,
            duration: 0.8,
            delay: 0.2,
            ease: 'power2.out'
        });
    }
    
    // Animate thumbnails (will be called after they're loaded)
    const thumbnails = document.querySelectorAll('#thumbnails > div');
    if (thumbnails.length > 0) {
        gsap.from(thumbnails, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.1,
            delay: 0.4,
            ease: 'power2.out'
        });
    }
    
    // Animate product info
    const productInfo = document.querySelector('.lg\\:grid-cols-2 > div:last-child');
    if (productInfo) {
        gsap.from(productInfo.children, {
            opacity: 0,
            x: 50,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.3,
            ease: 'power2.out'
        });
    }
}

// Call animation after product is loaded
window.animateProductDetail = animateProductDetail;

// Animate related products when they load
function animateRelatedProducts() {
    const relatedProducts = document.querySelectorAll('#related-products > a');
    if (relatedProducts.length > 0) {
        // Set initial state
        gsap.set(relatedProducts, { opacity: 1 });
        
        // Animate
        gsap.from(relatedProducts, {
            opacity: 0,
            y: 30,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
            clearProps: 'all' // Clear all GSAP properties after animation
        });
    }
}

// Export for use in product-detail.js
window.animateRelatedProducts = animateRelatedProducts;

// Observe related products container
document.addEventListener('DOMContentLoaded', () => {
    const relatedContainer = document.getElementById('related-products');
    if (relatedContainer) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    animateRelatedProducts();
                    observer.disconnect(); // Stop observing after first animation
                }
            });
        });
        
        observer.observe(relatedContainer, { childList: true });
    }
});

// Smooth scroll for related products
document.addEventListener('click', (e) => {
    if (e.target.closest('.related-card')) {
        gsap.to(window, {
            duration: 0.5,
            scrollTo: { y: 0 },
            ease: 'power2.inOut'
        });
    }
});

// Add to cart button animation
function animateAddToCart() {
    const button = document.querySelector('button[onclick="addToCart()"]');
    
    gsap.to(button, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
    });
    
    // Create floating icon
    const icon = document.createElement('i');
    icon.className = 'fas fa-shopping-cart';
    icon.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        font-size: 3rem;
        color: #ea580c;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(icon);
    
    gsap.to(icon, {
        y: -100,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        onComplete: () => icon.remove()
    });
}

// Override addToCart to include animation
const originalAddToCart = window.addToCart;
window.addToCart = function() {
    animateAddToCart();
    if (originalAddToCart) {
        originalAddToCart.apply(this, arguments);
    }
};
