-- ============================================================
-- DATABASE: amthuc_phuongnam (FULL RESTORE SCRIPT - 40 TABLES)
-- Cấu trúc: Hệ thống lõi + Nhà hàng + AI + Social + Chatbot
-- ============================================================

CREATE DATABASE IF NOT EXISTS `amthuc_phuongnam` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `amthuc_phuongnam`;

-- Tắt kiểm tra khóa ngoại để khởi tạo bảng không bị lỗi thứ tự
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- 1. Bảng: admin (Quản trị viên)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `ma_admin` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tai_khoan` varchar(100) UNIQUE NOT NULL,
  `mat_khau_hash` varchar(255) NOT NULL,
  `ten_hien_thi` varchar(150),
  `email` varchar(255),
  `anh_dai_dien` varchar(500),
  `quyen` varchar(100) DEFAULT 'superadmin',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 2. Bảng: danh_muc (Danh mục món ăn)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `danh_muc`;
CREATE TABLE `danh_muc` (
  `ma_danh_muc` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_danh_muc` varchar(150) NOT NULL,
  `mo_ta` text,
  `trang_thai` tinyint DEFAULT 1,
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 3. Bảng: nguoi_dung (Khách hàng)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `nguoi_dung`;
CREATE TABLE `nguoi_dung` (
  `ma_nguoi_dung` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_nguoi_dung` varchar(150) NOT NULL,
  `email` varchar(255) UNIQUE NOT NULL,
  `so_dien_thoai` varchar(20),
  `mat_khau_hash` varchar(255),
  `dia_chi` varchar(300),
  `gioi_tinh` enum('khac','nam','nu') DEFAULT 'khac',
  `anh_dai_dien` varchar(500),
  `google_id` varchar(255),
  `trang_thai` tinyint DEFAULT 1,
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
VALUES ('Quản lý', 'admin', '$2a$10$YourHashedPasswordHere', 'manager');

-- Thêm nhân viên mẫu (username: nhanvien1, password: 123456)
INSERT INTO `nhan_vien` (`ten_nhan_vien`, `tai_khoan`, `mat_khau_hash`, `so_dien_thoai`, `vai_tro`) 
VALUES ('Nguyễn Văn A', 'nhanvien1', '$2a$10$YourHashedPasswordHere', '0901234567', 'staff');

-- --------------------------------------------------------
-- 4. Bảng: mon_an (Thực đơn)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mon_an`;
CREATE TABLE `mon_an` (
  `ma_mon` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_mon` varchar(200) NOT NULL,
  `mo_ta_chi_tiet` text,
  `gia_tien` decimal(12,2) NOT NULL,
  `gia_khuyen_mai` decimal(12,2) DEFAULT NULL,
  `so_luong_ton` int DEFAULT 0,
  `don_vi_tinh` varchar(50) DEFAULT 'suất',
  `anh_mon` varchar(500),
  `ma_danh_muc` int NOT NULL,
  `is_featured` tinyint DEFAULT 0,
  `trang_thai` tinyint DEFAULT 1,
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_mon_an_danhmuc` FOREIGN KEY (`ma_danh_muc`) REFERENCES `danh_muc` (`ma_danh_muc`)
) ENGINE=InnoDB;

-- Lệnh thêm cột dinh_luong vào bảng mon_an
ALTER TABLE `mon_an` 
ADD COLUMN `dinh_luong` VARCHAR(50) DEFAULT NULL 
AFTER `gia_tien`;

DESCRIBE `mon_an`;


-- --------------------------------------------------------
-- 5. Bảng: ban (Bàn vật lý trong nhà hàng)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ban`;
CREATE TABLE `ban` (
  `ma_ban` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_ban` varchar(50) NOT NULL,
  `so_cho` int DEFAULT 4,
  `vi_tri` varchar(100) COMMENT 'Tầng 1, Sân vườn...',
  `trang_thai` enum('trong','dang_phuc_vu','da_dat') DEFAULT 'trong'
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 6. Bảng: gio_hang (Giỏ hàng Online)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `gio_hang`;
CREATE TABLE `gio_hang` (
  `ma_gio_hang` int AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int NOT NULL,
  `thoi_gian_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('active','ordered','abandoned') DEFAULT 'active',
  CONSTRAINT `fk_giohang_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 7. Bảng: chi_tiet_gio_hang
-- --------------------------------------------------------
DROP TABLE IF EXISTS `chi_tiet_gio_hang`;
CREATE TABLE `chi_tiet_gio_hang` (
  `ma_chi_tiet` int AUTO_INCREMENT PRIMARY KEY,
  `ma_gio_hang` int NOT NULL,
  `ma_mon` int NOT NULL,
  `so_luong` int DEFAULT 1,
  `gia_tai_thoi_diem` decimal(12,2),
  CONSTRAINT `fk_ctgiohang_gio` FOREIGN KEY (`ma_gio_hang`) REFERENCES `gio_hang` (`ma_gio_hang`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctgiohang_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 8. Bảng: don_hang (Đơn hàng Online/Giao đi)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `don_hang`;
CREATE TABLE `don_hang` (
  `ma_don_hang` int AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int,
  `ten_khach_vang_lai` varchar(150),
  `so_dt_khach` varchar(20),
  `dia_chi_giao` varchar(300),
  `tong_tien` decimal(14,2) NOT NULL,
  `tien_giam_gia` decimal(14,2) DEFAULT 0,
  `phuong_thuc_thanh_toan` varchar(50) DEFAULT 'cod',
  `trang_thai` enum('pending','confirmed','preparing','delivered','cancelled') DEFAULT 'pending',
  `ma_khuyen_mai` varchar(50),
  `ghi_chu` text,
  `thoi_gian_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_donhang_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 9. Bảng: chi_tiet_don_hang
-- --------------------------------------------------------
DROP TABLE IF EXISTS `chi_tiet_don_hang`;
CREATE TABLE `chi_tiet_don_hang` (
  `ma_ct_don` int AUTO_INCREMENT PRIMARY KEY,
  `ma_don_hang` int NOT NULL,
  `ma_mon` int NOT NULL,
  `so_luong` int NOT NULL,
  `gia_tai_thoi_diem` decimal(12,2),
  CONSTRAINT `fk_ctdon_don` FOREIGN KEY (`ma_don_hang`) REFERENCES `don_hang` (`ma_don_hang`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctdon_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 10. Bảng: order_nha_hang (Order Offline tại bàn)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `order_nha_hang`;
CREATE TABLE `order_nha_hang` (
  `ma_order` int AUTO_INCREMENT PRIMARY KEY,
  `ma_ban` int NOT NULL,
  `ma_nhan_vien` int COMMENT 'ID Admin/Nhân viên phục vụ',
  `tong_tien` decimal(14,2) DEFAULT 0,
  `trang_thai` enum('dang_phuc_vu','da_thanh_toan','huy') DEFAULT 'dang_phuc_vu',
  `thoi_gian_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_order_ban` FOREIGN KEY (`ma_ban`) REFERENCES `ban` (`ma_ban`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 11. Bảng: chi_tiet_order_nha_hang
-- --------------------------------------------------------
DROP TABLE IF EXISTS `chi_tiet_order_nha_hang`;
CREATE TABLE `chi_tiet_order_nha_hang` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `ma_order` int NOT NULL,
  `ma_mon` int NOT NULL,
  `so_luong` int NOT NULL,
  `gia` decimal(12,2),
  CONSTRAINT `fk_ctorder_order` FOREIGN KEY (`ma_order`) REFERENCES `order_nha_hang` (`ma_order`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctorder_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 12. Bảng: dat_ban (Đặt bàn trước)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `dat_ban`;
CREATE TABLE `dat_ban` (
  `ma_dat_ban` int AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int,
  `ma_ban` int COMMENT 'Bàn được gán sau khi confirm',
  `ten_nguoi_dat` varchar(150) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `so_luong_nguoi` int NOT NULL,
  `ngay_dat` date NOT NULL,
  `gio_den` time NOT NULL,
  `trang_thai` enum('pending','confirmed','attended','cancelled') DEFAULT 'pending',
  `tong_tien_du_kien` decimal(14,2) DEFAULT 0,
  `ghi_chu` text,
  `thoi_gian_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_datban_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL,
  CONSTRAINT `fk_datban_ban` FOREIGN KEY (`ma_ban`) REFERENCES `ban` (`ma_ban`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 13. Bảng: chi_tiet_dat_ban
-- --------------------------------------------------------
DROP TABLE IF EXISTS `chi_tiet_dat_ban`;
CREATE TABLE `chi_tiet_dat_ban` (
  `ma_chi_tiet` int AUTO_INCREMENT PRIMARY KEY,
  `ma_dat_ban` int NOT NULL,
  `ma_mon` int NOT NULL,
  `so_luong` int DEFAULT 1,
  `gia_tai_thoi_diem` decimal(12,2),
  CONSTRAINT `fk_ctdatban_dat` FOREIGN KEY (`ma_dat_ban`) REFERENCES `dat_ban` (`ma_dat_ban`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctdatban_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 14. Bảng: thanh_toan
-- --------------------------------------------------------
DROP TABLE IF EXISTS `thanh_toan`;
CREATE TABLE `thanh_toan` (
  `ma_thanh_toan` int AUTO_INCREMENT PRIMARY KEY,
  `ma_don_hang` int DEFAULT NULL,
  `ma_order_nha_hang` int DEFAULT NULL,
  `so_tien` decimal(14,2) NOT NULL,
  `phuong_thuc` varchar(50) COMMENT 'momo, vnpay, cash...',
  `ma_giao_dich` varchar(255),
  `trang_thai` enum('pending','success','failed','cancelled') DEFAULT 'pending',
  `thoi_gian_thanh_toan` datetime,
  `thong_tin_them` text
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 15. Bảng: hoa_don
-- --------------------------------------------------------
DROP TABLE IF EXISTS `hoa_don`;
CREATE TABLE `hoa_don` (
  `ma_hoa_don` int AUTO_INCREMENT PRIMARY KEY,
  `ma_don_hang` int DEFAULT NULL,
  `ma_order_nha_hang` int DEFAULT NULL,
  `ma_thanh_toan` int,
  `ma_nguoi_dat` int,
  `tong_tien` decimal(14,2) NOT NULL,
  `thoi_diem_xuat` datetime DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('issued','cancelled') DEFAULT 'issued'
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 16. Bảng: chi_tiet_hoa_don
-- --------------------------------------------------------
DROP TABLE IF EXISTS `chi_tiet_hoa_don`;
CREATE TABLE `chi_tiet_hoa_don` (
  `ma_ct_hoa_don` int AUTO_INCREMENT PRIMARY KEY,
  `ma_hoa_don` int NOT NULL,
  `ma_mon` int NOT NULL,
  `ten_mon` varchar(200),
  `so_luong` int,
  `don_gia` decimal(12,2),
  `thanh_tien` decimal(14,2),
  CONSTRAINT `fk_cthoadon_hoa` FOREIGN KEY (`ma_hoa_don`) REFERENCES `hoa_don` (`ma_hoa_don`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 17. Bảng: tin_tuc
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tin_tuc`;
CREATE TABLE `tin_tuc` (
  `ma_tin_tuc` int AUTO_INCREMENT PRIMARY KEY,
  `tieu_de` varchar(255) NOT NULL,
  `tom_tat` text,
  `noi_dung` longtext,
  `anh_dai_dien` varchar(500),
  `ma_admin_dang` int,
  `luot_xem` int DEFAULT 0,
  `trang_thai` tinyint DEFAULT 1,
  `ngay_dang` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tintuc_admin` FOREIGN KEY (`ma_admin_dang`) REFERENCES `admin` (`ma_admin`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 18. Bảng: binh_luan_tin_tuc
-- --------------------------------------------------------
DROP TABLE IF EXISTS `binh_luan_tin_tuc`;
CREATE TABLE `binh_luan_tin_tuc` (
  `ma_binh_luan` int AUTO_INCREMENT PRIMARY KEY,
  `ma_tin_tuc` int NOT NULL,
  `ma_nguoi_dung` int,
  `ten_nguoi_binh_luan` varchar(150),
  `noi_dung` text NOT NULL,
  `trang_thai` enum('pending','approved','rejected') DEFAULT 'pending',
  `ma_binh_luan_cha` int,
  `ngay_binh_luan` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_binhluan_tin` FOREIGN KEY (`ma_tin_tuc`) REFERENCES `tin_tuc` (`ma_tin_tuc`) ON DELETE CASCADE,
  CONSTRAINT `fk_binhluan_cha` FOREIGN KEY (`ma_binh_luan_cha`) REFERENCES `binh_luan_tin_tuc` (`ma_binh_luan`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 19. Bảng: cam_xuc_tin_tuc
-- --------------------------------------------------------
DROP TABLE IF EXISTS `cam_xuc_tin_tuc`;
CREATE TABLE `cam_xuc_tin_tuc` (
  `ma_cam_xuc` int AUTO_INCREMENT PRIMARY KEY,
  `ma_tin_tuc` int NOT NULL,
  `ma_nguoi_dung` int NOT NULL,
  `loai_cam_xuc` enum('like','love','haha','wow','sad','angry'),
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`ma_tin_tuc`, `ma_nguoi_dung`),
  CONSTRAINT `fk_cx_tin` FOREIGN KEY (`ma_tin_tuc`) REFERENCES `tin_tuc` (`ma_tin_tuc`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 20. Bảng: cam_xuc_binh_luan
-- --------------------------------------------------------
DROP TABLE IF EXISTS `cam_xuc_binh_luan`;
CREATE TABLE `cam_xuc_binh_luan` (
  `ma_cam_xuc` int AUTO_INCREMENT PRIMARY KEY,
  `ma_binh_luan` int NOT NULL,
  `ma_nguoi_dung` int NOT NULL,
  `loai_cam_xuc` varchar(20) DEFAULT 'like',
  CONSTRAINT `fk_cx_binhluan` FOREIGN KEY (`ma_binh_luan`) REFERENCES `binh_luan_tin_tuc` (`ma_binh_luan`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 21. Bảng: danh_gia_san_pham
-- --------------------------------------------------------
DROP TABLE IF EXISTS `danh_gia_san_pham`;
CREATE TABLE `danh_gia_san_pham` (
  `ma_danh_gia` int AUTO_INCREMENT PRIMARY KEY,
  `ma_mon` int NOT NULL,
  `ma_nguoi_dung` int NOT NULL,
  `so_sao` tinyint NOT NULL,
  `binh_luan` text,
  `hinh_anh` text,
  `trang_thai` enum('pending','approved','rejected') DEFAULT 'pending',
  `ngay_danh_gia` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_dg_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 22. Bảng: tra_loi_danh_gia
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tra_loi_danh_gia`;
CREATE TABLE `tra_loi_danh_gia` (
  `ma_tra_loi` int AUTO_INCREMENT PRIMARY KEY,
  `ma_danh_gia` int NOT NULL,
  `noi_dung` text NOT NULL,
  `ten_admin` varchar(150) DEFAULT 'Admin',
  `ngay_tra_loi` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tl_dg` FOREIGN KEY (`ma_danh_gia`) REFERENCES `danh_gia_san_pham` (`ma_danh_gia`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 23. Bảng: khuyen_mai
-- --------------------------------------------------------
DROP TABLE IF EXISTS `khuyen_mai`;
CREATE TABLE `khuyen_mai` (
  `ma_khuyen_mai` int AUTO_INCREMENT PRIMARY KEY,
  `ma_code` varchar(50) UNIQUE NOT NULL,
  `mo_ta` text,
  `gia_tri` decimal(10,2) NOT NULL,
  `loai_giam_gia` enum('percentage','fixed_amount') NOT NULL,
  `don_hang_toi_thieu` decimal(12,2) DEFAULT 0,
  `giam_toi_da` decimal(12,2) DEFAULT NULL,
  `ngay_bat_dau` datetime NOT NULL,
  `ngay_ket_thuc` datetime NOT NULL,
  `so_luong_gioi_han` int,
  `so_luong_da_dung` int DEFAULT 0,
  `trang_thai` tinyint DEFAULT 1
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 24. Bảng: album_anh (Thư viện ảnh chung)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `album_anh`;
CREATE TABLE `album_anh` (
  `ma_album` int AUTO_INCREMENT PRIMARY KEY,
  `duong_dan_anh` varchar(500) NOT NULL,
  `loai_anh` varchar(100),
  `mo_ta` varchar(255),
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 25. Bảng: anh_san_pham
-- --------------------------------------------------------
DROP TABLE IF EXISTS `anh_san_pham`;
CREATE TABLE `anh_san_pham` (
  `ma_anh` int AUTO_INCREMENT PRIMARY KEY,
  `ma_mon` int NOT NULL,
  `duong_dan_anh` varchar(500) NOT NULL,
  CONSTRAINT `fk_anh_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 26. Bảng: lien_he
-- --------------------------------------------------------
DROP TABLE IF EXISTS `lien_he`;
CREATE TABLE `lien_he` (
  `ma_lien_he` int AUTO_INCREMENT PRIMARY KEY,
  `ho_ten` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `so_dien_thoai` varchar(20),
  `tieu_de` varchar(255),
  `noi_dung` text NOT NULL,
  `trang_thai` enum('new','read','replied') DEFAULT 'new',
  `ngay_gui` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 27. Bảng: cai_dat (Cấu hình hệ thống)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `cai_dat`;
CREATE TABLE `cai_dat` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `setting_key` varchar(100) UNIQUE NOT NULL,
  `setting_value` text,
  `mo_ta` varchar(255),
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 28. Bảng: du_lieu_tim_kiem (Phân tích từ khóa khách tìm)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `du_lieu_tim_kiem`;
CREATE TABLE `du_lieu_tim_kiem` (
  `ma_tim_kiem` bigint AUTO_INCREMENT PRIMARY KEY,
  `tu_khoa` varchar(255) NOT NULL,
  `ma_nguoi_dung` int,
  `thoi_gian_tim` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_timkiem_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 29. Bảng: email_verification
-- --------------------------------------------------------
DROP TABLE IF EXISTS `email_verification`;
CREATE TABLE `email_verification` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(255) NOT NULL,
  `verification_code` varchar(6) NOT NULL,
  `user_data` text COMMENT 'Lưu tạm JSON thông tin đăng ký',
  `expires_at` datetime NOT NULL,
  `is_verified` tinyint DEFAULT 0
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 30. Bảng: lich_su_chat (Chat trực tiếp với CSKH)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `lich_su_chat`;
CREATE TABLE `lich_su_chat` (
  `ma_tin_nhan` int AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int,
  `userchat` varchar(150),
  `noi_dung_chat` text NOT NULL,
  `thoi_diem_chat` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chat_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 31. Bảng: lich_su_chatbot (Lịch sử AI Bot)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `lich_su_chatbot`;
CREATE TABLE `lich_su_chatbot` (
  `ma_tin_nhan` int AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int,
  `session_id` varchar(100),
  `nguoi_gui` enum('user','bot') NOT NULL,
  `noi_dung` text NOT NULL,
  `thoi_diem_chat` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chatbot_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 32. Bảng: lich_su_trang_thai_don_hang
-- --------------------------------------------------------
DROP TABLE IF EXISTS `lich_su_trang_thai_don_hang`;
CREATE TABLE `lich_su_trang_thai_don_hang` (
  `ma_lich_su` int AUTO_INCREMENT PRIMARY KEY,
  `ma_don_hang` int NOT NULL,
  `trang_thai_cu` varchar(50),
  `trang_thai_moi` varchar(50) NOT NULL,
  `nguoi_thay_doi` varchar(150),
  `ghi_chu` text,
  `thoi_gian_thay_doi` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ls_donhang` FOREIGN KEY (`ma_don_hang`) REFERENCES `don_hang` (`ma_don_hang`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 33. Bảng: password_reset
-- --------------------------------------------------------
DROP TABLE IF EXISTS `password_reset`;
CREATE TABLE `password_reset` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `expired_at` datetime NOT NULL,
  `da_su_dung` tinyint DEFAULT 0,
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 34. Bảng: hanh_vi_nguoi_dung (Dữ liệu cho AI)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `hanh_vi_nguoi_dung`;
CREATE TABLE `hanh_vi_nguoi_dung` (
  `id` bigint AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int,
  `ma_mon` int,
  `hanh_vi` enum('view','click','add_to_cart','purchase') NOT NULL,
  `thoi_gian` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_hv_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE,
  CONSTRAINT `fk_hv_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 35. Bảng: user_embedding (AI - Vector sở thích)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `user_embedding`;
CREATE TABLE `user_embedding` (
  `ma_nguoi_dung` int PRIMARY KEY,
  `vector` JSON NOT NULL,
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_emb_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 36. Bảng: mon_an_embedding (AI - Vector đặc trưng món)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mon_an_embedding`;
CREATE TABLE `mon_an_embedding` (
  `ma_mon` int PRIMARY KEY,
  `vector` JSON NOT NULL,
  CONSTRAINT `fk_emb_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 37. Bảng: goi_y_san_pham (Kết quả gợi ý từ AI)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `goi_y_san_pham`;
CREATE TABLE `goi_y_san_pham` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `ma_nguoi_dung` int NOT NULL,
  `ma_mon` int NOT NULL,
  `diem` float COMMENT 'Điểm tương quan AI',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_goiy_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 38. Bảng: tri_thuc_chatbot (RAG Knowledge Base)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tri_thuc_chatbot`;
CREATE TABLE `tri_thuc_chatbot` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tieu_de` varchar(255) NOT NULL,
  `noi_dung` text NOT NULL,
  `embedding` JSON,
  `loai` enum('san_pham','khuyen_mai','faq','chinh_sach') DEFAULT 'faq',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 39. Bảng: chatbot_session
-- --------------------------------------------------------
DROP TABLE IF EXISTS `chatbot_session`;
CREATE TABLE `chatbot_session` (
  `session_id` varchar(100) PRIMARY KEY,
  `ma_nguoi_dung` int,
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_session_user` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 40. Bảng: thong_ke_ngay
-- --------------------------------------------------------
DROP TABLE IF EXISTS `thong_ke_ngay`;
CREATE TABLE `thong_ke_ngay` (
  `ngay` date PRIMARY KEY,
  `tong_don_online` int DEFAULT 0,
  `tong_order_tai_ban` int DEFAULT 0,
  `tong_doanh_thu` decimal(14,2) DEFAULT 0,
  `mon_ban_chay_nhat` int,
  CONSTRAINT `fk_tk_mon` FOREIGN KEY (`mon_ban_chay_nhat`) REFERENCES `mon_an` (`ma_mon`)
) ENGINE=InnoDB;


-- Thêm tính năng quản lý nguyên liệu (hệ thống nhà hàng)

-- 1. Bảng nguyen_lieu (Kho tập trung)
CREATE TABLE IF NOT EXISTS `nguyen_lieu` (
  `ma_nguyen_lieu` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_nguyen_lieu` varchar(150) NOT NULL UNIQUE,
  `so_luong_ton` decimal(10, 2) NOT NULL DEFAULT 0,
  `don_vi_tinh` varchar(50) NOT NULL COMMENT 'Gram, Kg, Lít, ML, Cái, Bịch...',
  `muc_canh_bao` decimal(10, 2) NOT NULL DEFAULT 1000 COMMENT 'Cảnh báo khi thấp hơn mức này',
  `trang_thai` tinyint DEFAULT 1,
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng cong_thuc (Định mức tiêu hao cho mỗi món ăn)
CREATE TABLE IF NOT EXISTS `cong_thuc` (
  `ma_cong_thuc` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ma_mon` int NOT NULL,
  `ma_nguyen_lieu` int NOT NULL,
  `so_luong_can` decimal(10, 2) NOT NULL COMMENT 'Lượng nguyên liệu cần để tạo ra 1 món ăn',
  CONSTRAINT `fk_congthuc_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`) ON DELETE CASCADE,
  CONSTRAINT `fk_congthuc_nguyenlieu` FOREIGN KEY (`ma_nguyen_lieu`) REFERENCES `nguyen_lieu` (`ma_nguyen_lieu`) ON DELETE CASCADE,
  UNIQUE KEY `unique_mon_nguyen_lieu` (`ma_mon`, `ma_nguyen_lieu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Bảng nha_cung_cap
CREATE TABLE IF NOT EXISTS `nha_cung_cap` (
  `ma_nha_cung_cap` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_nha_cung_cap` varchar(255) NOT NULL,
  `so_dien_thoai` varchar(20),
  `email` varchar(100),
  `dia_chi` text,
  `ghi_chu` text,
  `trang_thai` enum('dang_hop_tac', 'ngung_hop_tac') DEFAULT 'dang_hop_tac',
  `ngay_tao` datetime DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Cập nhật bảng nguyen_lieu để quản lý giá và nhà cung cấp
-- 2. Thủ tục kiểm tra và thêm cột nếu chưa tồn tại
DELIMITER //

CREATE PROCEDURE AddColumnsIfNotExist()
BEGIN
    -- Kiểm tra cột ma_nha_cung_cap
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'nguyen_lieu' 
        AND COLUMN_NAME = 'ma_nha_cung_cap'
    ) THEN
        ALTER TABLE `nguyen_lieu` ADD COLUMN `ma_nha_cung_cap` int DEFAULT NULL;
        ALTER TABLE `nguyen_lieu` ADD CONSTRAINT `fk_nguyen_lieu_ncc` 
            FOREIGN KEY (`ma_nha_cung_cap`) REFERENCES `nha_cung_cap` (`ma_nha_cung_cap`) ON DELETE SET NULL;
    END IF;

    -- Kiểm tra cột gia_nhap_gan_nhat
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'nguyen_lieu' 
        AND COLUMN_NAME = 'gia_nhap_gan_nhat'
    ) THEN
        ALTER TABLE `nguyen_lieu` ADD COLUMN `gia_nhap_gan_nhat` decimal(12, 2) DEFAULT 0;
    END IF;
END //

DELIMITER ;

-- Chạy thủ tục
CALL AddColumnsIfNotExist();

-- Xóa thủ tục sau khi chạy
DROP PROCEDURE IF EXISTS AddColumnsIfNotExist;


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

-- Tính năng Quản lý Nhập hàng và Kiểm kê nguyên liệu

-- 1. Bảng phieu_nhap (Phiếu nhập hàng)
CREATE TABLE IF NOT EXISTS `phieu_nhap` (
  `ma_phieu_nhap` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `thoi_gian_nhap` datetime DEFAULT CURRENT_TIMESTAMP,
  `ma_nhan_vien` int DEFAULT NULL,
  `tong_tien` decimal(15, 2) DEFAULT 0,
  `ma_nha_cung_cap` int DEFAULT NULL,
  `nha_cung_cap` varchar(255) COMMENT 'Tên NCC (dùng khi không chọn từ danh sách)',
  `ghi_chu` text,
  `trang_thai` varchar(50) DEFAULT 'hoan_tat' COMMENT 'cho_duyet, hoan_tat, huy',
  CONSTRAINT `fk_phieunhap_nhanvien` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `nhan_vien` (`ma_nhan_vien`) ON DELETE SET NULL,
  CONSTRAINT `fk_phieunhap_ncc` FOREIGN KEY (`ma_nha_cung_cap`) REFERENCES `nha_cung_cap` (`ma_nha_cung_cap`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng chi_tiet_phieu_nhap (Chi tiết mặt hàng nhập)
CREATE TABLE IF NOT EXISTS `chi_tiet_phieu_nhap` (
  `ma_chi_tiet` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ma_phieu_nhap` int NOT NULL,
  `ma_nguyen_lieu` int NOT NULL,
  `so_luong_nhap` decimal(10, 2) NOT NULL,
  `don_gia` decimal(15, 2) NOT NULL,
  `don_vi_nhap` varchar(50),
  CONSTRAINT `fk_ctpn_phieunhap` FOREIGN KEY (`ma_phieu_nhap`) REFERENCES `phieu_nhap` (`ma_phieu_nhap`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctpn_nguyenlieu` FOREIGN KEY (`ma_nguyen_lieu`) REFERENCES `nguyen_lieu` (`ma_nguyen_lieu`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng kiem_ke (Phiếu kiểm kê)
CREATE TABLE IF NOT EXISTS `kiem_ke` (
  `ma_kiem_ke` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `thoi_gian_kiem_ke` datetime DEFAULT CURRENT_TIMESTAMP,
  `ma_nhan_vien` int DEFAULT NULL,
  `ghi_chu` text,
  `trang_thai` varchar(50) DEFAULT 'hoan_tat' COMMENT 'dang_kiem_ke, hoan_tat',
  CONSTRAINT `fk_kiemke_nhanvien` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `nhan_vien` (`ma_nhan_vien`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng chi_tiet_kiem_ke (Chi tiết mục kiểm kê)
CREATE TABLE IF NOT EXISTS `chi_tiet_kiem_ke` (
  `ma_chi_tiet` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ma_kiem_ke` int NOT NULL,
  `ma_nguyen_lieu` int NOT NULL,
  `so_luong_he_thong` decimal(10, 2) NOT NULL COMMENT 'Số lượng trên app',
  `so_luong_thuc_te` decimal(10, 2) NOT NULL COMMENT 'Số lượng đếm tay',
  `chenh_lech` decimal(10, 2) NOT NULL,
  `ly_do` text,
  CONSTRAINT `fk_ctkk_kiemke` FOREIGN KEY (`ma_kiem_ke`) REFERENCES `kiem_ke` (`ma_kiem_ke`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctkk_nguyenlieu` FOREIGN KEY (`ma_nguyen_lieu`) REFERENCES `nguyen_lieu` (`ma_nguyen_lieu`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS nha_cung_cap (
    ma_nha_cung_cap INT AUTO_INCREMENT PRIMARY KEY,
    ten_nha_cung_cap VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    dia_chi TEXT,
    ghi_chu TEXT,
    trang_thai ENUM('dang_hop_tac', 'ngung_hop_tac') DEFAULT 'dang_hop_tac',
    thoi_gian_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    thoi_gian_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add some sample data
INSERT INTO nha_cung_cap (ten_nha_cung_cap, so_dien_thoai, email, dia_chi, ghi_chu)
VALUES 
('Công ty Thực phẩm Sạch ABC', '0912345678', 'abc@food.vn', '123 Đường 3/2, Cần Thơ', 'Cung cấp thịt, cá tươi'),
('Nông trại Rau Xanh Phương Nam', '0987654321', 'rauxanh@farm.vn', '456 Mỹ Thuận, Vĩnh Long', 'Cung cấp rau củ quả'),
('Hải sản Tươi Sống Sông Tiền', '0901239876', 'haisansongtien@vinhlong.vn', '789 Bến đò Mỹ Thuận, Vĩnh Long', 'Chuyên hải sản, cua đồng');

-- 3. Modify phieu_nhap to link with nha_cung_cap
-- Add the foreign key field, keeping existing records as NULL
ALTER TABLE phieu_nhap 
ADD COLUMN ma_nha_cung_cap INT NULL,
ADD CONSTRAINT fk_phieu_nhap_nha_cung_cap FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap);

-- 3. Chèn dữ liệu mẫu nhà cung cấp
INSERT IGNORE INTO `nha_cung_cap` (`ten_nha_cung_cap`, `so_dien_thoai`, `dia_chi`, `ghi_chu`) VALUES
('Đại lý Thực phẩm Sạch Việt', '0901234567', '123 Đường ABC, Q1, TP.HCM', 'Cung cấp sườn, tôm, thịt'),
('Công ty Nông sản Xanh', '0987654321', '456 Đường XYZ, Q.Bình Tân, TP.HCM', 'Cung cấp bún, gạo, rau'),
('Nhà phân phối Cà phê Cao Nguyên', '0912345678', '789 Đường LMN, Q3, TP.HCM', 'Cung cấp cà phê rang xay');


-- Chèn dữ liệu mẫu cho nguyên liệu
INSERT IGNORE INTO `nguyen_lieu` (`ma_nguyen_lieu`, `ten_nguyen_lieu`, `so_luong_ton`, `don_vi_tinh`, `muc_canh_bao`) VALUES
(1, 'Sườn non', 50000.00, 'gram', 5000.00),
(2, 'Gạo tấm', 100000.00, 'gram', 10000.00),
(3, 'Cà phê rang xay', 20000.00, 'gram', 2000.00),
(4, 'Sữa đặc', 15000.00, 'ml', 1000.00),
(5, 'Tôm sú', 30000.00, 'gram', 3000.00),
(6, 'Bún tươi', 40000.00, 'gram', 5000.00);

-- Chèn mẫu công thức cho các món đã có
-- 'Cơm Tấm Sườn Bì' (Mã món: 1) -> Dùng 250g sườn non, 150g gạo tấm
INSERT IGNORE INTO `cong_thuc` (`ma_mon`, `ma_nguyen_lieu`, `so_luong_can`) VALUES
(1, 1, 250.00),
(1, 2, 150.00);

-- 'Cà Phê Sữa Đá' (Mã món: 3) -> Dùng 20g cà phê, 30ml sữa đặc
INSERT IGNORE INTO `cong_thuc` (`ma_mon`, `ma_nguyen_lieu`, `so_luong_can`) VALUES
(3, 3, 20.00),
(3, 4, 30.00);

-- 'Gỏi Cuốn Tôm Thịt' (Mã món: 4) -> Dùng 50g tôm sú, 50g bún tươi
INSERT IGNORE INTO `cong_thuc` (`ma_mon`, `ma_nguyen_lieu`, `so_luong_can`) VALUES
(4, 5, 50.00),
(4, 6, 50.00);
-- Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

USE `amthuc_phuongnam`;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Admin
INSERT INTO `admin` (`tai_khoan`, `mat_khau_hash`, `ten_hien_thi`, `email`, `quyen`) VALUES
('admin_nam', 'hash123', 'Quản lý Nam', 'nam@amthuc.vn', 'superadmin'),
('nv_thanh', 'hash456', 'Nhân viên Thanh', 'thanh@amthuc.vn', 'staff');

-- 2. Danh mục
INSERT INTO `danh_muc` (`ten_danh_muc`, `mo_ta`) VALUES
('Món chính', 'Các món ăn no đặc sản miền Nam'),
('Đồ uống', 'Cà phê, nước ép và trà'),
('Khai vị', 'Các món nhẹ trước bữa chính');

-- 3. Người dùng
INSERT INTO `nguoi_dung` (`ten_nguoi_dung`, `email`, `so_dien_thoai`, `dia_chi`, `gioi_tinh`) VALUES
('Nguyễn Văn A', 'vana@gmail.com', '0901234567', '123 Quận 1, HCM', 'nam'),
('Trần Thị B', 'thib@gmail.com', '0907654321', '456 Quận 3, HCM', 'nu');

-- 4. Món ăn
INSERT INTO `mon_an` (`ten_mon`, `gia_tien`, `ma_danh_muc`, `anh_mon`, `so_luong_ton`) VALUES
('Cơm Tấm Sườn Bì', 55000, 1, 'com_tam.jpg', 100),
('Bún Mắm Miền Tây', 65000, 1, 'bun_mam.jpg', 50),
('Cà Phê Sữa Đá', 25000, 2, 'cafe_sua.jpg', 200),
('Gỏi Cuốn Tôm Thịt', 15000, 3, 'goi_cuon.jpg', 150);

-- 5. Bàn
INSERT INTO `ban` (`ten_ban`, `so_cho`, `vi_tri`, `trang_thai`) VALUES
('Bàn 01', 4, 'Tầng G', 'trong'),
('Bàn 02', 2, 'Cửa sổ', 'dang_phuc_vu'),
('Bàn VIP', 10, 'Phòng máy lạnh', 'da_dat');

-- 6. Khuyến mãi
INSERT INTO `khuyen_mai` (`ma_code`, `gia_tri`, `loai_giam_gia`, `ngay_bat_dau`, `ngay_ket_thuc`) VALUES
('XIN_CHAO', 10.00, 'percentage', '2024-01-01', '2024-12-31'),
('GIAM_50K', 50000.00, 'fixed_amount', '2024-01-01', '2024-12-31');

-- 7. Đơn hàng Online (1 đơn của Nguyễn Văn A)
INSERT INTO `don_hang` (`ma_nguoi_dung`, `dia_chi_giao`, `tong_tien`, `trang_thai`, `phuong_thuc_thanh_toan`) VALUES
(1, '123 Quận 1, HCM', 80000, 'delivered', 'cod');

INSERT INTO `chi_tiet_don_hang` (`ma_don_hang`, `ma_mon`, `so_luong`, `gia_tai_thoi_diem`) VALUES
(1, 1, 1, 55000),
(1, 3, 1, 25000);

-- 8. Order tại bàn (Bàn 02 đang ăn)
INSERT INTO `order_nha_hang` (`ma_ban`, `ma_nhan_vien`, `tong_tien`, `trang_thai`) VALUES
(2, 2, 65000, 'dang_phuc_vu');

INSERT INTO `chi_tiet_order_nha_hang` (`ma_order`, `ma_mon`, `so_luong`, `gia`) VALUES
(1, 2, 1, 65000);

-- 9. Đặt bàn trước
INSERT INTO `dat_ban` (`ma_nguoi_dung`, `ten_nguoi_dat`, `so_dien_thoai`, `so_luong_nguoi`, `ngay_dat`, `gio_den`) VALUES
(2, 'Trần Thị B', '0907654321', 5, '2024-05-20', '19:00:00');

-- 10. Đánh giá sản phẩm
INSERT INTO `danh_gia_san_pham` (`ma_mon`, `ma_nguoi_dung`, `so_sao`, `binh_luan`, `trang_thai`) VALUES
(1, 1, 5, 'Cơm tấm rất ngon, sườn mềm!', 'approved');

-- 11. Tin tức
INSERT INTO `tin_tuc` (`tieu_de`, `tom_tat`, `noi_dung`, `ma_admin_dang`) VALUES
('Khai trương chi nhánh mới', 'Giảm ngay 20%', 'Nội dung chi tiết bài viết...', 1);

-- 12. AI - Hành vi & Gợi ý
INSERT INTO `hanh_vi_nguoi_dung` (`ma_nguoi_dung`, `ma_mon`, `hanh_vi`) VALUES
(1, 1, 'purchase'),
(1, 2, 'view');

INSERT INTO `user_embedding` (`ma_nguoi_dung`, `vector`) VALUES
(1, '[0.12, 0.88, 0.45, 0.67]'),
(2, '[0.55, 0.22, 0.99, 0.11]');

-- 13. Chatbot Tri thức
INSERT INTO `tri_thuc_chatbot` (`tieu_de`, `noi_dung`, `loai`) VALUES
('Giờ mở cửa', 'Nhà hàng mở cửa từ 7:00 đến 22:00 hàng ngày.', 'faq'),
('Chính sách hoàn tiền', 'Hủy đơn trước 30 phút sẽ được hoàn lại 100%.', 'chinh_sach');

-- 14. Cài đặt hệ thống
INSERT INTO `cai_dat` (`setting_key`, `setting_value`, `mo_ta`) VALUES
('site_name', 'Ẩm Thực Phương Nam', 'Tên website'),
('hotline', '1900 1234', 'Số điện thoại hỗ trợ');

SET FOREIGN_KEY_CHECKS = 1;
SELECT * FROM admin;
SELECT * FROM nguoi_dung;
SELECT * FROM cai_dat;
SELECT * FROM lien_he;
SELECT * FROM danh_muc;
SELECT * FROM mon_an;
SELECT * FROM anh_san_pham;
SELECT * FROM album_anh;
SELECT * FROM ban;
SELECT * FROM gio_hang;
SELECT * FROM chi_tiet_gio_hang;
SELECT * FROM don_hang;
SELECT * FROM chi_tiet_don_hang;
SELECT * FROM lich_su_trang_thai_don_hang;
SELECT * FROM thanh_toan;
SELECT * FROM hoa_don;
SELECT * FROM chi_tiet_hoa_don;
SELECT * FROM khuyen_mai;
SELECT * FROM tin_tuc;
SELECT * FROM binh_luan_tin_tuc;
SELECT * FROM cam_xuc_tin_tuc;
SELECT * FROM cam_xuc_binh_luan;
SELECT * FROM danh_gia_san_pham;
SELECT * FROM tra_loi_danh_gia;
SELECT * FROM tri_thuc_chatbot;
SELECT * FROM chatbot_session;
SELECT * FROM lich_su_chatbot;
SELECT * FROM hanh_vi_nguoi_dung;
SELECT * FROM user_embedding;
SELECT * FROM mon_an_embedding;
SELECT * FROM goi_y_san_pham;
SELECT * FROM du_lieu_tim_kiem;
SELECT * FROM email_verification;
SELECT * FROM lich_su_chat;
SELECT * FROM password_reset;
SELECT * FROM thong_ke_ngay;
SELECT * FROM CHAM_CONG;