-- Tạo bảng mục tiêu chi tiết (5 mục tiêu mỗi tháng)
CREATE TABLE IF NOT EXISTS `muc_tieu_chi_tiet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thang` int NOT NULL,
  `nam` int NOT NULL,
  `loai_muc_tieu` ENUM('doanh_thu', 'don_hang', 'khach_hang_moi', 'dat_ban', 'danh_gia') NOT NULL,
  `ten_muc_tieu` varchar(255) NOT NULL,
  `mo_ta` text,
  `gia_tri_muc_tieu` decimal(15,2) NOT NULL DEFAULT 0,
  `gia_tri_hien_tai` decimal(15,2) NOT NULL DEFAULT 0,
  `don_vi` varchar(50) DEFAULT 'đơn vị',
  `icon` varchar(50) DEFAULT '🎯',
  `thu_tu` int DEFAULT 1,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `thang_nam_loai` (`thang`, `nam`, `loai_muc_tieu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Bảng muc_tieu_chi_tiet đã được tạo!' as message;
