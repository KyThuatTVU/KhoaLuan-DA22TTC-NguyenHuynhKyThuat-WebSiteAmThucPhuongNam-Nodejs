-- Tạo bảng mục tiêu tháng
CREATE TABLE IF NOT EXISTS `muc_tieu_thang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thang` int NOT NULL,
  `nam` int NOT NULL,
  `muc_tieu_doanh_thu` decimal(15,2) NOT NULL DEFAULT 0,
  `muc_tieu_don_hang` int NOT NULL DEFAULT 0,
  `muc_tieu_khach_hang` int DEFAULT 0,
  `muc_tieu_dat_ban` int DEFAULT 0,
  `ghi_chu` text,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `thang_nam` (`thang`, `nam`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu cho tháng 12/2025
INSERT INTO muc_tieu_thang (thang, nam, muc_tieu_doanh_thu, muc_tieu_don_hang, ghi_chu) VALUES
(12, 2025, 50000000, 100, 'Mục tiêu tháng 12 - Mùa lễ hội')
ON DUPLICATE KEY UPDATE ghi_chu = VALUES(ghi_chu);

SELECT 'Bảng muc_tieu_thang đã được tạo!' as message;
