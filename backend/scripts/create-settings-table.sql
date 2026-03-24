-- Tạo bảng cài đặt nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS `cai_dat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `mo_ta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_cap_nhat` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mặc định cho nhà hàng
INSERT INTO `cai_dat` (`setting_key`, `setting_value`, `mo_ta`) VALUES
('ten_nha_hang', 'Nhà hàng Ẩm thực Phương Nam', 'Tên nhà hàng'),
('dia_chi', '123 Đường ABC, Phường 1, TP. Vĩnh Long', 'Địa chỉ nhà hàng'),
('so_dien_thoai', '0123 456 789', 'Số điện thoại hotline'),
('email', 'info@phuongnam.vn', 'Email liên hệ'),
('website', 'phuongnam.vn', 'Website'),
('gio_mo_cua_t2_t6', '08:00-22:00', 'Giờ mở cửa thứ 2 đến thứ 6'),
('gio_mo_cua_t7_cn', '07:00-23:00', 'Giờ mở cửa thứ 7 và chủ nhật'),
('phi_giao_hang', '20000', 'Phí giao hàng (VNĐ)'),
('mien_phi_giao_hang_tu', '200000', 'Miễn phí giao hàng cho đơn từ (VNĐ)')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
