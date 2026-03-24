// Kiểm tra xác thực admin bằng session
async function checkAdminAuth() {
    try {
        const response = await fetch('http://localhost:3000/api/admin-auth/check-session', {
            method: 'GET',
            credentials: 'include' // Quan trọng: gửi cookie session
        });

        const result = await response.json();
        
        console.log('🔍 Check auth result:', result);

        if (!result.isAuthenticated) {
            console.log('❌ Not authenticated');
            return false;
        }

        // Đã đăng nhập, trả về thông tin admin
        console.log('✅ Authenticated:', result.data?.email || result.user?.email);
        return result.data || result.user;

    } catch (error) {
        console.error('Lỗi kiểm tra xác thực:', error);
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
            window.location.href = 'dang-nhap-admin.html?logout=success';
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

// KHÔNG tự động kiểm tra khi load trang - để admin-layout.js xử lý
// Tránh xung đột và redirect loop
// document.addEventListener('DOMContentLoaded', async function() {
//     // Logic đã được chuyển sang admin-layout.js
// });

// Hàm cập nhật thông tin admin trên UI
function updateAdminUI(user) {
    // Cập nhật avatar
    const avatarElements = document.querySelectorAll('#admin-avatar, #admin-avatar-header');
    avatarElements.forEach(el => {
        if (el && user.avatar) {
            el.src = user.avatar;
        }
    });
    
    // Cập nhật tên
    const nameElements = document.querySelectorAll('#admin-name, #admin-name-header');
    nameElements.forEach(el => {
        if (el && user.name) {
            el.textContent = user.name;
        }
    });
    
    // Cập nhật email
    const emailElement = document.getElementById('admin-email');
    if (emailElement && user.email) {
        emailElement.textContent = user.email;
    }
    
    console.log('✅ Admin UI updated');
}
