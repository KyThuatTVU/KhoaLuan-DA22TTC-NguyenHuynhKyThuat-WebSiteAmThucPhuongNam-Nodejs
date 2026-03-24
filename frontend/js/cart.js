// API Configuration
if (typeof window.API_URL === 'undefined') {
    window.API_URL = 'http://localhost:3000/api';
}

// Giới hạn số lượng tối đa mỗi món
const MAX_QUANTITY_PER_ITEM = 10;
// Giới hạn tổng số món để gợi ý đặt bàn
const MAX_ITEMS_BEFORE_RESERVATION_SUGGEST = 10;

// Cart management functions
class CartManager {
    constructor() {
        this.cart = {
            ma_gio_hang: null,
            items: [],
            tong_tien: 0,
            so_luong: 0
        };
        this.maxQuantityPerItem = MAX_QUANTITY_PER_ITEM;
        this.maxItemsBeforeReservation = MAX_ITEMS_BEFORE_RESERVATION_SUGGEST;
        this.hasShownReservationSuggestion = false; // Chỉ hiển thị 1 lần mỗi session
        this.init();
    }

    init() {
        // Load cart from server if authenticated, otherwise clear local cart
        this.loadCartFromStorage();
        // Update UI
        this.updateCartBadge();
    }

    // Get authentication token
    getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // API call wrapper with authentication
    async apiCall(endpoint, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Vui lòng đăng nhập để tiếp tục');
        }

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await fetch(`${window.API_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }

        return data;
    }

    // Load cart from server
    async loadCart() {
        console.log('🔄 loadCart called, authenticated:', this.isAuthenticated());

        try {
            if (!this.isAuthenticated()) {
                console.log('👤 Not authenticated, clearing cart');
                // Clear cart when not authenticated
                this.cart = { ma_gio_hang: null, items: [], tong_tien: 0, so_luong: 0 };
                this.clearCartFromStorage();
                this.updateCartBadge();
                return;
            }

            console.log('📡 Calling cart API...');
            const response = await this.apiCall('/cart');
            console.log('📡 Cart API response:', response);

            if (response.success) {
                this.cart = response.data;
                console.log('💾 Cart data from server:', this.cart);
                this.saveCartToStorage();
                this.updateCartBadge();
            } else {
                console.warn('⚠️ Cart API returned success=false');
            }
        } catch (error) {
            console.error('❌ Error loading cart:', error);
            // If API fails, try to load from localStorage as fallback
            this.loadCartFromStorage();
            this.showNotification('Không thể tải giỏ hàng từ server', 'error');
        }
    }

    // Add item to cart
    async addToCart(ma_mon, so_luong = 1) {
        try {
            if (!this.isAuthenticated()) {
                this.showNotification('Vui lòng đăng nhập để thêm vào giỏ hàng', 'warning');
                // Redirect to login page
                window.location.href = 'dang-nhap.html';
                return;
            }

            // Kiểm tra số lượng hiện tại trong giỏ
            const existingItem = this.cart.items.find(item => item.ma_mon === ma_mon);
            const currentQty = existingItem ? existingItem.so_luong : 0;
            
            if (currentQty + so_luong > this.maxQuantityPerItem) {
                this.showNotification(`Mỗi món chỉ được đặt tối đa ${this.maxQuantityPerItem} phần. Hiện tại bạn đã có ${currentQty} phần trong giỏ.`, 'warning');
                return;
            }

            // Show loading toast
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.showToast('Đang thêm vào giỏ hàng...');
            }

            const response = await this.apiCall('/cart/add', {
                method: 'POST',
                body: JSON.stringify({ ma_mon, so_luong })
            });

            // Hide loading toast
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }

            if (response.success) {
                this.showNotification('Đã thêm vào giỏ hàng!', 'success');
                // Reload cart to get updated data
                await this.loadCart();
                
                // Kiểm tra nếu tổng số món vượt quá giới hạn, gợi ý đặt bàn
                this.checkAndSuggestReservation();
            }
        } catch (error) {
            // Hide loading toast on error
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }
            console.error('Lỗi thêm vào giỏ hàng:', error);
            this.showNotification(error.message, 'error');
        }
    }

    // Kiểm tra và gợi ý đặt bàn nếu đặt quá nhiều món
    checkAndSuggestReservation() {
        // Chỉ hiển thị 1 lần mỗi session
        if (this.hasShownReservationSuggestion) return;
        
        // Tính tổng số lượng món (không phải số loại món)
        const totalQuantity = this.cart.so_luong || 0;
        
        if (totalQuantity > this.maxItemsBeforeReservation) {
            this.hasShownReservationSuggestion = true;
            this.showReservationSuggestionModal(totalQuantity);
        }
    }

    // Hiển thị modal gợi ý đặt bàn
    showReservationSuggestionModal(totalQuantity) {
        // Tạo modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'reservation-suggestion-modal';
        modalOverlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] animate-fadeIn';
        modalOverlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform animate-scaleIn">
                <!-- Header với icon -->
                <div class="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
                    <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-utensils text-white text-3xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white">Đặt nhiều món quá!</h3>
                </div>
                
                <!-- Body -->
                <div class="p-6">
                    <div class="text-center mb-6">
                        <p class="text-gray-600 mb-3">
                            Bạn đang đặt <span class="font-bold text-orange-600 text-lg">${totalQuantity} món</span> ăn.
                        </p>
                        <p class="text-gray-500 text-sm">
                            Với số lượng lớn như vậy, việc giao hàng có thể mất nhiều thời gian và món ăn có thể không còn nóng hổi.
                        </p>
                    </div>
                    
                    <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                        <div class="flex items-start space-x-3">
                            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-lightbulb text-orange-600"></i>
                            </div>
                            <div>
                                <p class="font-semibold text-orange-800 mb-1">Gợi ý cho bạn</p>
                                <p class="text-sm text-orange-700">
                                    Hãy <strong>đặt bàn</strong> tại nhà hàng để thưởng thức món ăn ngon nhất, phục vụ chu đáo và không gian thoải mái!
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Buttons -->
                    <div class="flex flex-col space-y-3">
                        <a href="dat-ban.html" 
                           class="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-xl font-semibold text-center hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2">
                            <i class="fas fa-calendar-check"></i>
                            <span>Đặt bàn ngay</span>
                        </a>
                        <button onclick="document.getElementById('reservation-suggestion-modal').remove()" 
                                class="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                            <i class="fas fa-shopping-cart"></i>
                            <span>Tiếp tục đặt giao hàng</span>
                        </button>
                    </div>
                </div>
                
                <!-- Footer note -->
                <div class="bg-gray-50 px-6 py-3 text-center">
                    <p class="text-xs text-gray-500">
                        <i class="fas fa-info-circle mr-1"></i>
                        Đặt bàn trước để được phục vụ tốt nhất!
                    </p>
                </div>
            </div>
        `;
        
        // Thêm CSS animation nếu chưa có
        if (!document.getElementById('reservation-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'reservation-modal-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
            `;
            document.head.appendChild(style);
        }
        
        // Thêm modal vào body
        document.body.appendChild(modalOverlay);
        
        // Đóng modal khi click bên ngoài
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }

    // Update cart item quantity
    async updateCartItem(ma_chi_tiet, so_luong) {
        try {
            // Kiểm tra giới hạn số lượng
            if (so_luong > this.maxQuantityPerItem) {
                this.showNotification(`Mỗi món chỉ được đặt tối đa ${this.maxQuantityPerItem} phần`, 'warning');
                return;
            }

            // Show loading toast
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.showToast('Đang cập nhật...');
            }

            const response = await this.apiCall('/cart/update', {
                method: 'PUT',
                body: JSON.stringify({ ma_chi_tiet, so_luong })
            });

            // Hide loading toast
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }

            if (response.success) {
                this.showNotification('Đã cập nhật giỏ hàng!', 'success');
                await this.loadCart();
            }
        } catch (error) {
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }
            console.error('Lỗi cập nhật giỏ hàng:', error);
            this.showNotification(error.message, 'error');
        }
    }

    // Remove item from cart
    async removeFromCart(ma_chi_tiet) {
        try {
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.showToast('Đang xóa...');
            }

            const response = await this.apiCall(`/cart/remove/${ma_chi_tiet}`, {
                method: 'DELETE'
            });

            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }

            if (response.success) {
                this.showNotification('Đã xóa khỏi giỏ hàng!', 'success');
                await this.loadCart();
            }
        } catch (error) {
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }
            console.error('Lỗi xóa khỏi giỏ hàng:', error);
            this.showNotification(error.message, 'error');
        }
    }

    // Clear entire cart
    async clearCart() {
        try {
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.showToast('Đang xóa giỏ hàng...');
            }

            const response = await this.apiCall('/cart/clear', {
                method: 'DELETE'
            });

            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }

            if (response.success) {
                this.showNotification('Đã xóa toàn bộ giỏ hàng!', 'success');
                await this.loadCart();
            }
        } catch (error) {
            if (typeof LoadingManager !== 'undefined') {
                LoadingManager.hideToast();
            }
            console.error('Lỗi xóa giỏ hàng:', error);
            this.showNotification(error.message, 'error');
        }
    }

    // Get cart data
    getCart() {
        return this.cart;
    }

    // Save cart to localStorage for persistence (only when authenticated)
    saveCartToStorage() {
        if (this.isAuthenticated()) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.ma_nguoi_dung;
            if (userId) {
                const cartKey = `cart_${userId}`;
                localStorage.setItem(cartKey, JSON.stringify(this.cart));
            }
        }
    }

    // Load cart from localStorage (only when authenticated)
    loadCartFromStorage() {
        if (this.isAuthenticated()) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.ma_nguoi_dung;
            if (userId) {
                const cartKey = `cart_${userId}`;
                const savedCart = localStorage.getItem(cartKey);
                if (savedCart) {
                    try {
                        this.cart = JSON.parse(savedCart);
                    } catch (error) {
                        console.error('Lỗi tải giỏ hàng từ localStorage:', error);
                        this.cart = { ma_gio_hang: null, items: [], tong_tien: 0, so_luong: 0 };
                    }
                }
            }
        } else {
            // Clear cart when not authenticated
            this.cart = { ma_gio_hang: null, items: [], tong_tien: 0, so_luong: 0 };
        }
    }

    // Clear cart from localStorage for current user
    clearCartFromStorage() {
        if (this.isAuthenticated()) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.ma_nguoi_dung;
            if (userId) {
                const cartKey = `cart_${userId}`;
                localStorage.removeItem(cartKey);
            }
        }
    }

    // Update cart badge in navbar
    updateCartBadge() {
        const cartBadge = document.getElementById('cart-badge');
        const cartBadgeMobile = document.getElementById('cart-badge-mobile');

        const count = this.cart.so_luong || 0;
        const displayStyle = count > 0 ? 'inline-block' : 'none';

        console.log('🔢 Updating cart badge with count:', count);

        if (cartBadge) {
            cartBadge.textContent = count;
            cartBadge.style.display = displayStyle;
            console.log('✅ Updated desktop cart badge');
        } else {
            console.log('⚠️ Desktop cart badge not found');
        }

        if (cartBadgeMobile) {
            cartBadgeMobile.textContent = count;
            cartBadgeMobile.style.display = displayStyle;
            console.log('✅ Updated mobile cart badge');
        } else {
            console.log('⚠️ Mobile cart badge not found');
        }
    }

    // Show notification (requires auth.js showNotification function)
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }

    // Handle user login - load their cart
    async handleUserLogin() {
        console.log('🔄 User logged in, loading cart from server');
        await this.loadCart();
    }

    // Handle user logout - clear cart
    handleUserLogout() {
        console.log('🔄 User logged out, clearing cart');
        this.cart = { ma_gio_hang: null, items: [], tong_tien: 0, so_luong: 0 };
        this.clearCartFromStorage();
        this.updateCartBadge();
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    // Render cart items in a container
    renderCartItems(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ Container not found:', containerId);
            return;
        }

        console.log('🎨 Rendering cart items in container:', containerId);
        console.log('📦 Cart data:', this.cart);

        if (this.cart.items.length === 0) {
            console.log('📭 Cart is empty, showing empty message');
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                        <div class="inline-block mb-4">
                            <i class="fas fa-shopping-cart text-6xl text-gray-300"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-600 mb-2">Giỏ hàng trống</h3>
                        <p class="text-gray-500 mb-6">Hãy thêm món ăn yêu thích vào giỏ hàng của bạn</p>
                        <a href="thuc-don.html" class="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                            <i class="fas fa-utensils mr-2"></i>
                            Khám phá thực đơn
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        console.log('🛍️ Rendering', this.cart.items.length, 'cart items');

        container.innerHTML = this.cart.items.map(item => {
            console.log('📋 Rendering item:', item);
            const itemTotal = item.so_luong * item.gia_tai_thoi_diem;
            return `
                <div class="bg-white border border-gray-100 rounded-xl p-4 mb-4 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4 flex-1">
                            <div class="relative flex-shrink-0">
                                <img src="${item.anh_mon ? 'http://localhost:3000' + (item.anh_mon.startsWith('/') ? item.anh_mon : '/images/' + item.anh_mon) : '/images/default-dish.jpg'}"
                                     alt="${item.ten_mon}"
                                     class="w-20 h-20 object-cover rounded-lg shadow-sm"
                                     onerror="this.src='/images/default-dish.jpg'">
                                <span class="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-sm">
                                    ${item.so_luong}
                                </span>
                            </div>
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-800 text-lg mb-1">${item.ten_mon}</h4>
                                <div class="flex items-center space-x-4 text-sm text-gray-600">
                                    <span class="flex items-center">
                                        <i class="fas fa-tag mr-1 text-orange-500"></i>
                                        ${this.formatCurrency(item.gia_tai_thoi_diem)} / ${item.don_vi_tinh}
                                    </span>
                                    <span class="text-gray-400">•</span>
                                    <span class="font-medium text-orange-600">
                                        ${this.formatCurrency(itemTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="flex items-center bg-gray-100 rounded-lg p-1">
                                <button onclick="cartManager.updateCartItem(${item.ma_chi_tiet}, ${item.so_luong - 1})"
                                        class="w-8 h-8 bg-white rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors ${item.so_luong <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                                        ${item.so_luong <= 1 ? 'disabled' : ''}>
                                    <i class="fas fa-minus text-sm text-gray-600"></i>
                                </button>
                                <span class="w-10 text-center font-semibold text-gray-800">${item.so_luong}</span>
                                <button onclick="cartManager.updateCartItem(${item.ma_chi_tiet}, ${item.so_luong + 1})"
                                        class="w-8 h-8 bg-white rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors ${item.so_luong >= this.maxQuantityPerItem ? 'opacity-50 cursor-not-allowed' : ''}"
                                        ${item.so_luong >= this.maxQuantityPerItem ? 'disabled' : ''}
                                        title="${item.so_luong >= this.maxQuantityPerItem ? 'Đã đạt giới hạn tối đa ' + this.maxQuantityPerItem + ' phần' : ''}">
                                    <i class="fas fa-plus text-sm text-gray-600"></i>
                                </button>
                            </div>
                            ${item.so_luong >= this.maxQuantityPerItem ? '<span class="text-xs text-orange-600 ml-1">Tối đa</span>' : ''}
                            <button onclick="cartManager.removeFromCart(${item.ma_chi_tiet})"
                                    class="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                                    title="Xóa khỏi giỏ hàng">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add total section with better styling
        container.innerHTML += `
            <div class="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100 rounded-xl p-6 mt-6">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-calculator text-orange-600 text-xl"></i>
                        <span class="text-lg font-semibold text-gray-800">Tổng cộng</span>
                        <span class="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                            ${this.cart.items.length} món
                        </span>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-orange-600">
                            ${this.formatCurrency(this.cart.tong_tien)}
                        </div>
                        <div class="text-sm text-gray-500">
                            ${this.cart.so_luong} sản phẩm
                        </div>
                    </div>
                </div>
            </div>
        `;

        console.log('✅ Cart items rendered successfully');
    }
}

// Global cart manager instance
const cartManager = new CartManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartManager;
}
