-- Tạo bảng thông báo cho admin
CREATE TABLE IF NOT EXISTS thong_bao_admin (
    ma_thong_bao INT NOT NULL AUTO_INCREMENT,
    loai ENUM('new_order', 'new_reservation', 'new_comment', 'new_review', 'new_user', 'contact_message', 'comment_like', 'system') NOT NULL DEFAULT 'system',
    tieu_de VARCHAR(255) NOT NULL,
    noi_dung TEXT,
    duong_dan VARCHAR(500),
    ma_lien_quan INT,
    da_doc BOOLEAN DEFAULT FALSE,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_thong_bao),
    INDEX idx_da_doc (da_doc),
    INDEX idx_ngay_tao (ngay_tao),
    INDEX idx_loai (loai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
