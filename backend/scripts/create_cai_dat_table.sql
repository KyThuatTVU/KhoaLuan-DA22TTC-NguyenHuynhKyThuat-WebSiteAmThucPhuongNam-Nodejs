-- Script thêm cài đặt mạng xã hội vào bảng cai_dat
-- Chạy script này để thêm các URL mạng xã hội

-- Thêm các cài đặt mạng xã hội (sử dụng ON DUPLICATE KEY UPDATE để không lỗi nếu đã tồn tại)
INSERT INTO cai_dat (setting_key, setting_value, mo_ta) VALUES
('facebook_url', 'https://facebook.com/phuongnam', 'Link Facebook'),
('youtube_url', 'https://youtube.com/@phuongnam', 'Link YouTube'),
('instagram_url', 'https://instagram.com/phuongnam', 'Link Instagram'),
('tiktok_url', 'https://tiktok.com/@phuongnam', 'Link TikTok')
ON DUPLICATE KEY UPDATE mo_ta = VALUES(mo_ta);

SELECT 'Đã thêm cài đặt mạng xã hội!' as message;
