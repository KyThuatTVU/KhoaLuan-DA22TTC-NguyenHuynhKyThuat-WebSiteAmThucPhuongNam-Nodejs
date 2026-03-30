-- Setup Supplier Management Tables
-- 1. Create nha_cung_cap table
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
