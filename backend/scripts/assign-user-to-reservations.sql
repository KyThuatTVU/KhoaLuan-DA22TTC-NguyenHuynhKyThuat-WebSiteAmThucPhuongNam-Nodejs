-- Script gán ma_nguoi_dung cho các đơn đặt bàn cũ dựa trên số điện thoại
-- Chạy script này sau khi đã cập nhật cấu trúc database

-- Cập nhật ma_nguoi_dung cho các đơn đặt bàn dựa trên số điện thoại khớp với người dùng
UPDATE dat_ban db
JOIN nguoi_dung nd ON db.so_dien_thoai = nd.so_dien_thoai
SET db.ma_nguoi_dung = nd.ma_nguoi_dung
WHERE db.ma_nguoi_dung IS NULL;

-- Kiểm tra kết quả
SELECT 
    db.ma_dat_ban,
    db.ten_nguoi_dat,
    db.so_dien_thoai,
    db.ma_nguoi_dung,
    nd.ten_nguoi_dung as ten_nguoi_dung_lien_ket
FROM dat_ban db
LEFT JOIN nguoi_dung nd ON db.ma_nguoi_dung = nd.ma_nguoi_dung
ORDER BY db.ma_dat_ban DESC
LIMIT 10;

-- Thông báo
SELECT CONCAT('Đã cập nhật ', ROW_COUNT(), ' đơn đặt bàn') as message;
