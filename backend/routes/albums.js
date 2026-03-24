const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để upload ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../images'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'album-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh!'));
        }
    }
});

// Lấy tất cả album (có phân trang)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        // Đếm tổng số ảnh
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM album_anh'
        );
        const total = countResult[0].total;

        // Lấy danh sách album
        const [albums] = await db.query(
            `SELECT * FROM album_anh 
             ORDER BY ngay_tao DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        res.json({
            success: true,
            data: albums,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Lỗi lấy album:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Lấy album theo loại (món ăn, không gian, sự kiện...)
router.get('/category/:loai', async (req, res) => {
    try {
        const { loai } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        // Đếm số ảnh theo loại
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM album_anh WHERE loai_anh = ?',
            [loai]
        );
        const total = countResult[0].total;

        // Lấy album theo loại
        const [albums] = await db.query(
            `SELECT * FROM album_anh 
             WHERE loai_anh = ?
             ORDER BY ngay_tao DESC 
             LIMIT ? OFFSET ?`,
            [loai, limit, offset]
        );

        res.json({
            success: true,
            data: albums,
            category: loai,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Lỗi lấy album theo loại:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Lấy các loại album có sẵn
router.get('/categories/list', async (req, res) => {
    try {
        const [categories] = await db.query(
            `SELECT DISTINCT loai_anh, COUNT(*) as so_luong 
             FROM album_anh 
             GROUP BY loai_anh 
             ORDER BY so_luong DESC`
        );

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Lỗi lấy danh mục album:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Lấy chi tiết 1 ảnh trong album
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [albums] = await db.query(
            'SELECT * FROM album_anh WHERE ma_album = ?',
            [id]
        );

        if (albums.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ảnh'
            });
        }

        res.json({
            success: true,
            data: albums[0]
        });

    } catch (error) {
        console.error('Lỗi lấy chi tiết album:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Lấy ảnh theo món ăn (giữ nguyên endpoint cũ để tương thích)
router.get('/product/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM anh_san_pham WHERE ma_mon = ?',
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Thêm ảnh vào album (Admin) - hỗ trợ upload nhiều ảnh
router.post('/', requireAdmin, upload.array('images', 10), async (req, res) => {
    try {
        const { loai_anh, mo_ta } = req.body;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 ảnh' });
        }
        
        const insertedIds = [];
        
        for (const file of files) {
            // Sử dụng NOW() của MySQL để lấy thời gian chính xác theo server
            const [result] = await db.query(
                `INSERT INTO album_anh (duong_dan_anh, loai_anh, mo_ta, ngay_tao) 
                 VALUES (?, ?, ?, NOW())`,
                [file.filename, loai_anh || 'khac', mo_ta || '']
            );
            insertedIds.push(result.insertId);
        }
        
        res.json({ success: true, message: `Thêm ${files.length} ảnh thành công`, ids: insertedIds });
    } catch (error) {
        console.error('Error adding album:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cập nhật thông tin ảnh (Admin) - hỗ trợ upload ảnh mới
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { loai_anh, mo_ta } = req.body;
        const newImage = req.file ? req.file.filename : null;
        
        let query, params;
        if (newImage) {
            // Có ảnh mới
            query = `UPDATE album_anh SET duong_dan_anh = ?, loai_anh = ?, mo_ta = ? WHERE ma_album = ?`;
            params = [newImage, loai_anh, mo_ta || '', req.params.id];
        } else {
            // Không có ảnh mới
            query = `UPDATE album_anh SET loai_anh = ?, mo_ta = ? WHERE ma_album = ?`;
            params = [loai_anh, mo_ta || '', req.params.id];
        }
        
        const [result] = await db.query(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
        }
        
        res.json({ success: true, message: 'Cập nhật ảnh thành công' });
    } catch (error) {
        console.error('Error updating album:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Xóa ảnh khỏi album (Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM album_anh WHERE ma_album = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
        }
        
        res.json({ success: true, message: 'Xóa ảnh thành công' });
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
