// Navigation Bar Component
ComponentManager.register('navbar', (data = {}) => {
    const { currentPage = 'index' } = data;
    
    const isActive = (page) => currentPage === page ? 'text-orange-600 font-medium' : 'text-gray-700 hover:text-orange-600';
    
    return `
        <nav id="navbar" class="fixed w-full top-0 z-50 transition-all duration-300 bg-white shadow-md">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between h-20">
                    <!-- Logo -->
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-utensils text-3xl text-orange-600"></i>
                        <div>
                            <h1 class="font-playfair text-2xl font-bold text-gray-800">Phương Nam</h1>
                            <p class="text-xs text-gray-600">Vĩnh Long</p>
                        </div>
                    </div>

                    <!-- Desktop Menu -->
                    <div class="hidden lg:flex items-center space-x-8">
                        <a href="index.html" class="${isActive('index')} transition">
                            <i class="fas fa-home mr-1"></i> Trang chủ
                        </a>
                        <a href="gioi-thieu.html" class="${isActive('about')} transition">
                            <i class="fas fa-info-circle mr-1"></i> Giới thiệu
                        </a>
                        <a href="tin-tuc.html" class="${isActive('news')} transition">
                            <i class="fas fa-newspaper mr-1"></i> Tin tức
                        </a>
                        <a href="album.html" class="${isActive('album')} transition">
                            <i class="fas fa-images mr-1"></i> Album ảnh
                        </a>
                        <a href="thuc-don.html" class="${isActive('menu')} transition">
                            <i class="fas fa-book-open mr-1"></i> Thực đơn
                        </a>
                        <a href="dat-ban.html" class="${isActive('booking')} transition">
                            <i class="fas fa-calendar-check mr-1"></i> Đặt bàn
                        </a>
                        <a href="lien-he.html" class="${isActive('contact')} transition">
                            <i class="fas fa-phone mr-1"></i> Liên hệ
                        </a>
                    </div>

                    <!-- Right Menu -->
                    <div class="hidden lg:flex items-center space-x-4">
                        <!-- Search -->
                        <button class="text-gray-700 hover:text-orange-600 transition" onclick="toggleSearch()">
                            <i class="fas fa-search text-xl"></i>
                        </button>

                        <!-- Cart -->
                        <a href="gio-hang.html" class="relative text-gray-700 hover:text-orange-600 transition">
                            <i class="fas fa-shopping-cart text-xl"></i>
                            <span class="absolute cart-badge bg-orange-600 text-white text-xs rounded-full flex items-center justify-center">0</span>
                        </a>

                        <!-- User Menu -->
                        <div id="user-menu-container"></div>
                    </div>

                    <!-- Mobile Menu Button -->
                    <button id="mobile-menu-btn" class="lg:hidden text-gray-700 text-2xl">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>

                <!-- Mobile Menu -->
                <div id="mobile-menu" class="hidden lg:hidden pb-4">
                    <a href="index.html" class="block py-2 ${isActive('index')}">Trang chủ</a>
                    <a href="gioi-thieu.html" class="block py-2 ${isActive('about')}">Giới thiệu</a>
                    <a href="tin-tuc.html" class="block py-2 ${isActive('news')}">Tin tức</a>
                    <a href="album.html" class="block py-2 ${isActive('album')}">Album ảnh</a>
                    <a href="thuc-don.html" class="block py-2 ${isActive('menu')}">Thực đơn</a>
                    <a href="dat-ban.html" class="block py-2 ${isActive('booking')}">Đặt bàn</a>
                    <a href="lien-he.html" class="block py-2 ${isActive('contact')}">Liên hệ</a>
                    <a href="gio-hang.html" class="block py-2 text-gray-700 hover:text-orange-600">Giỏ hàng</a>
                    <a href="dang-nhap.html" class="block py-2 text-gray-700 hover:text-orange-600">Đăng nhập</a>
                    <a href="dang-ky.html" class="block py-2 text-gray-700 hover:text-orange-600">Đăng ký</a>
                </div>
            </div>
        </nav>
    `;
});

// Initialize navbar when loaded
function initNavbar() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// Render user menu based on login status (global function)
// Đồng nhất style với load-components.js
window.renderUserMenu = function() {
    console.log('🔄 renderUserMenu() called');
    
    const userMenuContainer = document.getElementById('user-menu-container');
    if (!userMenuContainer) {
        console.error('❌ user-menu-container not found!');
        return;
    }

    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('📦 LocalStorage:', { 
        hasUser: !!userStr, 
        hasToken: !!token,
        user: userStr ? JSON.parse(userStr).ten_nguoi_dung : null
    });

    if (userStr && token) {
        try {
            const user = JSON.parse(userStr);
            const displayName = user.ten_nguoi_dung || user.email || 'Người dùng';
            console.log('👤 User data:', { 
                name: displayName, 
                avatar: user.anh_dai_dien,
                avatarType: typeof user.anh_dai_dien
            });
            
            // Xử lý avatar URL - sử dụng hàm helper nếu có
            let avatarUrl = null;
            if (typeof window.getAvatarUrl === 'function') {
                avatarUrl = window.getAvatarUrl(user.anh_dai_dien);
            } else if (user.anh_dai_dien && user.anh_dai_dien.trim() !== '') {
                avatarUrl = user.anh_dai_dien.startsWith('http') 
                    ? user.anh_dai_dien 
                    : `http://localhost:3000${user.anh_dai_dien}`;
            }
            
            if (avatarUrl) {
                console.log('🖼️ Avatar URL:', avatarUrl);
            } else {
                console.log('⚠️ No avatar found for user');
            }

            // Desktop User Menu - đồng nhất style: w-9 h-9 avatar, hiển thị tên từ lg trở lên
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

            // Mobile User Menu - đồng nhất style: w-10 h-10 avatar với border
            const mobileUserMenu = document.getElementById('mobile-user-menu');
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

            console.log('✅ User menu rendered for:', displayName);
        } catch (error) {
            console.error('❌ Error parsing user data:', error);
            window.renderGuestMenu();
        }
    } else {
        console.log('👤 No user logged in, rendering guest menu');
        window.renderGuestMenu();
    }
}

// Render menu for guests (not logged in) (global function)
window.renderGuestMenu = function() {
    const userMenuContainer = document.getElementById('user-menu-container');
    if (!userMenuContainer) return;

    userMenuContainer.innerHTML = `
        <div class="relative group">
            <button class="text-gray-700 hover:text-orange-600 transition">
                <i class="fas fa-user text-xl"></i>
            </button>
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <a href="dang-nhap.html" class="block px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                    <i class="fas fa-sign-in-alt mr-2"></i> Đăng nhập
                </a>
                <a href="dang-ky.html" class="block px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600">
                    <i class="fas fa-user-plus mr-2"></i> Đăng ký
                </a>
            </div>
        </div>
    `;

    // Cập nhật mobile menu
    const mobileUserMenu = document.getElementById('mobile-user-menu');
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

// Alias for backward compatibility
window.updateUserMenu = window.renderUserMenu;

// Set active navigation link based on current page
function setActiveNavLink() {
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pageName = currentPage.replace('.html', '');
    
    console.log('📍 Current page:', pageName);
    
    // Set active state for desktop nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === pageName || (pageName === '' && linkPage === 'index')) {
            link.classList.add('active');
            console.log('✅ Active link set:', linkPage);
        } else {
            link.classList.remove('active');
        }
    });
    
    // Set active state for mobile nav links
    const mobileNavLinks = document.querySelectorAll('.nav-link-mobile');
    mobileNavLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === pageName || (pageName === '' && linkPage === 'index')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Auto-initialize after component is rendered
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initNavbar();
        renderUserMenu();
        setActiveNavLink();
    }, 100);
});
