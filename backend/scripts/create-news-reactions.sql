-- Xóa bảng cũ nếu có
DROP TABLE IF EXISTS `cam_xuc_tin_tuc`;

-- Tạo bảng cảm xúc tin tức (reactions)
CREATE TABLE `cam_xuc_tin_tuc` (
  `ma_cam_xuc` int NOT NULL AUTO_INCREMENT,
  `ma_tin_tuc` int NOT NULL,
  `ma_nguoi_dung` int NOT NULL,
  `loai_cam_xuc` enum('like','love','haha','wow','sad','angry') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_cam_xuc`),
  UNIQUE KEY `unique_user_news` (`ma_tin_tuc`, `ma_nguoi_dung`),
  KEY `ma_tin_tuc` (`ma_tin_tuc`),
  KEY `ma_nguoi_dung` (`ma_nguoi_dung`),
  CONSTRAINT `cam_xuc_tin_tuc_ibfk_1` FOREIGN KEY (`ma_tin_tuc`) REFERENCES `tin_tuc` (`ma_tin_tuc`) ON DELETE CASCADE,
  CONSTRAINT `cam_xuc_tin_tuc_ibfk_2` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu cảm xúc (sử dụng ID tin tức thực tế: 6, 7, 8, 9, 10)
INSERT INTO `cam_xuc_tin_tuc` (`ma_tin_tuc`, `ma_nguoi_dung`, `loai_cam_xuc`) VALUES
-- Tin tức 6: Khai Trương Chi Nhánh Mới
(6, 1, 'love'),
(6, 2, 'like'),
(6, 3, 'wow'),
(6, 4, 'love'),
(6, 5, 'like'),

-- Tin tức 7: Ra Mắt Thực Đơn Mùa Thu
(7, 1, 'love'),
(7, 2, 'wow'),
(7, 3, 'like'),
(7, 4, 'haha'),

-- Tin tức 8: Workshop Ẩm Thực
(8, 1, 'like'),
(8, 2, 'love'),
(8, 5, 'wow'),

-- Tin tức 9: Khuyến Mãi Cuối Tuần
(9, 1, 'love'),
(9, 2, 'love'),
(9, 3, 'love'),
(9, 4, 'like'),
(9, 5, 'like'),

-- Tin tức 10: Đặc Sản Mùa Vụ
(10, 2, 'love'),
(10, 3, 'like'),
(10, 4, 'wow');
