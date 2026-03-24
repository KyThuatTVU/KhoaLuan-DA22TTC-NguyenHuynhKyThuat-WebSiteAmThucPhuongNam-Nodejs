-- Script tạo/cập nhật bảng liên hệ
-- Chạy script này để cập nhật database

-- Tạo bảng lien_he nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS `lien_he` (
    `ma_lien_he` INT AUTO_INCREMENT PRIMARY KEY,
    `ho_ten` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `so_dien_thoai` VARCHAR(20),
    `tieu_de` VARCHAR(255) DEFAULT 'Câu hỏi chung',
    `noi_dung` TEXT NOT NULL,
    `hinh_anh` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh phản hồi (có thể nhiều ảnh, phân cách bằng dấu phẩy)',
    `ngay_gui` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `trang_thai` ENUM('new','read','replied') DEFAULT 'new',
    `ghi_chu_admin` TEXT NULL COMMENT 'Ghi chú của admin khi xử lý'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nếu bảng đã tồn tại, thêm các cột mới (bỏ qua lỗi nếu cột đã có)
ALTER TABLE `lien_he` 
ADD COLUMN IF NOT EXISTS `hinh_anh` VARCHAR(500) NULL COMMENT 'Đường dẫn hình ảnh phản hồi' AFTER `noi_dung`;

ALTER TABLE `lien_he` 
ADD COLUMN IF NOT EXISTS `ghi_chu_admin` TEXT NULL COMMENT 'Ghi chú của admin khi xử lý' AFTER `trang_thai`;

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_lien_he_trang_thai ON lien_he(trang_thai);
CREATE INDEX IF NOT EXISTS idx_lien_he_ngay_gui ON lien_he(ngay_gui);
