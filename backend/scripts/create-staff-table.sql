-- Tạo bảng nhân viên cho hệ thống POS
CREATE TABLE IF NOT EXISTS `nhan_vien` (
  `ma_nhan_vien` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_nhan_vien` varchar(150) NOT NULL,
  `tai_khoan` varchar(100) UNIQUE NOT NULL,
  `mat_khau_hash` varchar(255) NOT NULL,
  `so_dien_thoai` varchar(20),
  `vai_tro` enum('staff','manager') DEFAULT 'staff' COMMENT 'staff: nhân viên order, manager: quản lý',
  `trang_thai` tinyint DEFAULT 1 COMMENT '1: hoạt động, 0: khóa',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm tài khoản quản lý mặc định (username: admin, password: admin123)
INSERT INTO `nhan_vien` (`ten_nhan_vien`, `tai_khoan`, `mat_khau_hash`, `vai_tro`) 
VALUES ('Quản lý', 'admin', '$2a$10$RqSKPhZuoHQK7vcXn8YsZ.GV5o9rRVpVFk7IzQhRShzXCxgeKFpbC', 'manager');

-- Thêm nhân viên mẫu (username: nhanvien1, password: 123456)
INSERT INTO `nhan_vien` (`ten_nhan_vien`, `tai_khoan`, `mat_khau_hash`, `so_dien_thoai`, `vai_tro`) 
VALUES ('Nguyễn Văn A', 'nhanvien1', '$2a$10$q3P908OACkk1poj9crlvGuiMaJn5NiDU2as/S8RssBhoOxRVx7YXe', '0901234567', 'staff');
