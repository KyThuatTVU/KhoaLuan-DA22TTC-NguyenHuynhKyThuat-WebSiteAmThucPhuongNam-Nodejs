// Kiểm tra xác thực admin bằng session
async function checkAdminAuth() {
    try {
        const response = await fetch('http://localhost:3000/api/admin-auth/check-session', {
            method: 'GET',
            credentials: 'include' // Quan trọng: gửi cookie session
        });

        const result = await response.json();

        if (!result.isAuthenticated) {
            // Chưa đăng nhập, chuyển về trang đăng nhập
            window.location.href = '/admin/dang-nhap-admin.html?error=unauthorized';
            return false;
        }

        // Đã đăng nhập, trả về thông tin admin
        return result.data;

    } catch (error) {
        console.error('Lỗi kiểm tra xác thực:', error);
        window.location.href = '/admin/dang-nhap-admin.html?error=auth_failed';
        return false;
    }
}

// Đăng xuất admin
async function logoutAdmin() {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/admin-auth/logout', {
            method: 'POST',
            credentials: 'include' // Gửi cookie session
        });

        const result = await response.json();

        if (result.success) {
            // Chuyển về trang đăng nhập
            window.location.href = '/admin/dang-nhap-admin.html?logout=success';
        } else {
            alert('Lỗi đăng xuất. Vui lòng thử lại!');
        }

    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        alert('Lỗi đăng xuất. Vui lòng thử lại!');
    }
}

// Export functions
window.checkAdminAuth = checkAdminAuth;
window.logoutAdmin = logoutAdmin;

// Tự động kiểm tra khi load trang admin (trừ trang đăng nhập)
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('dang-nhap-admin.html');
    const isAdminPage = currentPath.includes('/admin/');
    
    // Chỉ check auth nếu là trang admin và KHÔNG phải trang đăng nhập
    if (isAdminPage && !isLoginPage) {
        checkAdminAuth();
    }
});
