-- Tạo bảng chi phí hàng ngày
CREATE TABLE IF NOT EXISTS chi_phi_hang_ngay (
    ma_chi_phi INT NOT NULL AUTO_INCREMENT,
    ngay_chi DATE NOT NULL COMMENT 'Ngày phát sinh chi phí',
    loai_chi_phi VARCHAR(100) NOT NULL COMMENT 'Loại chi phí: Nguyên liệu, Điện nước, Tiền thuê, Lương, Bảo trì, Marketing, Văn phòng phẩm, Vận chuyển, Khác',
    ten_chi_phi VARCHAR(255) NOT NULL COMMENT 'Tên khoản chi cụ thể',
    so_tien DECIMAL(15,2) NOT NULL COMMENT 'Số tiền chi',
    mo_ta TEXT COMMENT 'Mô tả chi tiết về khoản chi',
    nguoi_nhan VARCHAR(255) COMMENT 'Người nhận tiền hoặc đơn vị cung cấp',
    phuong_thuc_thanh_toan VARCHAR(50) DEFAULT 'Tiền mặt' COMMENT 'Phương thức thanh toán: Tiền mặt, Chuyển khoản, Thẻ',
    nguoi_tao INT COMMENT 'Nhân viên tạo phiếu chi',
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_chi_phi),
    INDEX idx_ngay_chi (ngay_chi),
    INDEX idx_loai_chi_phi (loai_chi_phi),
    INDEX idx_nguoi_tao (nguoi_tao),
    CONSTRAINT fk_chi_phi_nguoi_tao FOREIGN KEY (nguoi_tao) 
        REFERENCES nhan_vien (ma_nhan_vien) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng quản lý chi phí hàng ngày của nhà hàng';

-- Thêm dữ liệu mẫu
INSERT INTO chi_phi_hang_ngay (ngay_chi, loai_chi_phi, ten_chi_phi, so_tien, mo_ta, nguoi_nhan, phuong_thuc_thanh_toan) VALUES
('2024-01-15', 'Điện nước', 'Tiền điện tháng 12/2023', 2500000, 'Hóa đơn điện tháng 12', 'Điện lực Vĩnh Long', 'Chuyển khoản'),
('2024-01-15', 'Điện nước', 'Tiền nước tháng 12/2023', 450000, 'Hóa đơn nước tháng 12', 'Cấp nước Vĩnh Long', 'Tiền mặt'),
('2024-01-20', 'Tiền thuê mặt bằng', 'Tiền thuê tháng 1/2024', 15000000, 'Tiền thuê mặt bằng nhà hàng', 'Chủ nhà', 'Chuyển khoản'),
('2024-01-25', 'Bảo trì sửa chữa', 'Sửa chữa máy lạnh', 1200000, 'Thay gas và vệ sinh máy lạnh', 'Công ty TNHH Điện lạnh ABC', 'Tiền mặt'),
('2024-01-28', 'Marketing', 'Quảng cáo Facebook Ads', 3000000, 'Chi phí quảng cáo tháng 1', 'Facebook', 'Thẻ'),
('2024-01-30', 'Văn phòng phẩm', 'Mua giấy in, bút, file', 350000, 'Văn phòng phẩm tháng 1', 'Cửa hàng Văn phòng phẩm Minh Tâm', 'Tiền mặt');
