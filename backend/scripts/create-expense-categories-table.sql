-- Tạo bảng loại chi phí
CREATE TABLE IF NOT EXISTS loai_chi_phi (
    ma_loai_chi_phi INT NOT NULL AUTO_INCREMENT,
    ten_loai_chi_phi VARCHAR(100) NOT NULL UNIQUE,
    mo_ta TEXT,
    mau_sac VARCHAR(20) DEFAULT '#6b7280' COMMENT 'Màu hiển thị trên giao diện',
    icon VARCHAR(50) DEFAULT 'fas fa-money-bill-wave' COMMENT 'Icon FontAwesome',
    thu_tu_hien_thi INT DEFAULT 0 COMMENT 'Thứ tự hiển thị',
    trang_thai ENUM('active', 'inactive') DEFAULT 'active',
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_loai_chi_phi),
    INDEX idx_trang_thai (trang_thai),
    INDEX idx_thu_tu (thu_tu_hien_thi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng quản lý loại chi phí';

-- Thêm dữ liệu mẫu
INSERT INTO loai_chi_phi (ten_loai_chi_phi, mo_ta, mau_sac, icon, thu_tu_hien_thi) VALUES
('Nguyên liệu', 'Chi phí mua nguyên liệu thực phẩm, gia vị', '#10b981', 'fas fa-leaf', 1),
('Điện nước', 'Hóa đơn điện, nước hàng tháng', '#3b82f6', 'fas fa-bolt', 2),
('Tiền thuê mặt bằng', 'Chi phí thuê nhà, mặt bằng kinh doanh', '#8b5cf6', 'fas fa-home', 3),
('Lương nhân viên', 'Lương, thưởng, phụ cấp nhân viên', '#f59e0b', 'fas fa-users', 4),
('Bảo trì sửa chữa', 'Sửa chữa thiết bị, cơ sở vật chất', '#ef4444', 'fas fa-tools', 5),
('Marketing', 'Quảng cáo, khuyến mãi, tiếp thị', '#ec4899', 'fas fa-bullhorn', 6),
('Văn phòng phẩm', 'Giấy tờ, dụng cụ văn phòng', '#06b6d4', 'fas fa-paperclip', 7),
('Vận chuyển', 'Chi phí giao hàng, vận chuyển', '#84cc16', 'fas fa-truck', 8),
('Bảo hiểm', 'Bảo hiểm cháy nổ, trách nhiệm dân sự', '#6366f1', 'fas fa-shield-alt', 9),
('Thuế phí', 'Thuế môn bài, phí giấy phép', '#dc2626', 'fas fa-file-invoice-dollar', 10),
('Đào tạo nhân viên', 'Chi phí đào tạo, học tập', '#059669', 'fas fa-graduation-cap', 11),
('Khấu hao thiết bị', 'Khấu hao máy móc, thiết bị', '#7c3aed', 'fas fa-cogs', 12),
('Chi phí pháp lý', 'Luật sư, thủ tục pháp lý', '#be185d', 'fas fa-gavel', 13),
('Khác', 'Các chi phí khác không thuộc danh mục trên', '#6b7280', 'fas fa-ellipsis-h', 99);

-- Cập nhật bảng chi_phi_hang_ngay để liên kết với bảng loại
ALTER TABLE chi_phi_hang_ngay 
ADD COLUMN ma_loai_chi_phi INT AFTER loai_chi_phi,
ADD CONSTRAINT fk_chi_phi_loai FOREIGN KEY (ma_loai_chi_phi) 
    REFERENCES loai_chi_phi (ma_loai_chi_phi) ON DELETE SET NULL;

-- Cập nhật dữ liệu hiện có
UPDATE chi_phi_hang_ngay cp 
JOIN loai_chi_phi lcp ON cp.loai_chi_phi = lcp.ten_loai_chi_phi 
SET cp.ma_loai_chi_phi = lcp.ma_loai_chi_phi;