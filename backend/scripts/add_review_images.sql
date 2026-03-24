-- Thêm cột hinh_anh vào bảng danh_gia_san_pham
ALTER TABLE danh_gia_san_pham 
ADD COLUMN hinh_anh TEXT NULL COMMENT 'JSON array chứa đường dẫn các ảnh đánh giá' 
AFTER binh_luan;
