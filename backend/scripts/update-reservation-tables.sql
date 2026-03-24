-- Script cập nhật bảng đặt bàn để hỗ trợ đặt món kèm theo
-- Chạy script này để cập nhật database hiện có

-- Bước 1: Thêm cột ma_nguoi_dung vào bảng dat_ban (nếu chưa có)
-- Kiểm tra và thêm cột ma_nguoi_dung
SET @dbname = DATABASE();
SET @tablename = 'dat_ban';
SET @columnname = 'ma_nguoi_dung';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` int DEFAULT NULL AFTER `ma_dat_ban`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Bước 2: Thêm cột tong_tien_du_kien vào bảng dat_ban (nếu chưa có)
SET @columnname = 'tong_tien_du_kien';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` decimal(14,2) DEFAULT 0 AFTER `trang_thai`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Bước 3: Thêm foreign key cho ma_nguoi_dung (nếu chưa có)
-- Lưu ý: Chỉ chạy nếu cột đã tồn tại và chưa có constraint
SET @fkname = 'fk_dat_ban_nguoi_dung';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND CONSTRAINT_NAME = @fkname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD KEY `', @fkname, '` (`ma_nguoi_dung`)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Bước 4: Tạo bảng chi_tiet_dat_ban (nếu chưa có)
CREATE TABLE IF NOT EXISTS `chi_tiet_dat_ban` (
  `ma_chi_tiet` int NOT NULL AUTO_INCREMENT,
  `ma_dat_ban` int NOT NULL,
  `ma_mon` int NOT NULL,
  `so_luong` int NOT NULL DEFAULT 1,
  `gia_tai_thoi_diem` decimal(12,2) NOT NULL,
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_chi_tiet`),
  KEY `fk_chi_tiet_dat_ban` (`ma_dat_ban`),
  KEY `fk_chi_tiet_mon_an` (`ma_mon`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiết món ăn đặt trước khi đặt bàn';

-- Thông báo hoàn thành
SELECT 'Database đã được cập nhật thành công!' as message;
