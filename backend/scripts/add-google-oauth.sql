-- Script thêm cột google_id cho đăng nhập Google
-- Chạy script này để cập nhật database

-- Thêm cột google_id vào bảng nguoi_dung
ALTER TABLE `nguoi_dung` 
ADD COLUMN `google_id` VARCHAR(255) NULL AFTER `anh_dai_dien`,
ADD INDEX `idx_google_id` (`google_id`);

-- Cho phép mat_khau_hash có thể NULL (cho user đăng ký bằng Google)
ALTER TABLE `nguoi_dung` 
MODIFY COLUMN `mat_khau_hash` VARCHAR(255) NULL;
