/**
 * Admin Mobile Navigation Handler
 * Handles sidebar toggle for mobile devices
 * Updated: December 2025
 */

// Toggle sidebar function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
    
    if (overlay) {
        overlay.classList.toggle('active');
    }
    
    // Prevent body scroll when sidebar is open
    document.body.style.overflow = sidebar && sidebar.classList.contains('open') ? 'hidden' : '';
}

// Close sidebar function
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
}

// Initialize mobile navigation
document.addEventListener('DOMContentLoaded', function() {
    // Create overlay if it doesn't exist
    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        
        const mainContent = document.querySelector('.flex-1.flex.flex-col');
        if (mainContent) {
            mainContent.insertBefore(overlay, mainContent.firstChild);
        }
    }
    
    // Close sidebar on window resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024) {
            closeSidebar();
        }
    });
    
    // Close sidebar when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        }
    });
    
    // Handle swipe to close sidebar on mobile
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const sidebar = document.getElementById('sidebar');
        const swipeThreshold = 80;
        const verticalThreshold = 100;
        
        // Calculate swipe distance
        const horizontalSwipe = touchEndX - touchStartX;
        const verticalSwipe = Math.abs(touchEndY - touchStartY);
        
        // Only handle horizontal swipes (not vertical scrolling)
        if (verticalSwipe > verticalThreshold) return;
        
        // Swipe left to close sidebar
        if (sidebar && sidebar.classList.contains('open')) {
            if (horizontalSwipe < -swipeThreshold) {
                closeSidebar();
            }
        }
        
        // Swipe right to open sidebar (from left edge only)
        if (sidebar && !sidebar.classList.contains('open')) {
            if (horizontalSwipe > swipeThreshold && touchStartX < 30) {
                toggleSidebar();
            }
        }
    }
    
    // Close sidebar when clicking on a link (mobile)
    const sidebarLinks = document.querySelectorAll('#sidebar a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 1024) {
                // Small delay to allow navigation
                setTimeout(closeSidebar, 100);
            }
        });
    });
    
    console.log('📱 Admin mobile navigation initialized');
});

// Make functions available globally
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
