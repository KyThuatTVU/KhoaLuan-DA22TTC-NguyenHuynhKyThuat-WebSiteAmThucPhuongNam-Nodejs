# Hướng dẫn Setup Hệ thống Nhân viên POS

## 1. Tạo bảng nhân viên trong database

Chạy lệnh sau để tạo bảng `nhan_vien` và thêm tài khoản mặc định:

```bash
cd backend
node scripts/setup-staff-table.js
```

Hoặc chạy trực tiếp file SQL:

```bash
mysql -u root -p quanlynhahang < scripts/create-staff-table.sql
```

## 2. Tài khoản mặc định

Sau khi chạy script, bạn sẽ có 2 tài khoản:

### Quản lý
- Tài khoản: `admin`
- Mật khẩu: `admin123`
- Vai trò: `manager` (Full quyền)

### Nhân viên
- Tài khoản: `nhanvien1`
- Mật khẩu: `123456`
- Vai trò: `staff` (Chỉ order)

## 3. Cấu trúc bảng nhan_vien

```sql
CREATE TABLE `nhan_vien` (
  `ma_nhan_vien` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_nhan_vien` varchar(150) NOT NULL,
  `tai_khoan` varchar(100) UNIQUE NOT NULL,
  `mat_khau_hash` varchar(255) NOT NULL,
  `so_dien_thoai` varchar(20),
  `vai_tro` enum('staff','manager') DEFAULT 'staff',
  `trang_thai` tinyint DEFAULT 1,
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 4. API Endpoints

### Đăng nhập nhân viên
```
POST /api/staff/login
Body: { "tai_khoan": "admin", "mat_khau": "admin123" }
```

### Quản lý nhân viên (CRUD)
```
GET    /api/staff           - Lấy danh sách nhân viên
POST   /api/staff           - Thêm nhân viên mới
PUT    /api/staff/:id       - Cập nhật nhân viên
DELETE /api/staff/:id       - Xóa nhân viên (soft delete)
PUT    /api/staff/:id/password - Đổi mật khẩu
```

## 5. Giao diện quản lý

### Trang quản lý nhân viên (Admin)
```
http://localhost:3000/admin/staff.html
```
Chức năng:
- Xem danh sách nhân viên
- Thêm/sửa/xóa nhân viên
- Đổi mật khẩu nhân viên
- Phân quyền (staff/manager)
- Khóa/mở khóa tài khoản

### Trang đăng nhập POS
```
http://localhost:3000/admin/pos-login.html
```
Chức năng:
- Đăng nhập với tài khoản nhân viên
- Phân quyền tự động:
  - Nhân viên → pos-tables.html (Chọn bàn và order)
  - Quản lý → dashboard.html (Xem tổng quan, thống kê)

## 6. Phân quyền

### Nhân viên (staff)
- Chọn bàn
- Order món ăn
- Gửi order đến bếp
- Xem order hiện tại

### Quản lý (manager)
- Tất cả quyền của nhân viên
- Tính tiền và thanh toán
- In hóa đơn
- Xem thống kê doanh thu
- Quản lý nhân viên
- Kiểm kê tồn kho

## 7. Luồng hoạt động

1. Admin đăng nhập vào dashboard → Quản lý nhân viên → Tạo tài khoản cho nhân viên
2. Nhân viên đăng nhập tại `pos-login.html` với tài khoản được cấp
3. Hệ thống kiểm tra vai trò và chuyển hướng:
   - Staff → Giao diện order (pos-tables.html)
   - Manager → Dashboard quản lý (dashboard.html)
4. Nhân viên chọn bàn → Order món → Gửi bếp
5. Quản lý xem tổng quan, thống kê, tính tiền

## 8. Bảo mật

- Mật khẩu được hash bằng bcrypt (10 rounds)
- Kiểm tra vai trò khi đăng nhập
- Soft delete (không xóa hẳn khỏi database)
- Tài khoản có thể bị khóa (trang_thai = 0)
