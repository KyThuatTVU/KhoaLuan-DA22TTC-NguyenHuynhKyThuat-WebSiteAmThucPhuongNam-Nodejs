-- Tạo bảng bình luận tin tức
CREATE TABLE IF NOT EXISTS `binh_luan_tin_tuc` (
  `ma_binh_luan` int NOT NULL AUTO_INCREMENT,
  `ma_tin_tuc` int NOT NULL,
  `ma_nguoi_dung` int DEFAULT NULL,
  `ten_nguoi_binh_luan` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_nguoi_binh_luan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `noi_dung` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_binh_luan` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  PRIMARY KEY (`ma_binh_luan`),
  KEY `ma_tin_tuc` (`ma_tin_tuc`),
  KEY `ma_nguoi_dung` (`ma_nguoi_dung`),
  CONSTRAINT `binh_luan_tin_tuc_ibfk_1` FOREIGN KEY (`ma_tin_tuc`) REFERENCES `tin_tuc` (`ma_tin_tuc`) ON DELETE CASCADE,
  CONSTRAINT `binh_luan_tin_tuc_ibfk_2` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm dữ liệu mẫu (sử dụng ID tin tức thực tế: 6, 7, 8, 9, 10)
INSERT INTO `binh_luan_tin_tuc` (`ma_tin_tuc`, `ma_nguoi_dung`, `ten_nguoi_binh_luan`, `email_nguoi_binh_luan`, `noi_dung`, `ngay_binh_luan`, `trang_thai`) VALUES
(6, 1, 'Nguyễn Thị Mai', 'mai.nguyen@gmail.com', 'Chúc mừng nhà hàng khai trương chi nhánh mới! Mình rất mong được đến thử không gian mới này.', '2025-11-15 10:30:00', 'approved'),
(6, 2, 'Trần Văn Hùng', 'hung.tran@gmail.com', 'Ưu đãi khai trương rất hấp dẫn! Mình sẽ rủ gia đình đến ăn cuối tuần này.', '2025-11-15 14:20:00', 'approved'),
(6, 3, 'Lê Thị Hoa', 'hoa.le@gmail.com', 'Không gian nhìn rất đẹp và sang trọng. Chắc chắn sẽ ghé thăm!', '2025-11-16 09:15:00', 'approved'),
(7, 4, 'Phạm Minh Tuấn', 'tuan.pham@gmail.com', 'Bài viết rất hữu ích! Mình đã biết thêm nhiều món ăn ngon của miền Nam.', '2025-11-15 16:45:00', 'approved'),
(7, 5, 'Võ Thị Lan', 'lan.vo@gmail.com', 'Cảm ơn nhà hàng đã chia sẻ. Mình sẽ thử hết các món này!', '2025-11-16 11:30:00', 'approved'),
(8, 1, 'Nguyễn Thị Mai', 'mai.nguyen@gmail.com', 'Workshop rất bổ ích! Mình đã học được nhiều kỹ năng nấu ăn mới.', '2025-11-16 15:20:00', 'approved'),
(9, 2, 'Trần Văn Hùng', 'hung.tran@gmail.com', 'Khuyến mãi cuối tuần quá tuyệt vời! Đã đặt bàn cho gia đình rồi.', '2025-11-17 10:00:00', 'approved'),
(9, 3, 'Lê Thị Hoa', 'hoa.le@gmail.com', 'Mình vừa sử dụng mã giảm giá, rất hài lòng với dịch vụ!', '2025-11-17 14:30:00', 'approved'),
(10, 4, 'Phạm Minh Tuấn', 'tuan.pham@gmail.com', 'Đặc sản mùa vụ rất tươi ngon! Đúng chuẩn vị miền Tây.', '2025-11-18 12:45:00', 'approved'),
(10, 5, 'Võ Thị Lan', 'lan.vo@gmail.com', 'Bài viết giới thiệu rất chi tiết. Mình sẽ đến thử món này!', '2025-11-18 16:00:00', 'approved');
