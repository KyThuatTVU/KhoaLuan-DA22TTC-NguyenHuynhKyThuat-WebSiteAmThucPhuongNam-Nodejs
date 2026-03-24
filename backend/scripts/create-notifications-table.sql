-- Tạo bảng thông báo cho người dùng
CREATE TABLE IF NOT EXISTS `thong_bao` (
  `ma_thong_bao` int NOT NULL AUTO_INCREMENT,
  `ma_nguoi_dung` int NOT NULL COMMENT 'Người nhận thông báo',
  `loai` enum('news','promo','comment_reply','comment_like','order_status','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'Loại thông báo',
  `tieu_de` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tiêu đề thông báo',
  `noi_dung` text COLLATE utf8mb4_unicode_ci COMMENT 'Nội dung chi tiết',
  `duong_dan` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Link liên quan',
  `ma_lien_quan` int DEFAULT NULL COMMENT 'ID của đối tượng liên quan (tin tức, bình luận, đơn hàng...)',
  `da_doc` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0: chưa đọc, 1: đã đọc',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_thong_bao`),
  KEY `idx_nguoi_dung` (`ma_nguoi_dung`),
  KEY `idx_da_doc` (`da_doc`),
  KEY `idx_loai` (`loai`),
  KEY `idx_ngay_tao` (`ngay_tao`),
  CONSTRAINT `thong_bao_ibfk_1` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng lưu thông báo cho người dùng';

-- Thêm một số thông báo mẫu
INSERT INTO `thong_bao` (`ma_nguoi_dung`, `loai`, `tieu_de`, `noi_dung`, `duong_dan`, `da_doc`) VALUES
(1, 'news', 'Bài viết mới: Khai trương chi nhánh mới', 'Nhà hàng Phương Nam vừa khai trương chi nhánh mới tại Vĩnh Long!', 'tin-tuc-chi-tiet.html?id=6', 0),
(1, 'promo', 'Khuyến mãi đặc biệt cuối tuần', 'Giảm 20% cho tất cả các món ăn vào cuối tuần này!', 'thuc-don.html', 0),
(2, 'comment_reply', 'Admin đã trả lời bình luận của bạn', 'Cảm ơn bạn đã ủng hộ nhà hàng!', 'tin-tuc-chi-tiet.html?id=6', 0),
(3, 'comment_like', 'Có người thích bình luận của bạn', 'Nguyễn Văn A đã thích bình luận của bạn', 'tin-tuc-chi-tiet.html?id=7', 0);
