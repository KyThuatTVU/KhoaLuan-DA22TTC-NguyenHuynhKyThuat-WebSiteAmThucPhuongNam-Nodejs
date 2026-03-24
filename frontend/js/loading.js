/**
 * Loading Utilities for Phương Nam Restaurant
 * Provides various loading states and animations
 */

const LoadingManager = {
    // Page loading overlay element
    pageOverlay: null,
    toastElement: null,
    
    /**
     * Initialize loading manager
     */
    init() {
        this.createPageOverlay();
        this.createToastElement();
        console.log('✅ LoadingManager initialized');
    },
    
    /**
     * Create page loading overlay
     */
    createPageOverlay() {
        if (document.getElementById('page-loading-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'page-loading-overlay';
        overlay.className = 'page-loading-overlay hidden';
        overlay.innerHTML = `
            <div class="loading-logo-spinner">
                <img src="images/Green Simple Clean Vegan Food Logo.png" alt="Loading" onerror="this.style.display='none'">
            </div>
            <p class="loading-text loading-text-animated">Đang tải</p>
        `;
        document.body.appendChild(overlay);
        this.pageOverlay = overlay;
    },
    
    /**
     * Create toast loading element
     */
    createToastElement() {
        if (document.getElementById('toast-loading')) return;
        
        const toast = document.createElement('div');
        toast.id = 'toast-loading';
        toast.className = 'toast-loading hidden';
        toast.innerHTML = `
            <span class="spinner-inline spinner-sm" style="border-top-color: white;"></span>
            <span class="toast-text">Đang xử lý...</span>
        `;
        document.body.appendChild(toast);
        this.toastElement = toast;
    },
    
    /**
     * Show page loading overlay
     * @param {string} message - Optional loading message
     */
    showPageLoading(message = 'Đang tải') {
        if (!this.pageOverlay) this.createPageOverlay();
        
        const textEl = this.pageOverlay.querySelector('.loading-text');
        if (textEl) textEl.textContent = message;
        
        this.pageOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Hide page loading overlay
     */
    hidePageLoading() {
        if (this.pageOverlay) {
            this.pageOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Show toast loading at bottom
     * @param {string} message - Loading message
     */
    showToast(message = 'Đang xử lý...') {
        if (!this.toastElement) this.createToastElement();
        
        const textEl = this.toastElement.querySelector('.toast-text');
        if (textEl) textEl.textContent = message;
        
        this.toastElement.classList.remove('hidden');
    },
    
    /**
     * Hide toast loading
     */
    hideToast() {
        if (this.toastElement) {
            this.toastElement.classList.add('hidden');
        }
    },
    
    /**
     * Set button to loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} isLoading - Loading state
     * @param {string} originalText - Original button text (optional)
     */
    setButtonLoading(button, isLoading, originalText = null) {
        if (!button) return;
        
        if (isLoading) {
            // Store original content
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }
            
            button.disabled = true;
            button.classList.add('btn-loading');
            button.innerHTML = `
                <span class="spinner-inline spinner-sm"></span>
                <span>${originalText || 'Đang xử lý...'}</span>
            `;
        } else {
            button.disabled = false;
            button.classList.remove('btn-loading');
            
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
                delete button.dataset.originalHtml;
            }
        }
    },
    
    /**
     * Show section loading
     * @param {string|HTMLElement} container - Container selector or element
     * @param {string} message - Loading message
     */
    showSectionLoading(container, message = 'Đang tải dữ liệu...') {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;
        
        el.innerHTML = `
            <div class="section-loading">
                <div class="loading-spinner-main"></div>
                <p class="loading-text">${message}</p>
            </div>
        `;
    },
    
    /**
     * Show skeleton loading for cards
     * @param {string|HTMLElement} container - Container selector or element
     * @param {number} count - Number of skeleton cards
     * @param {string} type - Type of skeleton ('card', 'list', 'table')
     */
    showSkeletonLoading(container, count = 4, type = 'card') {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;
        
        let skeletonHtml = '';
        
        switch (type) {
            case 'card':
                skeletonHtml = Array(count).fill(0).map(() => `
                    <div class="skeleton-card">
                        <div class="skeleton skeleton-image mb-4"></div>
                        <div class="skeleton skeleton-text w-3/4 mb-2"></div>
                        <div class="skeleton skeleton-text-sm w-1/2 mb-3"></div>
                        <div class="flex justify-between items-center">
                            <div class="skeleton skeleton-text w-1/3"></div>
                            <div class="skeleton w-10 h-10 rounded-full"></div>
                        </div>
                    </div>
                `).join('');
                break;
                
            case 'list':
                skeletonHtml = Array(count).fill(0).map(() => `
                    <div class="skeleton-card flex items-center gap-4 mb-4">
                        <div class="skeleton skeleton-avatar"></div>
                        <div class="flex-1">
                            <div class="skeleton skeleton-text w-3/4 mb-2"></div>
                            <div class="skeleton skeleton-text-sm w-1/2"></div>
                        </div>
                    </div>
                `).join('');
                break;
                
            case 'table':
                skeletonHtml = `
                    <div class="skeleton-card">
                        ${Array(count).fill(0).map(() => `
                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <div class="skeleton skeleton-text flex-1"></div>
                                <div class="skeleton skeleton-text flex-1"></div>
                                <div class="skeleton skeleton-text flex-1"></div>
                                <div class="skeleton skeleton-text w-20"></div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;
                
            default:
                skeletonHtml = `
                    <div class="section-loading">
                        <div class="loading-spinner-main"></div>
                    </div>
                `;
        }
        
        el.innerHTML = skeletonHtml;
    },
    
    /**
     * Add loading overlay to a card/element
     * @param {string|HTMLElement} element - Element selector or element
     */
    addCardLoading(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) {
            el.classList.add('card-loading');
        }
    },
    
    /**
     * Remove loading overlay from a card/element
     * @param {string|HTMLElement} element - Element selector or element
     */
    removeCardLoading(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) {
            el.classList.remove('card-loading');
        }
    },
    
    /**
     * Show inline spinner
     * @returns {string} HTML string for inline spinner
     */
    getInlineSpinner(size = 'md') {
        const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
        return `<span class="spinner-inline ${sizeClass}"></span>`;
    },
    
    /**
     * Show bounce loading dots
     * @returns {string} HTML string for bounce loading
     */
    getBounceLoading() {
        return `
            <div class="bounce-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    },
    
    /**
     * Show progress bar loading
     * @param {string|HTMLElement} container - Container selector or element
     */
    showProgressLoading(container) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;
        
        el.innerHTML = `
            <div class="progress-loading">
                <div class="progress-loading-bar"></div>
            </div>
        `;
    },
    
    /**
     * Wrap async function with loading state
     * @param {Function} asyncFn - Async function to wrap
     * @param {Object} options - Options for loading display
     */
    async withLoading(asyncFn, options = {}) {
        const {
            type = 'toast', // 'page', 'toast', 'button', 'section'
            message = 'Đang xử lý...',
            button = null,
            container = null
        } = options;
        
        try {
            // Show loading
            switch (type) {
                case 'page':
                    this.showPageLoading(message);
                    break;
                case 'toast':
                    this.showToast(message);
                    break;
                case 'button':
                    if (button) this.setButtonLoading(button, true, message);
                    break;
                case 'section':
                    if (container) this.showSectionLoading(container, message);
                    break;
            }
            
            // Execute async function
            const result = await asyncFn();
            
            return result;
        } finally {
            // Hide loading
            switch (type) {
                case 'page':
                    this.hidePageLoading();
                    break;
                case 'toast':
                    this.hideToast();
                    break;
                case 'button':
                    if (button) this.setButtonLoading(button, false);
                    break;
                // Section loading is typically replaced by content
            }
        }
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LoadingManager.init());
} else {
    LoadingManager.init();
}

// Export for global use
window.LoadingManager = LoadingManager;

// Shorthand functions for convenience
window.showPageLoading = (msg) => LoadingManager.showPageLoading(msg);
window.hidePageLoading = () => LoadingManager.hidePageLoading();
window.showToastLoading = (msg) => LoadingManager.showToast(msg);
window.hideToastLoading = () => LoadingManager.hideToast();
window.setButtonLoading = (btn, loading, text) => LoadingManager.setButtonLoading(btn, loading, text);
