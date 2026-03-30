-- Tính năng Quản lý Nhập hàng và Kiểm kê nguyên liệu

-- 1. Bảng phieu_nhap (Phiếu nhập hàng)
CREATE TABLE IF NOT EXISTS `phieu_nhap` (
  `ma_phieu_nhap` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `thoi_gian_nhap` datetime DEFAULT CURRENT_TIMESTAMP,
  `ma_nhan_vien` int DEFAULT NULL,
  `tong_tien` decimal(15, 2) DEFAULT 0,
  `nha_cung_cap` varchar(255),
  `ghi_chu` text,
  `trang_thai` varchar(50) DEFAULT 'hoan_tat' COMMENT 'cho_duyet, hoan_tat, huy',
  CONSTRAINT `fk_phieunhap_nhanvien` FOREIGN KEY (`ma_nhan_vien`) REFERENCES `nhan_vien` (`ma_nhan_vien`) ON DELETE SET NULL
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
