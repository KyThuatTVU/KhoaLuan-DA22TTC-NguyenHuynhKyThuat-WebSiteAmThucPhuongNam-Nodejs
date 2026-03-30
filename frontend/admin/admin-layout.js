// Admin Layout Component - Shared across all admin pages
const API_URL = 'http://localhost:3000/api';

// 1. SIDEBAR TEMPLATE (Centralized Source of Truth)
const SIDEBAR_TEMPLATE = `
<aside id="sidebar" class="sidebar w-72 flex-shrink-0 transition-transform -translate-x-full lg:translate-x-0 fixed lg:relative z-50 h-full">
    <div class="h-full flex flex-col">
        <div class="p-5 border-b border-white/10">
            <div class="flex items-center space-x-3">
                <img src="../images/Green Simple Clean Vegan Food Logo.png" alt="Logo" class="w-11 h-11 rounded-xl object-contain bg-white p-1">
                <div>
                    <h1 class="font-bold text-white text-lg">Phương Nam</h1>
                    <p class="text-xs text-blue-300">Hệ thống quản trị</p>
                </div>
            </div>
        </div>
        <nav class="flex-1 overflow-y-auto p-4">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Menu chính</p>
            <div class="space-y-1">
                <a href="dashboard.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-chart-pie w-5"></i><span class="text-sm">Tổng quan</span></a>
                <a href="admin-pos-new.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-pos"><i class="fas fa-cash-register w-5"></i><span class="text-sm font-medium">Bán hàng (POS)</span></a>
                <a href="products.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-utensils w-5"></i><span class="text-sm">Món ăn</span></a>
                <a href="categories.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-categories"><i class="fas fa-tags w-5"></i><span class="text-sm font-medium">Danh mục</span></a>
                <a href="nguyen-lieu.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-boxes w-5"></i><span class="text-sm">Nguyên liệu</span></a>
                <a href="cong-thuc.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-clipboard-list w-5"></i><span class="text-sm">Công thức</span></a>
                <a href="orders.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-shopping-cart w-5"></i><span class="text-sm font-medium">Đơn hàng</span></a>
                <a href="reservations.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-calendar-check w-5"></i><span class="text-sm">Đặt bàn</span></a>
                <a href="tables.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-chair w-5"></i><span class="text-sm">Quản lý bàn</span></a>
                <a href="customers.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-users w-5"></i><span class="text-sm">Khách hàng</span></a>
                <a href="staff.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-staff"><i class="fas fa-user-tie w-5"></i><span class="text-sm">Nhân viên</span></a>
                <a href="shifts.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-staff"><i class="fas fa-clock w-5"></i><span class="text-sm">Ca làm việc</span></a>
                <a href="attendance.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-staff"><i class="fas fa-check-double w-5"></i><span class="text-sm">Chấm công</span></a>
                <a href="payroll.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-staff"><i class="fas fa-money-bill-wave w-5"></i><span class="text-sm">Bảng lương</span></a>
                <a href="contacts.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-envelope w-5"></i><span class="text-sm">Liên hệ</span></a>
                <a href="chatbot-history.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-robot w-5"></i><span class="text-sm">Lịch sử Chatbot</span></a>
                <a href="reviews.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-star w-5"></i><span class="text-sm">Đánh giá</span></a>
                <a href="promotions.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-ticket-alt w-5"></i><span class="text-sm">Khuyến mãi</span></a>
            </div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-3 menu-content-title">Nội dung</p>
            <div class="space-y-1 menu-content-group">
                <a href="news.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-newspaper w-5"></i><span class="text-sm">Tin tức</span></a>
                <a href="quan-ly-binh-luan.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-comments w-5"></i><span class="text-sm">Bình luận tin tức</span></a>
                <a href="quan-ly-danh-gia-tin-tuc.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-thumbs-up w-5"></i><span class="text-sm">Reactions tin tức</span></a>
                <a href="albums.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-images w-5"></i><span class="text-sm">Album ảnh</span></a>
            </div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-3 menu-system-title">Hệ thống</p>
            <div class="space-y-1 menu-system-group">
                <a href="settings.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-cog w-5"></i><span class="text-sm">Cài đặt</span></a>
            </div>
        </nav>
        <div class="p-4 border-t border-white/10">
            <div class="admin-card">
                <div class="flex items-center space-x-3">
                    <img id="admin-avatar" referrerpolicy="no-referrer" src="https://ui-avatars.com/api/?name=Admin&background=3b82f6&color=fff" alt="Admin" class="w-12 h-12 rounded-full border-2 border-blue-400">
                    <div class="flex-1 min-w-0">
                        <p id="admin-name" class="font-semibold text-sm text-white truncate">Admin</p>
                        <p id="admin-email" class="text-xs text-blue-300 truncate">admin@example.com</p>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                    <span class="text-xs text-blue-300"><i class="fab fa-google mr-1"></i>Google</span>
                    <button onclick="logout()" class="text-xs text-red-400 hover:text-red-300"><i class="fas fa-sign-out-alt mr-1"></i>Đăng xuất</button>
                </div>
            </div>
        </div>
    </div>
</aside>
`;

// 2. HEADER TEMPLATE (Centralized Source of Truth)
const HEADER_TEMPLATE = `
<header class="header-bar flex items-center justify-between">
    <div class="flex items-center space-x-3 sm:space-x-4">
        <button onclick="toggleSidebar()" class="mobile-menu-btn lg:hidden text-white cursor-pointer"><i class="fas fa-bars text-xl"></i></button>
        <div>
            <h2 id="header-page-title" class="text-base sm:text-xl font-bold">Quản trị</h2>
            <p id="header-page-desc" class="text-xs sm:text-sm text-blue-200 hidden sm:block">Nhà hàng Ẩm thực Phương Nam</p>
        </div>
    </div>
    <div class="flex items-center space-x-4">
        <!-- Admin Notification Bell -->
        <div id="admin-notification-container" class="relative">
            <button id="admin-notification-btn" class="relative text-white hover:text-blue-200 transition cursor-pointer">
                <i class="fas fa-bell text-lg"></i>
                <span id="admin-notification-badge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold hidden">0</span>
            </button>
            <div id="admin-notification-dropdown" class="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-100 hidden" style="z-index: 9999;">
                <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-800">Thông báo quản trị</h3>
                    <button id="admin-mark-all-read-btn" class="text-xs text-orange-600 hover:text-orange-700 cursor-pointer">Đánh dấu đã đọc</button>
                </div>
                <div id="admin-notification-list" class="max-h-96 overflow-y-auto">
                    <div class="text-center py-8 text-gray-400">
                        <i class="fas fa-bell-slash text-3xl mb-2"></i>
                        <p class="text-sm">Chưa có thông báo</p>
                    </div>
                </div>
            </div>
        </div>
        
        <a href="../index.html" target="_blank" class="text-white hover:text-blue-200 transition" title="Xem website">
            <i class="fas fa-external-link-alt text-lg"></i>
        </a>
        <div class="hidden md:flex items-center space-x-3 pl-4 border-l border-white/20">
            <img id="admin-avatar-header" referrerpolicy="no-referrer" src="https://ui-avatars.com/api/?name=Admin&background=3b82f6&color=fff" alt="Admin" class="w-10 h-10 rounded-full border-2 border-blue-400">
            <div>
                <p id="admin-name-header" class="font-semibold text-sm text-white">Admin</p>
                <p id="user-role-badge" class="text-xs text-blue-200 uppercase tracking-tighter font-bold">Quản trị viên</p>
            </div>
        </div>
    </div>
</header>
<div id="sidebar-overlay" class="fixed inset-0 bg-black/50 z-40 lg:hidden opacity-0 invisible transition-all duration-300" onclick="toggleSidebar()"></div>
`;

// Helper to update elements safely
function safeUpdate(id, prop, val, isAttr = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isAttr) el.setAttribute(prop, val);
    else el[prop] = val;
}

// Load admin info from session
async function loadAdminInfo(retryCount = 0) {
    try {
        const response = await fetch(`${API_URL}/admin-auth/check-session`, {
            method: 'GET',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.isAuthenticated && result.data) {
            const admin = result.data;
            const adminName = admin.ten_hien_thi || admin.tai_khoan || admin.email.split('@')[0];
            const adminAvatar = admin.anh_dai_dien || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=3b82f6&color=fff`;
            
            // Sync UI
            updateAdminElements('admin-name', adminName);
            updateAdminElements('admin-avatar', adminAvatar, true);
            updateAdminElements('admin-email', admin.email);
            updateAdminElements('admin-name-header', adminName);
            updateAdminElements('admin-avatar-header', adminAvatar, true);
            
            return admin;
        } else if (retryCount < 2) {
            await new Promise(r => setTimeout(r, 500));
            return loadAdminInfo(retryCount + 1);
        }
        window.location.href = 'dang-nhap-admin.html';
        return null;
    } catch (error) {
        console.error('❌ Error loading admin info:', error);
        return null;
    }
}

function updateAdminElements(identifier, value, isImage = false) {
    const elements = [...document.querySelectorAll(`#${identifier}`), 
                     ...document.querySelectorAll(`.${identifier}`),
                     ...document.querySelectorAll(`[data-admin="${identifier}"]`)];
    
    elements.forEach(el => {
        if (isImage) {
            el.setAttribute('referrerpolicy', 'no-referrer');
            el.src = value;
            el.onerror = () => el.src = 'https://ui-avatars.com/api/?name=Admin&background=3b82f6&color=fff';
        } else {
            el.textContent = value;
        }
    });
}

async function logout() {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
    try {
        const res = await fetch(`${API_URL}/admin-auth/logout`, { method: 'POST', credentials: 'include' });
        const result = await res.json();
        if (result.success) window.location.href = 'dang-nhap-admin.html';
    } catch (e) { alert('Lỗi đăng xuất!'); }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
        if (overlay) {
            overlay.classList.toggle('opacity-0');
            overlay.classList.toggle('invisible');
        }
    }
}

function applyRBAC(adminUser) {
    if (!adminUser) return;
    const currentRole = adminUser.role || 'staff';
    
    // Hide based on role
    if (currentRole === 'staff') {
        const forbidden = ['dashboard.html', 'products.html', 'categories.html', 'customers.html', 'staff.html', 'settings.html', 'shifts.html', 'attendance.html', 'payroll.html'];
        forbidden.forEach(h => {
            const el = document.querySelector(`a[href="${h}"]`);
            if (el) el.remove();
        });
        document.querySelector('.menu-content-title')?.remove();
        document.querySelector('.menu-content-group')?.remove();
        document.querySelector('.menu-system-title')?.remove();
        document.querySelector('.menu-system-group')?.remove();
    } else if (currentRole === 'manager') {
        ['staff.html', 'shifts.html', 'attendance.html', 'payroll.html', 'settings.html'].forEach(h => {
             const el = document.querySelector(`a[href="${h}"]`);
             if (el) el.remove();
        });
        document.querySelector('.menu-system-title')?.remove();
        document.querySelector('.menu-system-group')?.remove();
    }
    
    const roleBadge = document.getElementById('user-role-badge');
    if (roleBadge) {
        roleBadge.textContent = currentRole === 'admin' ? 'Quản trị viên' : (currentRole === 'manager' ? 'Quản lý' : 'Nhân viên');
    }
}

function setActiveNavLink() {
    const path = window.location.pathname;
    const currentPage = path.split('/').pop().split('?')[0] || 'dashboard.html';
    document.querySelectorAll('.sidebar-item').forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop().split('?')[0];
        if (linkPage === currentPage) link.classList.add('active');
        else link.classList.remove('active');
    });
}

// Layout Injection Engine
function injectLayout() {
    // 1. Inject Sidebar
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
        sidebarPlaceholder.innerHTML = SIDEBAR_TEMPLATE;
    }

    // 2. Inject Header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = HEADER_TEMPLATE;
        
        // Auto-set title from document title
        const pageTitle = document.title.split('-')[0].trim();
        safeUpdate('header-page-title', 'textContent', pageTitle);
    }
}

async function initAdminLayout() {
    injectLayout();
    const adminData = await loadAdminInfo();
    if (adminData) applyRBAC(adminData);
    setActiveNavLink();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdminLayout);
else initAdminLayout();

// Export
window.logout = logout;
window.toggleSidebar = toggleSidebar;

