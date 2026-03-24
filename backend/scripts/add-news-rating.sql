-- Thêm cột đánh giá vào bảng bình luận tin tức
ALTER TABLE `binh_luan_tin_tuc` 
ADD COLUMN `so_sao` tinyint DEFAULT NULL COMMENT 'Đánh giá từ 1-5 sao' AFTER `noi_dung`;

-- Cập nhật một số bình luận có đánh giá
UPDATE `binh_luan_tin_tuc` SET `so_sao` = 5 WHERE `ma_binh_luan` IN (1, 2, 7, 9);
UPDATE `binh_luan_tin_tuc` SET `so_sao` = 4 WHERE `ma_binh_luan` IN (3, 4, 8);
UPDATE `binh_luan_tin_tuc` SET `so_sao` = 5 WHERE `ma_binh_luan` IN (5, 6, 10);
