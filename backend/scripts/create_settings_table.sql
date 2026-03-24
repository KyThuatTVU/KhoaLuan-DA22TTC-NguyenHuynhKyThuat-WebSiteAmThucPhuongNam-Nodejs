-- Tạo bảng cài đặt hệ thống
CREATE TABLE IF NOT EXISTS cai_dat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    mo_ta VARCHAR(255),
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mặc định
INSERT INTO cai_dat (setting_key, setting_value, mo_ta) VALUES
('ten_nha_hang', 'Nhà hàng Ẩm thực Phương Nam', 'Tên nhà hàng'),
('so_dien_thoai', '0123 456 789', 'Số điện thoại liên hệ'),
('email', 'info@phuongnam.vn', 'Email liên hệ'),
('website', 'https://phuongnam.vn', 'Website'),
('dia_chi', '123 Đường ABC, Phường 1, TP. Vĩnh Long', 'Địa chỉ nhà hàng'),
('gio_mo_cua_t2_t6', '08:00-22:00', 'Giờ mở cửa thứ 2 - thứ 6'),
('gio_mo_cua_t7_cn', '07:00-23:00', 'Giờ mở cửa thứ 7 - chủ nhật'),
('cho_phep_giao_hang', '1', 'Cho phép giao hàng (1=có, 0=không)'),
('phi_giao_hang', '20000', 'Phí giao hàng mặc định (VNĐ)'),
('mien_phi_giao_hang_tu', '200000', 'Miễn phí giao hàng cho đơn từ (VNĐ)'),
('thanh_toan_tien_mat', '1', 'Cho phép thanh toán tiền mặt'),
('thanh_toan_chuyen_khoan', '1', 'Cho phép thanh toán chuyển khoản'),
('thanh_toan_momo', '1', 'Cho phép thanh toán MoMo')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
