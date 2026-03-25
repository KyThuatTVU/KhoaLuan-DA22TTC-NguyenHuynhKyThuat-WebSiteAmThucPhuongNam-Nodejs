-- Thêm tính năng quản lý nguyên liệu (hệ thống nhà hàng)

-- 1. Bảng nguyen_lieu (Kho tập trung)
CREATE TABLE IF NOT EXISTS `nguyen_lieu` (
  `ma_nguyen_lieu` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ten_nguyen_lieu` varchar(150) NOT NULL UNIQUE,
  `so_luong_ton` decimal(10, 2) NOT NULL DEFAULT 0,
  `don_vi_tinh` varchar(50) NOT NULL COMMENT 'Gram, Kg, Lít, ML, Cái, Bịch...',
  `muc_canh_bao` decimal(10, 2) NOT NULL DEFAULT 1000 COMMENT 'Cảnh báo khi thấp hơn mức này',
  `trang_thai` tinyint DEFAULT 1,
  `ngay_cap_nhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng cong_thuc (Định mức tiêu hao cho mỗi món ăn)
CREATE TABLE IF NOT EXISTS `cong_thuc` (
  `ma_cong_thuc` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ma_mon` int NOT NULL,
  `ma_nguyen_lieu` int NOT NULL,
  `so_luong_can` decimal(10, 2) NOT NULL COMMENT 'Lượng nguyên liệu cần để tạo ra 1 món ăn',
  CONSTRAINT `fk_congthuc_mon` FOREIGN KEY (`ma_mon`) REFERENCES `mon_an` (`ma_mon`) ON DELETE CASCADE,
  CONSTRAINT `fk_congthuc_nguyenlieu` FOREIGN KEY (`ma_nguyen_lieu`) REFERENCES `nguyen_lieu` (`ma_nguyen_lieu`) ON DELETE CASCADE,
  UNIQUE KEY `unique_mon_nguyen_lieu` (`ma_mon`, `ma_nguyen_lieu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chèn dữ liệu mẫu cho nguyên liệu
INSERT IGNORE INTO `nguyen_lieu` (`ma_nguyen_lieu`, `ten_nguyen_lieu`, `so_luong_ton`, `don_vi_tinh`, `muc_canh_bao`) VALUES
(1, 'Sườn non', 50000.00, 'gram', 5000.00),
(2, 'Gạo tấm', 100000.00, 'gram', 10000.00),
(3, 'Cà phê rang xay', 20000.00, 'gram', 2000.00),
(4, 'Sữa đặc', 15000.00, 'ml', 1000.00),
(5, 'Tôm sú', 30000.00, 'gram', 3000.00),
(6, 'Bún tươi', 40000.00, 'gram', 5000.00);

-- Chèn mẫu công thức cho các món đã có
-- 'Cơm Tấm Sườn Bì' (Mã món: 1) -> Dùng 250g sườn non, 150g gạo tấm
INSERT IGNORE INTO `cong_thuc` (`ma_mon`, `ma_nguyen_lieu`, `so_luong_can`) VALUES
(1, 1, 250.00),
(1, 2, 150.00);

-- 'Cà Phê Sữa Đá' (Mã món: 3) -> Dùng 20g cà phê, 30ml sữa đặc
INSERT IGNORE INTO `cong_thuc` (`ma_mon`, `ma_nguyen_lieu`, `so_luong_can`) VALUES
(3, 3, 20.00),
(3, 4, 30.00);

-- 'Gỏi Cuốn Tôm Thịt' (Mã món: 4) -> Dùng 50g tôm sú, 50g bún tươi
INSERT IGNORE INTO `cong_thuc` (`ma_mon`, `ma_nguyen_lieu`, `so_luong_can`) VALUES
(4, 5, 50.00),
(4, 6, 50.00);
