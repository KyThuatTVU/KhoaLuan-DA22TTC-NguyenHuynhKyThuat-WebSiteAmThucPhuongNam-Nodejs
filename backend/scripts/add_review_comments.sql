-- Tạo bảng bình luận cho đánh giá
CREATE TABLE IF NOT EXISTS binh_luan_danh_gia (
  ma_binh_luan INT NOT NULL AUTO_INCREMENT,
  ma_danh_gia INT NOT NULL,
  ma_nguoi_dung INT NOT NULL,
  noi_dung TEXT NOT NULL,
  ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ma_binh_luan),
  KEY ma_danh_gia (ma_danh_gia),
  KEY ma_nguoi_dung (ma_nguoi_dung),
  CONSTRAINT binh_luan_danh_gia_ibfk_1 FOREIGN KEY (ma_danh_gia) REFERENCES danh_gia_san_pham (ma_danh_gia) ON DELETE CASCADE,
  CONSTRAINT binh_luan_danh_gia_ibfk_2 FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung (ma_nguoi_dung) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
