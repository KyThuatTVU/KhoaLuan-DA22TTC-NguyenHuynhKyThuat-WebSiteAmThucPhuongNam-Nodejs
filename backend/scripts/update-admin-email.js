const db = require('../config/database');

async function updateAdminEmail() {
    try {
        console.log('🔧 Cập nhật Email Google cho Admin\n');

        // Lấy email từ command line argument
        const args = process.argv.slice(2);
        const adminId = args[0];
        const googleEmail = args[1];

        if (!adminId || !googleEmail) {
            console.log('❌ Cách sử dụng: node scripts/update-admin-email.js <admin_id> <google_email>');
            console.log('\nVí dụ: node scripts/update-admin-email.js 6 your-email@gmail.com\n');
            
            // Hiển thị danh sách admin
            const [admins] = await db.query('SELECT ma_admin, tai_khoan, ten_hien_thi, email, quyen FROM admin');
            
            console.log('📋 Danh sách Admin hiện có:');
            console.log('─────────────────────────────────────────────────────────────');
            admins.forEach(admin => {
                console.log(`ID: ${admin.ma_admin} | Tài khoản: ${admin.tai_khoan} | Tên: ${admin.ten_hien_thi}`);
                console.log(`   Email: ${admin.email || '(chưa có)'} | Quyền: ${admin.quyen}`);
                console.log('─────────────────────────────────────────────────────────────');
            });
            
            process.exit(1);
        }

        // Validate email
        if (!googleEmail.includes('@')) {
            console.log('❌ Email không hợp lệ!');
            process.exit(1);
        }

        // Kiểm tra admin tồn tại
        const [admin] = await db.query('SELECT * FROM admin WHERE ma_admin = ?', [adminId]);
        if (admin.length === 0) {
            console.log('❌ Không tìm thấy admin với ID:', adminId);
            process.exit(1);
        }

        // Kiểm tra email đã được sử dụng chưa
        const [existing] = await db.query('SELECT ma_admin FROM admin WHERE email = ? AND ma_admin != ?', [googleEmail, adminId]);
        if (existing.length > 0) {
            console.log('❌ Email này đã được sử dụng bởi admin khác!');
            process.exit(1);
        }

        // Cập nhật email
        await db.query('UPDATE admin SET email = ? WHERE ma_admin = ?', [googleEmail, adminId]);
        
        console.log('✅ Đã cập nhật email Google cho admin!');
        console.log(`👤 Tài khoản: ${admin[0].tai_khoan}`);
        console.log(`📝 Tên: ${admin[0].ten_hien_thi}`);
        console.log(`📧 Email mới: ${googleEmail}`);
        console.log(`🔐 Quyền: ${admin[0].quyen}`);
        
        console.log('\n📋 Hướng dẫn sử dụng:');
        console.log('1. Cấu hình Google OAuth trong .env:');
        console.log('   GOOGLE_CLIENT_ID=your_client_id');
        console.log('   GOOGLE_CLIENT_SECRET=your_client_secret');
        console.log('2. Truy cập: http://localhost:3000/admin/dang-nhap-admin.html');
        console.log('3. Click "Đăng nhập với Google"');
        console.log('4. Chọn tài khoản:', googleEmail);
        console.log('5. Đăng nhập thành công!\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

updateAdminEmail();
