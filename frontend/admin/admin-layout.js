// Admin Layout Component - Shared across all admin pages
const API_URL = 'http://localhost:3000/api';

// Load admin info from session
async function loadAdminInfo(retryCount = 0) {
    try {
        console.log(`🔍 Checking admin session (attempt ${retryCount + 1})...`);
        
        const response = await fetch(`${API_URL}/admin-auth/check-session`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        const result = await response.json();
        
        console.log('📦 Session check result:', result);

        if (result.isAuthenticated && result.data) {
            const admin = result.data;

            console.log('📦 Admin data from server:', admin);

            // Lấy tên và avatar từ Google
            const adminName = admin.ten_hien_thi || admin.tai_khoan || admin.email.split('@')[0];
            const adminAvatar = admin.anh_dai_dien || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=ea580c&color=fff&size=128`;
            const adminEmail = admin.email;

            console.log('👤 Processed admin info:', { name: adminName, avatar: adminAvatar, email: adminEmail });

            // Update all admin info elements
            updateAdminElements('admin-name', adminName);
            updateAdminElements('admin-avatar', adminAvatar, true);
            updateAdminElements('admin-email', adminEmail);

            console.log('✅ Admin info loaded and updated');

            return { name: adminName, avatar: adminAvatar, email: adminEmail, role: admin.role, quyen: admin.quyen };
        } else {
            // Retry nếu chưa đến giới hạn (tối đa 3 lần)
            if (retryCount < 2) {
                console.log(`⏳ Session not ready, retrying in 500ms...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return loadAdminInfo(retryCount + 1);
            }
            
            // Không có session sau khi retry, chuyển về trang đăng nhập
            console.warn('⚠️ No admin session found after retries');
            window.location.href = 'dang-nhap-admin.html?error=unauthorized';
            return null;
        }
    } catch (error) {
        console.error('❌ Error loading admin info:', error);
        
        // Retry nếu có lỗi và chưa đến giới hạn
        if (retryCount < 2) {
            console.log(`⏳ Error occurred, retrying in 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return loadAdminInfo(retryCount + 1);
        }

        // Fallback to default
        const defaultName = 'Admin';
        const defaultAvatar = 'https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff&size=128';

        updateAdminElements('admin-name', defaultName);
        updateAdminElements('admin-avatar', defaultAvatar, true);

        return { name: defaultName, avatar: defaultAvatar, email: '' };
    }
}

// Helper function to update elements by ID or class
function updateAdminElements(identifier, value, isImage = false) {
    console.log(`🔄 Updating ${identifier}:`, isImage ? 'Image URL' : value);

    let updated = 0;

    // Update by ID
    const elementById = document.getElementById(identifier);
    if (elementById) {
        if (isImage) {
            console.log(`🖼️ Setting image src for #${identifier}:`, value);

            // Thêm các thuộc tính để load ảnh Google
            elementById.setAttribute('referrerpolicy', 'no-referrer');
            elementById.setAttribute('crossorigin', 'anonymous');

            elementById.src = value;
            elementById.onerror = () => {
                console.warn(`⚠️ Image failed to load, using fallback avatar. URL was: ${value}`);
                elementById.src = 'https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff';
            };
        } else {
            elementById.textContent = value;
        }
        updated++;
        console.log(`✅ Updated #${identifier}`);
    } else {
        console.warn(`⚠️ Element #${identifier} not found`);
    }

    // Update by class
    const elementsByClass = document.getElementsByClassName(identifier);
    if (elementsByClass.length > 0) {
        Array.from(elementsByClass).forEach(element => {
            if (isImage) {
                // Thêm các thuộc tính để load ảnh Google
                element.setAttribute('referrerpolicy', 'no-referrer');
                element.setAttribute('crossorigin', 'anonymous');

                element.src = value;
                element.onerror = () => {
                    console.warn(`⚠️ Image failed to load, using fallback avatar. URL was: ${value}`);
                    element.src = 'https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff';
                };
            } else {
                element.textContent = value;
            }
            updated++;
        });
        console.log(`✅ Updated ${elementsByClass.length} elements with class .${identifier}`);
    }

    // Update elements with data attribute
    const elementsByData = document.querySelectorAll(`[data-admin="${identifier}"]`);
    if (elementsByData.length > 0) {
        elementsByData.forEach(element => {
            if (isImage) {
                // Thêm các thuộc tính để load ảnh Google
                element.setAttribute('referrerpolicy', 'no-referrer');
                element.setAttribute('crossorigin', 'anonymous');

                element.src = value;
                element.onerror = () => {
                    console.warn(`⚠️ Image failed to load, using fallback avatar. URL was: ${value}`);
                    element.src = 'https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff';
                };
            } else {
                element.textContent = value;
            }
            updated++;
        });
        console.log(`✅ Updated ${elementsByData.length} elements with data-admin="${identifier}"`);
    }

    // Also try with -header suffix
    const headerElement = document.getElementById(`${identifier}-header`);
    if (headerElement) {
        if (isImage) {
            console.log(`🖼️ Setting image src for #${identifier}-header:`, value);

            // Thêm các thuộc tính để load ảnh Google
            headerElement.setAttribute('referrerpolicy', 'no-referrer');
            headerElement.setAttribute('crossorigin', 'anonymous');

            headerElement.src = value;
            headerElement.onerror = () => {
                console.warn(`⚠️ Image failed to load, using fallback avatar. URL was: ${value}`);
                headerElement.src = 'https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff';
            };
        } else {
            headerElement.textContent = value;
        }
        updated++;
        console.log(`✅ Updated #${identifier}-header`);
    }

    if (updated === 0) {
        console.warn(`⚠️ No elements found for: ${identifier}`);
    } else {
        console.log(`✅ Total ${updated} elements updated for ${identifier}`);
    }
}

// Logout function
async function logout() {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin-auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = 'dang-nhap-admin.html?logout=success';
        } else {
            alert('Lỗi đăng xuất. Vui lòng thử lại!');
        }
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        alert('Lỗi đăng xuất. Vui lòng thử lại!');
    }
}

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
        sidebar.classList.toggle('translate-x-0');
    }
}

// Function to enforce Role-Based Access Control (RBAC) and inject POS link
function applyRBAC(adminUser) {
    if (!adminUser) return;
    
    // 1. Inject POS link right after dashboard
    const dashboardLink = document.querySelector('a[href="dashboard.html"]');
    if (dashboardLink && !document.querySelector('a[href="admin-pos-tables.html"]') && !document.querySelector('a[href*="admin-pos"]')) {
        const posLink = document.createElement('a');
        posLink.href = 'admin-pos-new.html';
        posLink.className = 'sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-pos';
        posLink.innerHTML = '<i class="fas fa-cash-register w-5"></i><span class="text-sm font-medium">Bán hàng (POS)</span>';
        dashboardLink.parentNode.insertBefore(posLink, dashboardLink.nextSibling);
    }

    // 2. Inject Category link after Products
    const productsLink = document.querySelector('a[href="products.html"]');
    if (productsLink && !document.querySelector('a[href="categories.html"]')) {
        const categoryLink = document.createElement('a');
        categoryLink.href = 'categories.html';
        categoryLink.className = 'sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-categories';
        categoryLink.innerHTML = '<i class="fas fa-tags w-5"></i><span class="text-sm font-medium">Danh mục</span>';
        productsLink.parentNode.insertBefore(categoryLink, productsLink.nextSibling);
    }

    // 3. Hide specific items based on role
    const hideLinks = (hrefs) => {
        hrefs.forEach(href => {
            const link = document.querySelector(`a[href="${href}"]`);
            if (link) link.style.display = 'none';
        });
    };
    
    // Hide content groups
    const hideGroup = (titleText) => {
        const pTags = document.querySelectorAll('nav p');
        pTags.forEach(p => {
            if (p.textContent.includes(titleText)) {
                p.style.display = 'none';
                if (p.nextElementSibling && p.nextElementSibling.tagName === 'DIV') {
                    p.nextElementSibling.style.display = 'none';
                }
            }
        });
    }

    const currentRole = adminUser.role || adminUser.quyen || 'admin';

    // Staff: Only POS, Orders, Tables, Reservations
    if (currentRole === 'staff') {
        hideLinks([
            'dashboard.html', 
            'products.html', 
            'customers.html', 
            'staff.html', 
            'contacts.html',
            'chatbot-history.html',
            'reviews.html',
            'promotions.html'
        ]);
        hideGroup('Nội dung');
        hideGroup('Hệ thống');
    } 
    // Manager: No Staff, No Settings
    else if (currentRole === 'manager') {
        hideLinks([
            'staff.html',
            'settings.html'
        ]);
        hideGroup('Hệ thống');
    }
    
    // Render role badge if element exists
    const roleBadge = document.getElementById('user-role-badge');
    if (roleBadge) {
        let roleName = currentRole === 'admin' ? 'Quản trị viên' : (currentRole === 'manager' ? 'Quản lý' : 'Nhân viên');
        roleBadge.innerHTML = `<i class="fas fa-id-badge mr-1"></i>${roleName}`;
    }
}

// Set active nav link
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop().split('?')[0];
    // Fix: the HTML uses .sidebar-item not .nav-link
    const navLinks = document.querySelectorAll('.sidebar-item, .nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        // Match base logic for POS pages also
        if (linkPage === currentPage || (currentPage.includes('admin-pos') && linkPage.includes('admin-pos'))) {
            // Apply active styles to generic theme items
            link.classList.remove('text-slate-500');
            link.classList.add('active'); // active comes with css styling
        } else {
            link.classList.remove('active');
        }
    });
}

// Initialize admin layout - with delay to ensure DOM is ready
function initAdminLayout() {
    console.log('🔧 Initializing admin layout...');

    // Wait for session to be ready
    setTimeout(async () => {
        console.log('📋 Loading admin info...');
        const adminData = await loadAdminInfo();
        if (adminData) {
            applyRBAC(adminData);
        }
        setActiveNavLink();
    }, 200);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminLayout);
} else {
    // DOM already loaded
    initAdminLayout();
}

// Export functions
window.loadAdminInfo = loadAdminInfo;
window.logout = logout;
window.toggleSidebar = toggleSidebar;
window.initAdminLayout = initAdminLayout;

