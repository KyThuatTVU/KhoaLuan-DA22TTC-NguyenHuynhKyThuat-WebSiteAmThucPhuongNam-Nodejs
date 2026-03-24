-- Script thêm tính năng reactions và replies cho bình luận tin tức
-- Chạy script này để cập nhật database

-- 1. Thêm cột parent_id cho bình luận (để hỗ trợ reply)
ALTER TABLE `binh_luan_tin_tuc` 
ADD COLUMN `ma_binh_luan_cha` int DEFAULT NULL AFTER `ma_nguoi_dung`,
ADD CONSTRAINT `fk_binh_luan_cha` FOREIGN KEY (`ma_binh_luan_cha`) REFERENCES `binh_luan_tin_tuc` (`ma_binh_luan`) ON DELETE CASCADE;

-- 2. Tạo bảng reactions cho bình luận
CREATE TABLE IF NOT EXISTS `cam_xuc_binh_luan` (
  `ma_cam_xuc` int NOT NULL AUTO_INCREMENT,
  `ma_binh_luan` int NOT NULL,
  `ma_nguoi_dung` int NOT NULL,
  `loai_cam_xuc` enum('like','love','haha','wow','sad','angry') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'like',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ma_cam_xuc`),
  UNIQUE KEY `unique_user_comment_reaction` (`ma_binh_luan`, `ma_nguoi_dung`),
  KEY `ma_binh_luan` (`ma_binh_luan`),
  KEY `ma_nguoi_dung` (`ma_nguoi_dung`),
  CONSTRAINT `cam_xuc_binh_luan_ibfk_1` FOREIGN KEY (`ma_binh_luan`) REFERENCES `binh_luan_tin_tuc` (`ma_binh_luan`) ON DELETE CASCADE,
  CONSTRAINT `cam_xuc_binh_luan_ibfk_2` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Thêm index để tối ưu query
CREATE INDEX idx_comment_parent ON binh_luan_tin_tuc(ma_binh_luan_cha);
CREATE INDEX idx_comment_reactions ON cam_xuc_binh_luan(ma_binh_luan, loai_cam_xuc);
