-- ============================================================
-- DATABASE: amthuc_phuongnam (STAFF MANAGEMENT MODULE)
-- Chức năng: Quản lý nhân sự, Phân quyền, Ca làm việc, Chấm công, Bảng lương
-- ============================================================

USE `amthuc_phuongnam`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Bảng Vai trò Hệ thống (Roles)
DROP TABLE IF EXISTS `vai_tro_he_thong`;
CREATE TABLE `vai_tro_he_thong` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_vai_tro` varchar(100) NOT NULL UNIQUE,
  `mo_ta` varchar(255),
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vai_tro_he_thong` (`ten_vai_tro`, `mo_ta`) VALUES
('admin', 'Quản trị viên toàn hệ thống'),
('manager', 'Quản lý cửa hàng'),
('receptionist', 'Thu ngân / Lễ tân'),
('server', 'Nhân viên phục vụ'),
('chef', 'Đầu bếp'),
('security', 'Bảo vệ');

-- 2. Bảng Quyền hạn (Permissions)
DROP TABLE IF EXISTS `quyen_han`;
CREATE TABLE `quyen_han` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_quyen` varchar(100) NOT NULL UNIQUE,
  `mo_ta` varchar(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `quyen_han` (`ten_quyen`, `mo_ta`) VALUES
('view_dashboard', 'Xem tổng quan'),
('manage_products', 'Quản lý món ăn & danh mục'),
('manage_inventory', 'Quản lý kho nguyên liệu'),
('manage_orders', 'Quản lý đơn hàng'),
('manage_reservations', 'Quản lý đặt bàn'),
('manage_staff', 'Quản lý nhân sự & lương'),
('manage_customers', 'Quản lý khách hàng'),
('manage_settings', 'Cài đặt hệ thống');

-- 3. Bảng Quyền của Vai trò (Role Permissions)
DROP TABLE IF EXISTS `quyen_vai_tro`;
CREATE TABLE `quyen_vai_tro` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_role_perm_role` FOREIGN KEY (`role_id`) REFERENCES `vai_tro_he_thong` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_perm_perm` FOREIGN KEY (`permission_id`) REFERENCES `quyen_han` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Gán quyền cho Admin (Tất cả quyền)
INSERT INTO `quyen_vai_tro` (`role_id`, `permission_id`) 
SELECT 1, id FROM `quyen_han`;

-- Gán quyền cho Manager
INSERT INTO `quyen_vai_tro` (`role_id`, `permission_id`)
SELECT 2, id FROM `quyen_han` WHERE `ten_quyen` NOT IN ('manage_settings', 'manage_staff');

-- 4. Cập nhật bảng nhân viên (Thêm vai_tro_id và thông tin lương)
ALTER TABLE `nhan_vien` 
ADD COLUMN `vai_tro_id` int DEFAULT NULL AFTER `vai_tro`,
ADD COLUMN `luong_co_ban` decimal(14,2) DEFAULT 0 AFTER `so_dien_thoai`,
ADD COLUMN `luong_theo_gio` decimal(14,2) DEFAULT 0 AFTER `luong_co_ban`,
ADD COLUMN `ngay_vao_lam` date DEFAULT (CURRENT_DATE) AFTER `trang_thai`,
ADD COLUMN `anh_dai_dien` varchar(500) DEFAULT NULL AFTER `ten_nhan_vien`,
ADD CONSTRAINT `fk_nhanvien_role` FOREIGN KEY (`vai_tro_id`) REFERENCES `vai_tro_he_thong` (`id`) ON DELETE SET NULL;

-- Cập nhật Role ID cho nhân viên cũ dựa trên enum cũ
UPDATE `nhan_vien` SET `vai_tro_id` = 1 WHERE `vai_tro` = 'manager';
UPDATE `nhan_vien` SET `vai_tro_id` = 4 WHERE `vai_tro` = 'staff';

-- 5. Bảng Ca làm việc (Shifts)
DROP TABLE IF EXISTS `ca_lam_viec`;
CREATE TABLE `ca_lam_viec` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_ca` varchar(100) NOT NULL,
  `gio_bat_dau` time NOT NULL,
  `gio_ket_thuc` time NOT NULL,
  `he_so_luong` decimal(3,2) DEFAULT 1.00 COMMENT 'Hệ số lương ca đêm/lễ',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ca_lam_viec` (`ten_ca`, `gio_bat_dau`, `gio_ket_thuc`, `he_so_luong`) VALUES
('Ca sáng', '06:00:00', '14:00:00', 1.00),
('Ca chiều', '14:00:00', '22:00:00', 1.00),
('Ca đêm', '22:00:00', '06:00:00', 1.50),
('Ca gãy 1', '10:00:00', '14:00:00', 1.00),
('Ca gãy 2', '17:00:00', '22:00:00', 1.00);

-- 6. Bảng Phân ca (Shift Assignments)
DROP TABLE IF EXISTS `phan_ca`;
CREATE TABLE `phan_ca` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ma_nhan_vien` int NOT NULL,
  `ca_id` int NOT NULL,
  `ngay_lam_viec` date NOT NULL,
  `ghi_chu` varchar(255),
  CONSTRAINT `fk_phanca_nv` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `nhan_vien` (`ma_nhan_vien`) ON DELETE CASCADE,
  CONSTRAINT `fk_phanca_ca` FOREIGN KEY (`ca_id`) REFERENCES `ca_lam_viec` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Bảng Chấm công (Attendance)
DROP TABLE IF EXISTS `cham_cong`;
CREATE TABLE `cham_cong` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ma_nhan_vien` int NOT NULL,
  `ngay_lam` date NOT NULL,
  `gio_vao` datetime DEFAULT NULL,
  `gio_ra` datetime DEFAULT NULL,
  `trang_thai` enum('dung_gio', 'di_muon', 've_som', 'nghi_phep', 'nghi_khong_phep') DEFAULT 'dung_gio',
  `ghi_chu` text,
  CONSTRAINT `fk_chamcong_nv` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `nhan_vien` (`ma_nhan_vien`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Bảng Lương (Payroll)
DROP TABLE IF EXISTS `bang_luong`;
CREATE TABLE `bang_luong` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ma_nhan_vien` int NOT NULL,
  `thang` int NOT NULL,
  `nam` int NOT NULL,
  `tong_gio_lam` decimal(10,2) DEFAULT 0,
  `luong_co_ban` decimal(14,2) DEFAULT 0,
  `luong_lam_them` decimal(14,2) DEFAULT 0,
  `thuong` decimal(14,2) DEFAULT 0,
  `phat` decimal(14,2) DEFAULT 0,
  `tong_luong` decimal(14,2) NOT NULL,
  `trang_thai` enum('chua_thanh_toan', 'da_thanh_toan') DEFAULT 'chua_thanh_toan',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_luong_nv` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `nhan_vien` (`ma_nhan_vien`) ON DELETE CASCADE,
  UNIQUE KEY `unique_luong_thang_nam` (`ma_nhan_vien`, `thang`, `nam`)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- Thêm dữ liệu mẫu nhân viên chi tiết
UPDATE `nhan_vien` SET `luong_co_ban` = 15000000, `luong_theo_gio` = 0 WHERE `tai_khoan` = 'admin';
UPDATE `nhan_vien` SET `luong_co_ban` = 5000000, `luong_theo_gio` = 25000 WHERE `tai_khoan` = 'nhanvien1';
