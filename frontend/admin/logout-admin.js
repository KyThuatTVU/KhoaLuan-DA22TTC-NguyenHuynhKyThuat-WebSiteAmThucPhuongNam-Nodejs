// Script để đăng xuất admin và xóa session Google
function logoutAdmin() {
    // Xóa token và thông tin admin
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    
    // Xóa session Google (nếu có)
    // Chuyển về trang đăng nhập
    window.location.href = '/admin/dang-nhap-admin.html?logout=success';
}

// Export function
window.logoutAdmin = logoutAdmin;
