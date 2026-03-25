const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Lấy danh sách tất cả các bàn
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM ban ORDER BY ma_ban');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bàn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách bàn' });
    }
});

// Lấy thông tin chi tiết một bàn
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM ban WHERE ma_ban = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin bàn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy thông tin bàn' });
    }
});

// Thêm bàn mới
router.post('/', async (req, res) => {
    try {
        const { ten_ban, so_cho, vi_tri, trang_thai } = req.body;
        
        if (!ten_ban) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên bàn' });
        }

        if (trang_thai === 'dang_phuc_vu') {
            return res.status(400).json({ 
                success: false, 
                message: 'Bàn mới tạo không thể ở trạng thái "Đang phục vụ" (vì chưa có hóa đơn/món ăn).' 
            });
        }

        const [result] = await db.query(
            'INSERT INTO ban (ten_ban, so_cho, vi_tri, trang_thai) VALUES (?, ?, ?, ?)',
            [
                ten_ban, 
                so_cho || 4, 
                vi_tri || '', 
                trang_thai || 'trong'
            ]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Thêm bàn thành công',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Lỗi khi thêm bàn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm bàn' });
    }
});

// Cập nhật bàn
router.put('/:id', async (req, res) => {
    try {
        const { ten_ban, so_cho, vi_tri, trang_thai } = req.body;
        
        if (!ten_ban) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên bàn' });
        }

        if (trang_thai === 'dang_phuc_vu') {
            const [orderCheck] = await db.query(`
                SELECT COUNT(ct.id) as itemCount 
                FROM order_nha_hang o
                JOIN chi_tiet_order_nha_hang ct ON o.ma_order = ct.ma_order
                WHERE o.ma_ban = ? AND o.trang_thai = 'dang_phuc_vu'
            `, [req.params.id]);
            
            if (orderCheck[0].itemCount === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Không thể chuyển bàn sang "Đang phục vụ" vì bàn chưa có món ăn (chưa có order nào đang hoạt động).' 
                });
            }
        }

        const [result] = await db.query(
            'UPDATE ban SET ten_ban = ?, so_cho = ?, vi_tri = ?, trang_thai = ? WHERE ma_ban = ?',
            [ten_ban, so_cho, vi_tri, trang_thai, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bàn để cập nhật' });
        }

        res.json({ success: true, message: 'Cập nhật bàn thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật bàn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật bàn' });
    }
});

// Xóa bàn
router.delete('/:id', async (req, res) => {
    try {
        // Kiểm tra xem bàn có đang được sử dụng hay không (có order chưa thanh toán, hoặc đã đặt)
        const [checkStatus] = await db.query('SELECT trang_thai FROM ban WHERE ma_ban = ?', [req.params.id]);
        if (checkStatus.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
        }
        
        if (checkStatus[0].trang_thai !== 'trong') {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa bàn đang được sử dụng hoặc đã đặt trước. Vui lòng chuyển trạng thái bàn về "Trống" trước khi xóa.' 
            });
        }

        const [result] = await db.query('DELETE FROM ban WHERE ma_ban = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bàn để xóa' });
        }

        res.json({ success: true, message: 'Xóa bàn thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa bàn:', error);
        // Bắt lỗi constraints foreign key nếu bảng này liên kết sang don_hang, order_nha_hang...
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa bàn này vì đã có dữ liệu lịch sử hóa đơn/đặt bàn liên quan.' 
            });
        }
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa bàn' });
    }
});

module.exports = router;
