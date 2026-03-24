/**
 * RESPONSIVE HELPER - PHƯƠNG NAM RESTAURANT
 * Tối ưu trải nghiệm mobile
 * Updated: December 2025
 */

(function() {
    'use strict';
    
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    // Add device class to body
    document.addEventListener('DOMContentLoaded', function() {
        if (isMobile) {
            document.body.classList.add('is-mobile');
        }
        if (isIOS) {
            document.body.classList.add('is-ios');
        }
        if (isAndroid) {
            document.body.classList.add('is-android');
        }
        
        // Initialize all mobile optimizations
        initMobileOptimizations();
        initTouchFeedback();
        initSmoothScroll();
        initViewportHeight();
        initImageLazyLoad();
        initBackToTop();
    });
    
    /**
     * Mobile Optimizations
     */
    function initMobileOptimizations() {
        // Prevent zoom on input focus (iOS)
        if (isIOS) {
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (!input.style.fontSize || parseInt(input.style.fontSize) < 16) {
                    input.style.fontSize = '16px';
                }
            });
        }
        
        // Optimize images for mobile
        if (window.innerWidth < 768) {
            optimizeImagesForMobile();
        }
        
        // Add touch-friendly spacing
        addTouchFriendlySpacing();
    }
    
    /**
     * Touch Feedback
     */
    function initTouchFeedback() {
        // Add active state to clickable elements
        const clickables = document.querySelectorAll('button, a, .clickable, .card-hover');
        
        clickables.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.opacity = '0.7';
            }, { passive: true });
            
            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.opacity = '';
                }, 150);
            }, { passive: true });
            
            element.addEventListener('touchcancel', function() {
                this.style.opacity = '';
            }, { passive: true });
        });
    }
    
    /**
     * Smooth Scroll
     */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#' || href === '#!') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
    
    /**
     * Fix viewport height on mobile (especially iOS)
     */
    function initViewportHeight() {
        function setVH() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', setVH);
    }
    
    /**
     * Lazy Load Images
     */
    function initImageLazyLoad() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    /**
     * Back to Top Button
     */
    function initBackToTop() {
        let backToTopBtn = document.getElementById('back-to-top');
        
        // Create button if doesn't exist
        if (!backToTopBtn && window.innerWidth < 1024) {
            backToTopBtn = document.createElement('button');
            backToTopBtn.id = 'back-to-top';
            backToTopBtn.className = 'fixed bottom-20 right-4 bg-orange-600 text-white w-12 h-12 rounded-full shadow-lg hover:bg-orange-700 transition-all opacity-0 pointer-events-none z-40 flex items-center justify-center';
            backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            backToTopBtn.setAttribute('aria-label', 'Về đầu trang');
            document.body.appendChild(backToTopBtn);
        }
        
        if (backToTopBtn) {
            // Show/hide on scroll
            let scrollTimeout;
            window.addEventListener('scroll', function() {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    if (window.pageYOffset > 300) {
                        backToTopBtn.style.opacity = '1';
                        backToTopBtn.style.pointerEvents = 'auto';
                    } else {
                        backToTopBtn.style.opacity = '0';
                        backToTopBtn.style.pointerEvents = 'none';
                    }
                }, 100);
            }, { passive: true });
            
            // Scroll to top on click
            backToTopBtn.addEventListener('click', function() {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }
    
    /**
     * Optimize Images for Mobile
     */
    function optimizeImagesForMobile() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Add loading="lazy" if not present
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            // Add decoding="async" for better performance
            if (!img.hasAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }
        });
    }
    
    /**
     * Add Touch-Friendly Spacing
     */
    function addTouchFriendlySpacing() {
        // Ensure minimum touch target size (44x44px)
        const touchTargets = document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]');
        touchTargets.forEach(target => {
            const rect = target.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                target.style.minWidth = '44px';
                target.style.minHeight = '44px';
                target.style.display = 'inline-flex';
                target.style.alignItems = 'center';
                target.style.justifyContent = 'center';
            }
        });
    }
    
    /**
     * Handle Orientation Change
     */
    window.addEventListener('orientationchange', function() {
        // Reload certain elements on orientation change
        setTimeout(() => {
            // Recalculate heights
            initViewportHeight();
            
            // Trigger resize event
            window.dispatchEvent(new Event('resize'));
        }, 100);
    });
    
    /**
     * Prevent Pull-to-Refresh on iOS (optional)
     */
    if (isIOS) {
        let lastTouchY = 0;
        let preventPullToRefresh = false;
        
        document.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            lastTouchY = e.touches[0].clientY;
            preventPullToRefresh = window.pageYOffset === 0;
        }, { passive: false });
        
        document.addEventListener('touchmove', function(e) {
            const touchY = e.touches[0].clientY;
            const touchYDelta = touchY - lastTouchY;
            lastTouchY = touchY;
            
            if (preventPullToRefresh && touchYDelta > 0) {
                e.preventDefault();
                return;
            }
        }, { passive: false });
    }
    
    /**
     * Debounce Function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Throttle Function
     */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Check if element is in viewport
     */
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    /**
     * Animate elements on scroll (mobile-friendly)
     */
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        
        if (animatedElements.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        animatedElements.forEach(el => observer.observe(el));
    }
    
    // Initialize scroll animations
    if (window.innerWidth < 1024) {
        initScrollAnimations();
    }
    
    /**
     * Handle Network Status
     */
    window.addEventListener('online', function() {
        console.log('✅ Đã kết nối internet');
        // Show notification if needed
    });
    
    window.addEventListener('offline', function() {
        console.log('❌ Mất kết nối internet');
        // Show offline notification
        if (typeof showNotification === 'function') {
            showNotification('Bạn đang offline. Một số tính năng có thể không hoạt động.', 'warning');
        }
    });
    
    /**
     * Performance Monitoring
     */
    if (window.performance && window.performance.timing) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log(`📊 Page load time: ${pageLoadTime}ms`);
                
                // Log slow page loads
                if (pageLoadTime > 3000) {
                    console.warn('⚠️ Slow page load detected');
                }
            }, 0);
        });
    }
    
    /**
     * Export utilities
     */
    window.ResponsiveHelper = {
        isMobile,
        isIOS,
        isAndroid,
        debounce,
        throttle,
        isInViewport
    };
    
    console.log('📱 Responsive Helper initialized');
    
})();
