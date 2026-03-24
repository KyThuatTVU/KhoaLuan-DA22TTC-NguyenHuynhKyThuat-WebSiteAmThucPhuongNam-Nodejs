const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createAdmin() {
    try {
        console.log('🔧 Đang tạo tài khoản admin...\n');

        // Thông tin admin mặc định
        const adminAccounts = [
            {
                tai_khoan: 'admin',
                mat_khau: 'admin123',
                ten_hien_thi: 'Administrator',
                email: 'admin@phuongnam.vn',
                quyen: 'superadmin'
            },
            {
                tai_khoan: 'manager',
                mat_khau: 'manager123',
                ten_hien_thi: 'Manager',
                email: 'manager@phuongnam.vn',
                quyen: 'admin'
            }
        ];

        for (const admin of adminAccounts) {
            // Kiểm tra admin đã tồn tại chưa
            const [existing] = await db.query(
                'SELECT tai_khoan FROM admin WHERE tai_khoan = ?',
                [admin.tai_khoan]
            );

            if (existing.length > 0) {
                console.log(`⚠️  Admin "${admin.tai_khoan}" đã tồn tại, bỏ qua...`);
                continue;
            }

            // Hash mật khẩu
            const mat_khau_hash = await bcrypt.hash(admin.mat_khau, 10);

            // Tạo admin
            await db.query(
                `INSERT INTO admin (tai_khoan, mat_khau_hash, ten_hien_thi, email, quyen) 
                 VALUES (?, ?, ?, ?, ?)`,
                [admin.tai_khoan, mat_khau_hash, admin.ten_hien_thi, admin.email, admin.quyen]
            );

            console.log(`✅ Đã tạo admin: ${admin.tai_khoan}`);
            console.log(`   - Tài khoản: ${admin.tai_khoan}`);
            console.log(`   - Mật khẩu: ${admin.mat_khau}`);
            console.log(`   - Quyền: ${admin.quyen}\n`);
        }

        console.log('🎉 Hoàn tất tạo tài khoản admin!');
        console.log('\n📝 Thông tin đăng nhập:');
        console.log('   URL: http://localhost:3000/admin/dang-nhap-admin.html');
        console.log('   Tài khoản: admin / admin123');
        console.log('   Hoặc: manager / manager123\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

createAdmin();
