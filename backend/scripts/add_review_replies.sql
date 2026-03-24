-- Thêm bảng lưu trả lời của admin cho đánh giá sản phẩm
CREATE TABLE IF NOT EXISTS `tra_loi_danh_gia` (
  `ma_tra_loi` INT NOT NULL AUTO_INCREMENT,
  `ma_danh_gia` INT NOT NULL COMMENT 'ID đánh giá được trả lời',
  `noi_dung` TEXT NOT NULL COMMENT 'Nội dung trả lời',
  `ten_admin` VARCHAR(150) DEFAULT 'Admin' COMMENT 'Tên admin trả lời',
  `ngay_tra_loi` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_tra_loi`),
  KEY `ma_danh_gia` (`ma_danh_gia`),
  CONSTRAINT `tra_loi_danh_gia_ibfk_1` FOREIGN KEY (`ma_danh_gia`) REFERENCES `danh_gia_san_pham` (`ma_danh_gia`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trả lời của admin cho đánh giá sản phẩm';
