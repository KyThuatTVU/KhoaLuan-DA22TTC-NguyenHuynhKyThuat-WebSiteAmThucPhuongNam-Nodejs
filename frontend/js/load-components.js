// Load Component Function
async function loadComponent(elementId, componentPath) {
    try {
        const element = document.getElementById(elementId);
        
        // Show loading placeholder if element exists
        if (element && typeof LoadingManager !== 'undefined') {
            element.innerHTML = `<div class="pulse-loading py-4 text-center text-gray-400"><i class="fas fa-spinner fa-spin"></i></div>`;
        }
        
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
    }
}

// Biến lưu trữ settings từ API
let siteSettings = null;

// Load settings từ API và cập nhật các phần tử trên trang
async function loadSiteSettings() {
    try {
        const response = await fetch('http://localhost:3000/api/settings');
        const result = await response.json();
        
        if (result.success && result.data) {
            siteSettings = result.data;
            console.log('⚙️ Site settings loaded:', siteSettings);
            
            // Cập nhật tất cả các phần tử có data-setting attribute
            updateSettingsElements();
        }
    } catch (error) {
        console.error('❌ Error loading site settings:', error);
    }
}

// Cập nhật các phần tử HTML dựa trên settings
function updateSettingsElements() {
    if (!siteSettings) return;
    
    console.log('🔄 Updating settings elements...');
    let updatedCount = 0;
    
    // Cập nhật các phần tử có data-setting attribute
    document.querySelectorAll('[data-setting]').forEach(element => {
        const settingKey = element.getAttribute('data-setting');
        const value = siteSettings[settingKey];
        
        if (value) {
            // Kiểm tra nếu có data-setting-href (cho link tel: hoặc mailto:)
            const hrefPrefix = element.getAttribute('data-setting-href');
            if (hrefPrefix && element.tagName === 'A') {
                element.href = hrefPrefix + value;
            }
            
            // Chỉ cập nhật text nếu element không có child elements quan trọng (như icon)
            const hasChildElements = element.querySelector('i, svg, img');
            if (!hasChildElements) {
                element.textContent = value;
            }
            
            updatedCount++;
        }
    });
    
    // Cập nhật href cho các link có data-setting-value (dùng cho link có icon bên trong)
    document.querySelectorAll('[data-setting-value]').forEach(element => {
        const settingKey = element.getAttribute('data-setting-value');
        const hrefPrefix = element.getAttribute('data-setting-href');
        const value = siteSettings[settingKey];
        
        if (value && hrefPrefix && element.tagName === 'A') {
            element.href = hrefPrefix + value;
            updatedCount++;
        }
    });
    
    // Cập nhật các link có data-setting-link attribute
    document.querySelectorAll('[data-setting-link]').forEach(element => {
        const settingKey = element.getAttribute('data-setting-link');
        const value = siteSettings[settingKey];
        
        if (value && element.tagName === 'A') {
            element.href = value;
            updatedCount++;
        }
    });
    
    console.log(`✅ Settings elements updated: ${updatedCount} elements`);
}

// Load all common components
async function loadAllComponents() {
    const promises = [];
    
    // Only load navbar if it doesn't already exist
    if (!document.getElementById('navbar')) {
        promises.push(loadComponent('navbar-container', 'components/navbar.html'));
    }
    
    promises.push(loadComponent('footer-container', 'components/footer.html'));
    promises.push(loadComponent('chatbot-container', 'components/chatbot.html'));
    
    // Load recommendation widget container
    let recommendationContainer = document.getElementById('recommendation-container');
    if (!recommendationContainer) {
        recommendationContainer = document.createElement('div');
        recommendationContainer.id = 'recommendation-container';
        // Insert before footer if exists
        const footerContainer = document.getElementById('footer-container');
        if (footerContainer) {
            footerContainer.parentNode.insertBefore(recommendationContainer, footerContainer);
        } else {
            document.body.appendChild(recommendationContainer);
        }
    }
    promises.push(loadComponent('recommendation-container', 'components/recommendation-widget.html'));
    
    // Load floating contact buttons (bao gồm cả nút scroll to top)
    let floatingContactContainer = document.getElementById('floating-contact-container');
    if (!floatingContactContainer) {
        floatingContactContainer = document.createElement('div');
        floatingContactContainer.id = 'floating-contact-container';
        document.body.appendChild(floatingContactContainer);
    }
    promises.push(loadComponent('floating-contact-container', 'components/floating-contact.html'));
    
    // Load page header if container exists
    if (document.getElementById('page-header-container')) {
        promises.push(loadComponent('page-header-container', 'components/page-header.html'));
    }
    
    await Promise.all(promises);
    
    // Initialize after components loaded
    initializeComponents();
    
    // Load và apply settings sau khi components đã load (với delay để đảm bảo DOM đã render)
    setTimeout(async () => {
        await loadSiteSettings();
        // Cập nhật lại settings sau khi tất cả components đã load hoàn toàn
        setTimeout(() => {
            updateSettingsElements();
        }, 200);
    }, 100);
}

// Initialize component functionality
function initializeComponents() {
    console.log('🔧 Initializing components...');
    
    // Update cart badge after a short delay to ensure navbar is loaded
    setTimeout(() => {
        updateCartBadge();
    }, 100);
    
    // Update user menu with login status
    updateUserMenu();
    
    // Initialize Chatbot
    initializeChatbot();
    
    // Initialize Notification Manager - wait longer to ensure navbar is fully loaded
    setTimeout(() => {
        if (typeof NotificationManager !== 'undefined') {
            console.log('🔔 Initializing Notification Manager...');
            NotificationManager.init();
        } else {
            console.warn('⚠️ NotificationManager not found');
        }
    }, 500);
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }
    
    // Set active nav link - call immediately and after delay
    setActiveNavLink();
    
    // Also set active link after a longer delay to ensure everything is loaded
    setTimeout(() => {
        console.log('🔄 Re-checking active nav link...');
        setActiveNavLink();
    }, 500);
    
    // Refresh cart when page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && typeof cartManager !== 'undefined') {
            console.log('🔄 Page became visible, refreshing cart');
            cartManager.loadCart().then(() => {
                setTimeout(() => {
                    updateCartBadge();
                }, 200);
            }).catch((error) => {
                console.error('❌ Error refreshing cart:', error);
            });
        }
    });
}

// Update cart badge count
function updateCartBadge() {
    // Use cartManager if available, otherwise fallback to old method
    if (typeof cartManager !== 'undefined' && cartManager.updateCartBadge) {
        cartManager.updateCartBadge();
    } else {
        // Fallback for old cart system
        const cartData = JSON.parse(localStorage.getItem('cart')) || [];
        let totalItems = 0;
        
        // Handle both old array format and new object format
        if (Array.isArray(cartData)) {
            // Old format: array of items with quantity property
            totalItems = cartData.reduce((sum, item) => sum + (item.quantity || 0), 0);
        } else if (cartData && typeof cartData === 'object' && cartData.so_luong !== undefined) {
            // New format: object with so_luong property
            totalItems = cartData.so_luong || 0;
        }
        
        const badges = document.querySelectorAll('.cart-badge');
        badges.forEach(badge => {
            badge.textContent = totalItems;
            if (totalItems > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }
}

// Hàm xử lý avatar URL - đảm bảo nhất quán giữa Google và local
function getAvatarUrl(avatarPath) {
    if (!avatarPath || (typeof avatarPath === 'string' && avatarPath.trim() === '')) {
        return null;
    }
    
    let url = avatarPath.trim();
    
    // Nếu là URL Google, giữ nguyên (đã được xử lý từ backend)
    if (url.includes('googleusercontent.com')) {
        // Chỉ sửa nếu URL bị lỗi (có chứa 'onerror' hoặc các ký tự lạ)
        if (url.includes('onerror') || url.includes('undefined')) {
            // Loại bỏ phần lỗi và thêm lại size
            url = url.replace(/=s\d+(-c)?(onerror|undefined)?.*$/gi, '');
            url = `${url}=s200-c`;
        }
        console.log('🖼️ Google Avatar URL:', url);
        return url;
    }
    
    // Nếu là URL đầy đủ khác (http/https), giữ nguyên
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // Nếu là đường dẫn local, thêm base URL
    if (url.startsWith('/')) {
        return `http://localhost:3000${url}`;
    }
    
    return `http://localhost:3000/${url}`;
}

// Update user menu based on login status - lấy data từ API
async function updateUserMenu() {
    const userMenuContainer = document.getElementById('user-menu-container');
    const mobileUserMenu = document.getElementById('mobile-user-menu');
    
    if (!userMenuContainer) {
        console.warn('user-menu-container not found');
        return;
    }

    const token = localStorage.getItem('token');
    
    console.log('🔄 Updating user menu...', { hasToken: !!token });

    if (!token) {
        console.log('👤 No token, showing guest menu');
        renderGuestMenu(userMenuContainer, mobileUserMenu);
        return;
    }

    try {
        // Lấy thông tin user từ API (database) thay vì localStorage
        const response = await fetch('http://localhost:3000/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!result.success || !result.data) {
            console.log('❌ Token invalid or user not found');
            // Token không hợp lệ, xóa và hiển thị guest menu
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            renderGuestMenu(userMenuContainer, mobileUserMenu);
            return;
        }

        const user = result.data;
        console.log('👤 User data from API:', { 
            name: user.ten_nguoi_dung, 
            avatar: user.anh_dai_dien
        });

        // Cập nhật localStorage với data mới từ DB
        const localUser = localStorage.getItem('user');
        if (localUser) {
            const parsedUser = JSON.parse(localUser);
            parsedUser.ten_nguoi_dung = user.ten_nguoi_dung;
            parsedUser.anh_dai_dien = user.anh_dai_dien;
            parsedUser.email = user.email;
            localStorage.setItem('user', JSON.stringify(parsedUser));
        }
        
        // Xử lý avatar URL - sử dụng hàm helper
        const avatarUrl = getAvatarUrl(user.anh_dai_dien);
        if (avatarUrl) {
            console.log('🖼️ Avatar URL from DB:', avatarUrl);
        } else {
            console.log('⚠️ No avatar found for user');
        }
        
        // Lấy tên hiển thị - đảm bảo luôn có giá trị
        const displayName = user.ten_nguoi_dung || user.email || 'Người dùng';

        // Render user menu
        renderLoggedInMenu(userMenuContainer, mobileUserMenu, user, avatarUrl, displayName);
        console.log('✅ User menu updated for:', displayName);

    } catch (error) {
        console.error('❌ Error fetching user data:', error);
        // Fallback: sử dụng localStorage nếu API lỗi
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                const avatarUrl = getAvatarUrl(user.anh_dai_dien);
                const displayName = user.ten_nguoi_dung || user.email || 'Người dùng';
                renderLoggedInMenu(userMenuContainer, mobileUserMenu, user, avatarUrl, displayName);
                console.log('✅ User menu updated from localStorage (fallback)');
            } catch (e) {
                renderGuestMenu(userMenuContainer, mobileUserMenu);
            }
        } else {
            renderGuestMenu(userMenuContainer, mobileUserMenu);
        }
    }
}

// Render menu cho user đã đăng nhập - đồng nhất style cho cả Google và user thường
function renderLoggedInMenu(userMenuContainer, mobileUserMenu, user, avatarUrl, displayName) {
    // Desktop User Menu - xóa toàn bộ nội dung cũ và thay thế
    // Avatar size: w-9 h-9 (36px) - đồng nhất cho tất cả các trang
    userMenuContainer.innerHTML = `
        <div class="relative group" style="z-index: 9999;">
            <button class="flex items-center space-x-2 text-gray-700 hover:text-orange-600 transition">
                <div class="w-9 h-9 rounded-full overflow-hidden border-2 border-orange-200 bg-orange-100 flex items-center justify-center flex-shrink-0">
                    ${avatarUrl 
                        ? `<img src="${avatarUrl}" alt="${displayName}" class="w-full h-full object-cover" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <i class="fas fa-user text-orange-600 text-sm" style="display:none;"></i>`
                        : `<i class="fas fa-user text-orange-600 text-sm"></i>`
                    }
                </div>
                <span class="hidden lg:inline font-medium text-sm max-w-[150px] truncate">${displayName}</span>
                <i class="fas fa-chevron-down text-xs hidden lg:inline ml-1"></i>
            </button>
            <div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100" style="z-index: 9999;">
                <div class="px-4 py-3 border-b border-gray-100">
                    <p class="text-sm font-medium text-gray-800 truncate">${displayName}</p>
                    <p class="text-xs text-gray-500 truncate">${user.email || ''}</p>
                </div>
                <a href="tai-khoan.html" class="block px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                    <i class="fas fa-user-circle mr-2"></i> Tài khoản của tôi
                </a>
                <a href="dat-ban.html" class="block px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                    <i class="fas fa-calendar-check mr-2"></i> Đặt bàn
                </a>
                <button onclick="handleLogout()" class="w-full text-left block px-4 py-3 text-red-600 hover:bg-red-50 border-t border-gray-100">
                    <i class="fas fa-sign-out-alt mr-2"></i> Đăng xuất
                </button>
            </div>
        </div>
    `;

    // Mobile User Menu - thêm avatar và đồng nhất style
    if (mobileUserMenu) {
        mobileUserMenu.innerHTML = `
            <div class="flex items-center px-4 py-3 bg-orange-50 border-b border-orange-100">
                <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-300 bg-orange-100 flex items-center justify-center flex-shrink-0">
                    ${avatarUrl 
                        ? `<img src="${avatarUrl}" alt="${displayName}" class="w-full h-full object-cover" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <i class="fas fa-user text-orange-600" style="display:none;"></i>`
                        : `<i class="fas fa-user text-orange-600"></i>`
                    }
                </div>
                <div class="ml-3 overflow-hidden">
                    <p class="text-sm font-medium text-gray-800 truncate">${displayName}</p>
                    <p class="text-xs text-gray-500 truncate">${user.email || ''}</p>
                </div>
            </div>
            <a href="tai-khoan.html" class="block py-3 px-4 text-gray-800 hover:text-orange-600 hover:bg-orange-50 transition font-medium">
                <i class="fas fa-user-circle mr-2"></i> Tài khoản của tôi
            </a>
            <a href="dat-ban.html" class="block py-3 px-4 text-gray-800 hover:text-orange-600 hover:bg-orange-50 transition font-medium">
                <i class="fas fa-calendar-check mr-2"></i> Đặt bàn
            </a>
            <button onclick="handleLogout()" class="w-full text-left py-3 px-4 text-red-600 hover:bg-red-50 font-medium border-t border-gray-200">
                <i class="fas fa-sign-out-alt mr-2"></i> Đăng xuất
            </button>
        `;
    }
}

// Render menu for guests (not logged in)
function renderGuestMenu(userMenuContainer, mobileUserMenu) {
    if (userMenuContainer) {
        userMenuContainer.innerHTML = `
            <div class="relative group">
                <button class="text-gray-700 hover:text-orange-600 transition">
                    <i class="fas fa-user text-xl"></i>
                </button>
                <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 border border-gray-100">
                    <a href="dang-nhap.html" class="block px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                        <i class="fas fa-sign-in-alt mr-2"></i> Đăng nhập
                    </a>
                    <a href="dang-ky.html" class="block px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                        <i class="fas fa-user-plus mr-2"></i> Đăng ký
                    </a>
                </div>
            </div>
        `;
    }

    if (mobileUserMenu) {
        mobileUserMenu.innerHTML = `
            <a href="dang-nhap.html" class="block py-3 px-4 text-gray-800 hover:text-orange-600 hover:bg-orange-50 transition font-medium">
                <i class="fas fa-sign-in-alt mr-2"></i> Đăng nhập
            </a>
            <a href="dang-ky.html" class="block py-3 px-4 text-gray-800 hover:text-orange-600 hover:bg-orange-50 transition font-medium">
                <i class="fas fa-user-plus mr-2"></i> Đăng ký
            </a>
        `;
    }
}

// Handle logout (global function)
window.handleLogout = function() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

// Set active navigation link based on current page
function setActiveNavLink() {
    // Wait a bit for navbar to be fully loaded
    setTimeout(() => {
        // Get current page filename
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const pageName = currentPage.replace('.html', '');
        
        console.log('📍 Current page:', pageName);
        console.log('📍 Full path:', window.location.pathname);
        
        // Set active state for desktop nav links
        const navLinks = document.querySelectorAll('.nav-link');
        console.log('🔍 Found nav links:', navLinks.length);
        
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            console.log('🔗 Checking link:', linkPage, 'vs', pageName);
            
            // Remove active class first
            link.classList.remove('active');
            
            // Add active class if matches
            if (linkPage === pageName || (pageName === '' && linkPage === 'index')) {
                link.classList.add('active');
                console.log('✅ Active link set:', linkPage);
            }
        });
        
        // Set active state for mobile nav links
        const mobileNavLinks = document.querySelectorAll('.nav-link-mobile');
        console.log('🔍 Found mobile nav links:', mobileNavLinks.length);
        
        mobileNavLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            
            // Remove active class first
            link.classList.remove('active');
            
            // Add active class if matches
            if (linkPage === pageName || (pageName === '' && linkPage === 'index')) {
                link.classList.add('active');
                console.log('✅ Active mobile link set:', linkPage);
            }
        });
    }, 200); // Wait 200ms for navbar to load
}

// Load components when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllComponents);
} else {
    loadAllComponents();
}

// Initialize cart after components are loaded (only if cart.js is already loaded)
function initializeCart() {
    // Skip cart initialization on pages that don't need it
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pagesWithoutCart = ['dat-hang-thanh-cong.html', 'dang-nhap.html', 'dang-ky.html', 'quen-mat-khau.html', 'dat-lai-mat-khau.html', 'xac-thuc-email.html'];
    
    if (pagesWithoutCart.includes(currentPage)) {
        console.log('ℹ️ Skipping cart initialization on', currentPage);
        // Still update badge with fallback
        updateCartBadge();
        return;
    }
    
    // Wait for cartManager to be available
    const checkCartManager = setInterval(() => {
        if (typeof cartManager !== 'undefined') {
            clearInterval(checkCartManager);
            console.log('✅ Initializing cart manager');
            
            // Load cart and update badge when done
            cartManager.loadCart().then(() => {
                // Update cart badge after cart is loaded
                setTimeout(() => {
                    updateCartBadge();
                }, 200);
            }).catch((error) => {
                console.error('❌ Error loading cart:', error);
                // Still update badge even if cart loading fails
                setTimeout(() => {
                    updateCartBadge();
                }, 200);
            });
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        if (typeof cartManager === 'undefined') {
            clearInterval(checkCartManager);
            console.warn('⚠️ CartManager not found after 5 seconds - check if cart.js is loaded');
            // Still update badge with fallback
            updateCartBadge();
        }
    }, 5000);
}

// Call initialize cart
initializeCart();

// Biến đánh dấu đã hiển thị lời chào chưa
let chatbotGreeted = false;
let currentChatSessionId = null;
let chatHistoryList = [];

// Lấy hoặc tạo session ID cho chat
function getChatbotSessionId() {
    if (!currentChatSessionId) {
        currentChatSessionId = sessionStorage.getItem('chatbot_session_id');
        if (!currentChatSessionId) {
            currentChatSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('chatbot_session_id', currentChatSessionId);
        }
    }
    return currentChatSessionId;
}

// Hiển thị lời chào khi mở chatbot
function showChatbotGreeting() {
    if (chatbotGreeted) return;
    chatbotGreeted = true;
    
    const messages = document.getElementById('chatbotMessages');
    if (!messages) return;
    
    // Lấy thông tin user từ localStorage
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let greeting = '';
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            const userName = user.ten_nguoi_dung || 'bạn';
            greeting = `Chào anh/chị <strong>${userName}</strong> ạ! 🌸 Em là Trà My, trợ lý ảo của Nhà hàng Ẩm thực Phương Nam đây ạ. Rất vui được gặp lại anh/chị! Hôm nay em có thể giúp gì cho anh/chị ạ? 💕`;
        } catch (e) {
            greeting = 'Chào anh/chị ạ! 🌸 Em là Trà My, trợ lý ảo của Nhà hàng Ẩm thực Phương Nam. Em có thể giúp gì cho anh/chị ạ? 💕';
        }
    } else {
        greeting = 'Chào quý khách ạ! 🌸 Em là Trà My, trợ lý ảo của Nhà hàng Ẩm thực Phương Nam đây ạ. Em có thể giúp anh/chị tìm hiểu về thực đơn, đặt bàn hoặc giải đáp mọi thắc mắc. Anh/chị cần em hỗ trợ gì ạ? 💕';
    }
    
    // Thêm quick suggestions
    const quickSuggestions = `
        <div class="flex flex-wrap gap-2 mt-3">
            <button onclick="chatbotSendQuick('Xem thực đơn')" class="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-yellow-200 transition">🍽️ Thực đơn</button>
            <button onclick="chatbotSendQuick('Món bán chạy nhất')" class="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-orange-200 transition">🔥 Bán chạy</button>
            <button onclick="chatbotSendQuick('Đặt bàn')" class="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-green-200 transition">📅 Đặt bàn</button>
            <button onclick="chatbotSendQuick('Giờ mở cửa')" class="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-200 transition">🕐 Giờ mở cửa</button>
            <button onclick="chatbotSendQuick('Gợi ý món ăn cho tôi')" class="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-purple-200 transition">✨ Gợi ý</button>
        </div>
    `;
    
    // Thêm tin nhắn chào mừng
    const botMsg = document.createElement('div');
    botMsg.className = 'flex gap-2';
    botMsg.innerHTML = `
        <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-robot text-white text-sm"></i>
        </div>
        <div class="chat-bubble-bot px-3 py-2 max-w-[85%] bg-white rounded-2xl rounded-tl-none shadow-sm">
            <p class="text-gray-700 text-sm leading-relaxed">${greeting}</p>
            ${quickSuggestions}
        </div>
    `;
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;
}

// Toggle dropdown lịch sử
window.toggleChatHistory = function() {
    const dropdown = document.getElementById('chatHistoryDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            loadChatHistory();
        }
    }
};

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('chatHistoryDropdown');
    const historyBtn = e.target.closest('[onclick*="toggleChatHistory"]');
    if (dropdown && dropdown.classList.contains('show') && !dropdown.contains(e.target) && !historyBtn) {
        dropdown.classList.remove('show');
    }
});

// Tải lịch sử chat
async function loadChatHistory() {
    const historyList = document.getElementById('historyList');
    const loginPrompt = document.getElementById('historyLoginPrompt');
    const token = localStorage.getItem('token');
    
    if (!token) {
        // Khách vãng lai - hiển thị prompt đăng nhập
        if (loginPrompt) loginPrompt.classList.remove('hidden');
        if (historyList) {
            historyList.innerHTML = `
                <div class="text-center text-gray-400 text-xs py-4">
                    <i class="fas fa-lock mb-2 text-lg"></i>
                    <p>Đăng nhập để xem lịch sử</p>
                </div>
            `;
        }
        return;
    }
    
    if (loginPrompt) loginPrompt.classList.add('hidden');
    
    try {
        console.log('📜 Loading chat history with token:', token ? 'exists' : 'none');
        
        const response = await fetch('http://localhost:3000/api/chatbot/sessions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        console.log('📜 Chat history response:', result);
        
        if (result.success && result.data && result.data.length > 0) {
            chatHistoryList = result.data;
            renderHistoryList();
        } else {
            historyList.innerHTML = `
                <div class="text-center text-gray-400 text-sm py-6">
                    <i class="fas fa-comments mb-2 text-2xl"></i>
                    <p>Chưa có lịch sử chat</p>
                    <p class="text-xs mt-1">Hãy bắt đầu trò chuyện với Trà My!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        historyList.innerHTML = `<div class="text-center text-red-400 text-xs py-4">Lỗi tải lịch sử</div>`;
    }
}

// Render danh sách lịch sử
function renderHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList || !chatHistoryList.length) {
        historyList.innerHTML = `<div class="text-center text-gray-400 text-xs py-4">Chưa có lịch sử chat</div>`;
        return;
    }
    
    historyList.innerHTML = chatHistoryList.map(session => {
        const isActive = session.session_id === currentChatSessionId;
        const date = new Date(session.thoi_diem_chat);
        const timeStr = date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
        const preview = session.first_message ? session.first_message.substring(0, 35) + '...' : 'Cuộc trò chuyện';
        
        return `
            <div class="history-item ${isActive ? 'active' : ''} px-3 py-2 cursor-pointer border-b border-gray-50" onclick="loadChatSession('${session.session_id}')">
                <div class="flex items-start gap-2">
                    <i class="fas fa-comment-dots text-green-500 mt-0.5"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-700 truncate">${escapeHtmlChat(preview)}</p>
                        <p class="text-xs text-gray-400">${timeStr}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Tải một session chat cụ thể
window.loadChatSession = async function(sessionId) {
    const token = localStorage.getItem('token');
    const messages = document.getElementById('chatbotMessages');
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`http://localhost:3000/api/chatbot/history/${sessionId}`, { headers });
        const result = await response.json();
        
        if (result.success && result.data) {
            // Cập nhật session hiện tại
            currentChatSessionId = sessionId;
            sessionStorage.setItem('chatbot_session_id', sessionId);
            chatbotGreeted = true;
            
            // Clear và render messages
            messages.innerHTML = '';
            result.data.forEach(msg => {
                if (msg.nguoi_gui === 'user') {
                    addUserMessageToUI(messages, msg.noi_dung);
                } else {
                    addBotMessage(messages, msg.noi_dung);
                }
            });
            
            // Đóng dropdown
            const dropdown = document.getElementById('chatHistoryDropdown');
            if (dropdown) dropdown.classList.remove('show');
            
            // Cập nhật active state
            renderHistoryList();
        }
    } catch (error) {
        console.error('Error loading chat session:', error);
    }
};

// Tạo cuộc trò chuyện mới
window.startNewChat = function() {
    const messages = document.getElementById('chatbotMessages');
    
    // Tạo session ID mới
    currentChatSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('chatbot_session_id', currentChatSessionId);
    
    // Reset và hiển thị lời chào mới
    chatbotGreeted = false;
    messages.innerHTML = '';
    showChatbotGreeting();
    
    // Đóng sidebar nếu đang mở
    const sidebar = document.getElementById('chatHistorySidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
    
    // Focus input
    document.getElementById('chatbotInput')?.focus();
};

// Thêm tin nhắn user vào UI (không gửi API)
function addUserMessageToUI(messages, text) {
    const userMsg = document.createElement('div');
    userMsg.className = 'flex justify-end';
    userMsg.innerHTML = `
        <div class="bg-gradient-to-br from-green-400 to-blue-500 p-3 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">
            <p class="text-white text-sm">${escapeHtmlChat(text)}</p>
        </div>
    `;
    messages.appendChild(userMsg);
}

// Initialize Chatbot functionality
function initializeChatbot() {
    const chatbotButton = document.getElementById('chatbotButton');
    const chatbotPanel = document.getElementById('chatbotPanel');
    const closeChatbot = document.getElementById('closeChatbot');
    
    if (chatbotButton && chatbotPanel) {
        console.log('🤖 Initializing chatbot...');
        
        const isMobile = () => window.innerWidth <= 640;
        
        // Toggle chat panel khi click vào button
        chatbotButton.addEventListener('click', function() {
            if (isMobile()) {
                // Mobile: fullscreen mode
                chatbotPanel.classList.toggle('mobile-open');
                document.body.style.overflow = chatbotPanel.classList.contains('mobile-open') ? 'hidden' : '';
            } else {
                // Desktop: popup mode
                chatbotPanel.classList.toggle('opacity-0');
                chatbotPanel.classList.toggle('scale-90');
                chatbotPanel.classList.toggle('pointer-events-none');
            }
            // Hiển thị lời chào khi mở chatbot lần đầu
            showChatbotGreeting();
            // Focus input
            setTimeout(() => document.getElementById('chatbotInput')?.focus(), 100);
        });
        
        // Đóng chat panel
        if (closeChatbot) {
            closeChatbot.addEventListener('click', function() {
                // Nếu đang ở chế độ mở rộng, thu nhỏ trước
                if (chatbotPanel.classList.contains('chatbot-expanded')) {
                    toggleExpandChatbot();
                    return;
                }
                if (isMobile()) {
                    chatbotPanel.classList.remove('mobile-open');
                    document.body.style.overflow = '';
                } else {
                    chatbotPanel.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
                }
            });
        }
        
        // Phím ESC để đóng/thu nhỏ chatbot
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (chatbotPanel.classList.contains('chatbot-expanded')) {
                    toggleExpandChatbot();
                } else if (!chatbotPanel.classList.contains('opacity-0') && !chatbotPanel.classList.contains('pointer-events-none')) {
                    if (isMobile()) {
                        chatbotPanel.classList.remove('mobile-open');
                        document.body.style.overflow = '';
                    } else {
                        chatbotPanel.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
                    }
                }
            }
        });
        
        console.log('✅ Chatbot initialized successfully');
    }
}

// Mở rộng / Thu nhỏ chatbot
window.toggleExpandChatbot = function() {
    const panel = document.getElementById('chatbotPanel');
    const overlay = document.getElementById('chatbotOverlay');
    const expandBtn = document.getElementById('expandChatbot');
    const messages = document.getElementById('chatbotMessages');
    
    if (!panel) return;
    
    const isExpanded = panel.classList.contains('chatbot-expanded');
    
    if (isExpanded) {
        // Thu nhỏ về kích thước bình thường
        panel.classList.remove('chatbot-expanded');
        if (overlay) overlay.classList.remove('active');
        if (expandBtn) {
            expandBtn.classList.remove('expanded');
            expandBtn.querySelector('i').className = 'fas fa-expand text-sm';
            expandBtn.title = 'Mở rộng';
        }
        document.body.style.overflow = '';
    } else {
        // Mở rộng toàn màn hình
        panel.classList.add('chatbot-expanded');
        // Đảm bảo panel đang hiển thị
        panel.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
        if (overlay) overlay.classList.add('active');
        if (expandBtn) {
            expandBtn.classList.add('expanded');
            expandBtn.querySelector('i').className = 'fas fa-compress text-sm';
            expandBtn.title = 'Thu nhỏ';
        }
        document.body.style.overflow = 'hidden';
    }
    
    // Scroll xuống cuối tin nhắn
    if (messages) {
        setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 100);
    }
    
    // Focus input
    setTimeout(() => document.getElementById('chatbotInput')?.focus(), 150);
};

// Gửi tin nhắn nhanh
window.chatbotSendQuick = function(message) {
    document.getElementById('chatbotInput').value = message;
    chatbotSendMessage();
};

// Gửi tin nhắn chatbot
window.chatbotSendMessage = async function() {
    const input = document.getElementById('chatbotInput');
    const messages = document.getElementById('chatbotMessages');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Thêm tin nhắn user
    addUserMessageToUI(messages, text);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
    
    // Hiển thị typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.id = 'chatbot-typing';
    typingDiv.className = 'flex gap-2';
    typingDiv.innerHTML = `
        <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-robot text-white text-sm"></i>
        </div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm">
            <div class="flex gap-1">
                <span class="w-2 h-2 bg-green-400 rounded-full animate-bounce" style="animation-delay: 0s"></span>
                <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                <span class="w-2 h-2 bg-green-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
            </div>
        </div>
    `;
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
    
    try {
        // Lấy token nếu user đã đăng nhập
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('http://localhost:3000/api/chatbot/chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ 
                message: text,
                session_id: getChatbotSessionId()
            })
        });
        
        const result = await response.json();
        document.getElementById('chatbot-typing')?.remove();
        
        let botResponse = result.success && result.data?.response 
            ? result.data.response 
            : (result.message || '❌ Không thể kết nối. Vui lòng thử lại!');
        
        // Lấy dữ liệu món ăn từ GraphQL (có ảnh)
        let graphqlDishes = (result.data?.dishes) || [];
        console.log('🔍 GraphQL dishes:', graphqlDishes.length, 'source:', result.data?.source);
        
        // Lấy gợi ý món ăn dựa trên tin nhắn (ML Recommendation) - fallback
        let recommendations = [];
        if (graphqlDishes.length === 0 && typeof RecommendationSystem !== 'undefined') {
            try {
                const recResult = await RecommendationSystem.getChatRecommendations(text);
                if (recResult.success && recResult.meta?.has_food_intent) {
                    recommendations = recResult.data || [];
                    console.log('🍽️ ML recommendations fallback:', recommendations.length, 'items');
                }
            } catch (recError) {
                console.log('⚠️ Could not get recommendations:', recError.message);
            }
        }
        
        addBotMessage(messages, botResponse, recommendations, graphqlDishes);
        
    } catch (error) {
        console.error('Chatbot API error:', error);
        document.getElementById('chatbot-typing')?.remove();
        addBotMessage(messages, '❌ Lỗi kết nối. Vui lòng thử lại sau!');
    }
};

// Thêm tin nhắn bot - hỗ trợ GraphQL dish cards với ảnh
function addBotMessage(messages, response, recommendations = null, graphqlDishes = null) {
    const botMsg = document.createElement('div');
    botMsg.className = 'flex gap-2';
    
    // Render GraphQL dish cards (có ảnh) - ưu tiên hơn ML recommendations
    let dishCardsHtml = '';
    if (graphqlDishes && graphqlDishes.length > 0) {
        dishCardsHtml = renderGraphQLDishCards(graphqlDishes);
    } else if (recommendations && recommendations.length > 0 && typeof RecommendationSystem !== 'undefined') {
        // Fallback sang ML recommendations
        dishCardsHtml = RecommendationSystem.renderChatRecommendations(recommendations);
    }
    
    // Tạo unique id cho mỗi tin nhắn bot (dùng cho TTS)
    const ttsId = 'tts-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    botMsg.innerHTML = `
        <div class="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-robot text-white text-sm"></i>
        </div>
        <div class="chat-bubble-bot px-3 py-2 max-w-[85%] bg-white rounded-2xl rounded-tl-none shadow-sm">
            <p class="text-gray-700 text-sm leading-relaxed">${response}</p>
            ${dishCardsHtml}
            <button class="tts-btn" data-tts-id="${ttsId}" onclick="toggleTTS(this)" title="Nghe Trà My đọc">
                <i class="fas fa-volume-up tts-icon"></i>
                <span class="tts-label">Nghe</span>
                <span class="tts-pulse"></span>
            </button>
        </div>
    `;
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;
}

// Render dish cards từ GraphQL data (với ảnh món ăn)
function renderGraphQLDishCards(dishes) {
    if (!dishes || dishes.length === 0) return '';
    
    const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    
    // Nếu chỉ 1 món - hiển thị card lớn
    if (dishes.length === 1) {
        const d = dishes[0];
        const imgSrc = d.anh_mon ? (d.anh_mon.startsWith('http') ? d.anh_mon : `http://localhost:3000/images/${d.anh_mon}`) : '';
        const rating = d.diem_danh_gia ? `<span class="text-yellow-500 text-xs">⭐ ${parseFloat(d.diem_danh_gia).toFixed(1)}</span>` : '';
        
        return `
            <div class="mt-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition" onclick="window.open('chitietmonan.html?id=${d.ma_mon}', '_blank')">
                ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtmlChat(d.ten_mon)}" class="w-full h-36 object-cover" onerror="this.style.display='none'"/>` : ''}
                <div class="p-3">
                    <div class="flex items-center justify-between">
                        <h4 class="font-semibold text-gray-800 text-sm">${escapeHtmlChat(d.ten_mon)}</h4>
                        ${rating}
                    </div>
                    <p class="text-green-600 font-bold text-sm mt-1">${formatPrice(d.gia_tien)}/${d.don_vi_tinh || 'phần'}</p>
                    ${d.mo_ta ? `<p class="text-gray-500 text-xs mt-1 line-clamp-2">${escapeHtmlChat(d.mo_ta)}</p>` : ''}
                    ${d.ten_danh_muc ? `<span class="inline-block mt-1.5 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">${escapeHtmlChat(d.ten_danh_muc)}</span>` : ''}
                    <button onclick="event.stopPropagation(); addDishToCart(${d.ma_mon})" class="mt-2 w-full py-1.5 bg-gradient-to-r from-green-400 to-blue-500 text-white text-xs rounded-lg font-medium hover:opacity-90 transition">
                        🛒 Thêm vào giỏ
                    </button>
                </div>
            </div>
        `;
    }
    
    // Nhiều món - hiển thị danh sách scroll ngang
    const cards = dishes.slice(0, 6).map(d => {
        const imgSrc = d.anh_mon ? (d.anh_mon.startsWith('http') ? d.anh_mon : `http://localhost:3000/images/${d.anh_mon}`) : '';
        const rating = d.diem_danh_gia ? `<span class="text-yellow-500" style="font-size:10px">⭐${parseFloat(d.diem_danh_gia).toFixed(1)}</span>` : '';
        
        return `
            <div class="flex-shrink-0 w-36 rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition" onclick="window.open('chitietmonan.html?id=${d.ma_mon}', '_blank')">
                ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtmlChat(d.ten_mon)}" class="w-full h-24 object-cover" onerror="this.parentElement.querySelector('img').style.display='none'"/>` : '<div class="w-full h-24 bg-gray-100 flex items-center justify-center"><i class="fas fa-utensils text-gray-300 text-2xl"></i></div>'}
                <div class="p-2">
                    <h4 class="font-medium text-gray-800 text-xs truncate" title="${escapeHtmlChat(d.ten_mon)}">${escapeHtmlChat(d.ten_mon)}</h4>
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-green-600 font-bold" style="font-size:11px">${formatPrice(d.gia_tien)}</span>
                        ${rating}
                    </div>
                    ${d.ten_danh_muc ? `<span class="inline-block mt-1 px-1.5 py-0.5 bg-gray-50 text-gray-500" style="font-size:9px; border-radius:4px">${escapeHtmlChat(d.ten_danh_muc)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="mt-3">
            <p class="text-xs text-gray-500 mb-2">🍽️ Món ăn liên quan (${dishes.length} món):</p>
            <div class="flex gap-2 overflow-x-auto pb-2" style="scrollbar-width: thin; -webkit-overflow-scrolling: touch;">
                ${cards}
            </div>
        </div>
    `;
}

// Thêm món vào giỏ hàng từ chatbot
window.addDishToCart = async function(ma_mon) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            if (confirm('Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?')) {
                window.location.href = 'dang-nhap.html';
            }
            return;
        }
        
        const response = await fetch('http://localhost:3000/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ma_mon: ma_mon, so_luong: 1 })
        });
        
        const result = await response.json();
        if (result.success) {
            // Cập nhật badge giỏ hàng
            if (typeof updateCartBadge === 'function') updateCartBadge();
            
            // Hiện thông báo ngắn
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 z-[99999] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-bounce';
            toast.textContent = '✅ Đã thêm vào giỏ hàng!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        } else {
            alert(result.message || 'Không thể thêm vào giỏ hàng');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Lỗi khi thêm vào giỏ hàng');
    }
};

// ==================== TEXT-TO-SPEECH (TTS) — Giọng nữ Trà My ====================

let currentTTSButton = null;
let ttsAudio = null;

/**
 * Bật / tắt đọc tin nhắn chatbot — Giọng nữ Trà My (Google TTS qua backend)
 * @param {HTMLElement} btn - Nút TTS được click
 */
window.toggleTTS = function(btn) {
    // Nếu đang phát cùng nút này → dừng
    if (btn.classList.contains('tts-playing')) {
        stopTTS();
        return;
    }

    // Dừng bất kỳ audio nào đang chạy
    stopTTS();

    // Lấy text thuần từ nội dung tin nhắn
    const bubble = btn.closest('.chat-bubble-bot');
    if (!bubble) return;

    const paragraphs = bubble.querySelectorAll('p.text-gray-700');
    let rawText = '';
    paragraphs.forEach(p => { rawText += p.textContent + ' '; });
    // Loại bỏ emoji và ký tự đặc biệt cho giọng đọc tự nhiên hơn
    rawText = rawText.trim()
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!rawText || rawText.length < 2) return;

    // Cập nhật UI → đang tải
    btn.classList.add('tts-playing');
    btn.querySelector('.tts-label').textContent = 'Đang tải...';
    btn.title = 'Đang tải giọng Trà My...';
    currentTTSButton = btn;

    // Gọi backend TTS API (giọng nữ Google Translate — tiếng Việt tự nhiên)
    const ttsUrl = `http://localhost:3000/api/tts?text=${encodeURIComponent(rawText)}`;
    
    ttsAudio = new Audio(ttsUrl);
    ttsAudio.playbackRate = 1.0;

    ttsAudio.addEventListener('canplaythrough', () => {
        // Đã tải xong → cập nhật UI
        const label = btn.querySelector('.tts-label');
        if (label) label.textContent = 'Dừng';
        btn.title = 'Dừng đọc';
    }, { once: true });

    ttsAudio.addEventListener('ended', () => resetTTSButton(btn));
    ttsAudio.addEventListener('error', (e) => {
        console.warn('TTS audio error, fallback to Web Speech API:', e);
        resetTTSButton(btn);
        // Fallback: dùng Web Speech API nếu backend lỗi
        fallbackWebSpeechTTS(btn, rawText);
    });

    ttsAudio.play().catch(err => {
        console.warn('TTS play error:', err);
        resetTTSButton(btn);
    });
};

/**
 * Dừng phát TTS
 */
function stopTTS() {
    // Dừng audio backend
    if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio.currentTime = 0;
        ttsAudio.src = '';
        ttsAudio = null;
    }
    // Dừng Web Speech API (fallback)
    if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
        speechSynthesis.cancel();
    }
    if (currentTTSButton) {
        resetTTSButton(currentTTSButton);
        currentTTSButton = null;
    }
}

/**
 * Reset nút TTS về trạng thái ban đầu
 */
function resetTTSButton(btn) {
    if (!btn) return;
    btn.classList.remove('tts-playing');
    const label = btn.querySelector('.tts-label');
    if (label) label.textContent = 'Nghe';
    btn.title = 'Nghe Trà My đọc';
    const icon = btn.querySelector('.tts-icon');
    if (icon) icon.className = 'fas fa-volume-up tts-icon';
}

/**
 * Fallback: dùng Web Speech API khi backend TTS lỗi
 */
function fallbackWebSpeechTTS(btn, text) {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    utterance.pitch = 1.3;

    const voices = speechSynthesis.getVoices();
    const vnVoice = voices.find(v => v.lang.startsWith('vi') && /google/i.test(v.name))
        || voices.find(v => v.lang.startsWith('vi'));
    if (vnVoice) utterance.voice = vnVoice;

    btn.classList.add('tts-playing');
    btn.querySelector('.tts-label').textContent = 'Dừng';
    currentTTSButton = btn;

    utterance.onend = () => resetTTSButton(btn);
    utterance.onerror = () => resetTTSButton(btn);
    speechSynthesis.speak(utterance);
}

// Preload Web Speech voices (dùng cho fallback)
if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// Escape HTML
function escapeHtmlChat(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to window for global access
window.updateUserMenu = updateUserMenu;
window.getAvatarUrl = getAvatarUrl;
window.initializeChatbot = initializeChatbot;

// ==================== NOTIFICATION SYSTEM ====================

// Load notifications script dynamically
function loadNotificationScript() {
    // Check if already loaded
    if (window.NotificationManager) {
        window.NotificationManager.init();
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'js/notifications.js';
    script.onload = function() {
        console.log('✅ Notifications script loaded');
    };
    script.onerror = function() {
        console.warn('⚠️ Could not load notifications.js');
    };
    document.head.appendChild(script);
}

// Initialize notifications after components are loaded
setTimeout(() => {
    loadNotificationScript();
}, 600);
