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