const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware xác thực token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Không có token xác thực'
        });
    }

    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Token không hợp lệ'
                });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi xác thực token'
        });
    }
};

// Lấy giỏ hàng của user hiện tại
router.get('/', authenticateToken, async (req, res) => {
    try {
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Lấy thông tin giỏ hàng active
        const [cartRows] = await db.query(
            'SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"',
            [ma_nguoi_dung]
        );

        if (cartRows.length === 0) {
            return res.json({
                success: true,
                data: {
                    ma_gio_hang: null,
                    items: [],
                    tong_tien: 0,
                    so_luong: 0
                }
            });
        }

        const cart = cartRows[0];

        // Lấy chi tiết giỏ hàng
        const [cartItems] = await db.query(`
            SELECT
                ct.ma_chi_tiet,
                ct.ma_mon,
                ct.so_luong,
                ct.gia_tai_thoi_diem,
                (ct.so_luong * ct.gia_tai_thoi_diem) as thanh_tien,
                m.ten_mon,
                m.anh_mon,
                m.don_vi_tinh
            FROM chi_tiet_gio_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            WHERE ct.ma_gio_hang = ?
            ORDER BY ct.ma_chi_tiet
        `, [cart.ma_gio_hang]);

        // Tính tổng tiền và số lượng
        const tong_tien = cartItems.reduce((sum, item) => sum + parseFloat(item.thanh_tien), 0);
        const so_luong = cartItems.reduce((sum, item) => sum + item.so_luong, 0);

        res.json({
            success: true,
            data: {
                ma_gio_hang: cart.ma_gio_hang,
                items: cartItems,
                tong_tien: tong_tien,
                so_luong: so_luong
            }
        });

    } catch (error) {
        console.error('Lỗi lấy giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Giới hạn số lượng tối đa mỗi món
const MAX_QUANTITY_PER_ITEM = 10;

// Thêm món vào giỏ hàng
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { ma_mon, so_luong = 1 } = req.body;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Validate input
        if (!ma_mon || so_luong < 1) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ'
            });
        }

        // Kiểm tra số lượng không vượt quá giới hạn
        if (so_luong > MAX_QUANTITY_PER_ITEM) {
            return res.status(400).json({
                success: false,
                message: `Mỗi món chỉ được đặt tối đa ${MAX_QUANTITY_PER_ITEM} phần`
            });
        }

        // Kiểm tra món ăn có tồn tại và còn hàng
        const [dishRows] = await db.query(
            'SELECT * FROM mon_an WHERE ma_mon = ? AND trang_thai = 1',
            [ma_mon]
        );

        if (dishRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Món ăn không tồn tại hoặc đã ngừng bán'
            });
        }

        const dish = dishRows[0];

        // Kiểm tra số lượng tồn kho
        if (dish.so_luong_ton < so_luong) {
            return res.status(400).json({
                success: false,
                message: 'Không đủ số lượng tồn kho'
            });
        }

        // Lấy hoặc tạo giỏ hàng active
        let [cartRows] = await db.query(
            'SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"',
            [ma_nguoi_dung]
        );

        let ma_gio_hang;
        if (cartRows.length === 0) {
            // Tạo giỏ hàng mới
            const [result] = await db.query(
                'INSERT INTO gio_hang (ma_nguoi_dung) VALUES (?)',
                [ma_nguoi_dung]
            );
            ma_gio_hang = result.insertId;
        } else {
            ma_gio_hang = cartRows[0].ma_gio_hang;
        }

        // Kiểm tra món đã có trong giỏ chưa
        const [existingItems] = await db.query(
            'SELECT * FROM chi_tiet_gio_hang WHERE ma_gio_hang = ? AND ma_mon = ?',
            [ma_gio_hang, ma_mon]
        );

        if (existingItems.length > 0) {
            // Cập nhật số lượng - kiểm tra giới hạn
            const newQuantity = existingItems[0].so_luong + so_luong;
            
            if (newQuantity > MAX_QUANTITY_PER_ITEM) {
                return res.status(400).json({
                    success: false,
                    message: `Mỗi món chỉ được đặt tối đa ${MAX_QUANTITY_PER_ITEM} phần. Hiện tại bạn đã có ${existingItems[0].so_luong} phần trong giỏ.`
                });
            }
            
            await db.query(
                'UPDATE chi_tiet_gio_hang SET so_luong = ? WHERE ma_chi_tiet = ?',
                [newQuantity, existingItems[0].ma_chi_tiet]
            );
        } else {
            // Thêm món mới
            await db.query(
                'INSERT INTO chi_tiet_gio_hang (ma_gio_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                [ma_gio_hang, ma_mon, so_luong, dish.gia_tien]
            );
        }

        res.json({
            success: true,
            message: 'Đã thêm vào giỏ hàng'
        });

    } catch (error) {
        console.error('Lỗi thêm vào giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Cập nhật số lượng món trong giỏ hàng
router.put('/update', authenticateToken, async (req, res) => {
    try {
        const { ma_chi_tiet, so_luong } = req.body;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Validate input
        if (!ma_chi_tiet || so_luong < 0) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ'
            });
        }

        // Kiểm tra giới hạn số lượng tối đa
        if (so_luong > MAX_QUANTITY_PER_ITEM) {
            return res.status(400).json({
                success: false,
                message: `Mỗi món chỉ được đặt tối đa ${MAX_QUANTITY_PER_ITEM} phần`
            });
        }

        // Kiểm tra quyền sở hữu item
        const [itemRows] = await db.query(`
            SELECT ct.*, g.ma_nguoi_dung
            FROM chi_tiet_gio_hang ct
            JOIN gio_hang g ON ct.ma_gio_hang = g.ma_gio_hang
            WHERE ct.ma_chi_tiet = ? AND g.trang_thai = "active"
        `, [ma_chi_tiet]);

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy item trong giỏ hàng'
            });
        }

        if (itemRows[0].ma_nguoi_dung !== ma_nguoi_dung) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập'
            });
        }

        // Kiểm tra tồn kho nếu tăng số lượng
        if (so_luong > 0) {
            const [dishRows] = await db.query(
                'SELECT so_luong_ton FROM mon_an WHERE ma_mon = ?',
                [itemRows[0].ma_mon]
            );

            if (dishRows.length > 0 && dishRows[0].so_luong_ton < so_luong) {
                return res.status(400).json({
                    success: false,
                    message: 'Không đủ số lượng tồn kho'
                });
            }
        }

        if (so_luong === 0) {
            // Xóa item nếu số lượng = 0
            await db.query('DELETE FROM chi_tiet_gio_hang WHERE ma_chi_tiet = ?', [ma_chi_tiet]);
        } else {
            // Cập nhật số lượng
            await db.query(
                'UPDATE chi_tiet_gio_hang SET so_luong = ? WHERE ma_chi_tiet = ?',
                [so_luong, ma_chi_tiet]
            );
        }

        res.json({
            success: true,
            message: 'Đã cập nhật giỏ hàng'
        });

    } catch (error) {
        console.error('Lỗi cập nhật giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Xóa món khỏi giỏ hàng
router.delete('/remove/:itemId', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.params;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Kiểm tra quyền sở hữu item
        const [itemRows] = await db.query(`
            SELECT ct.ma_chi_tiet, g.ma_nguoi_dung
            FROM chi_tiet_gio_hang ct
            JOIN gio_hang g ON ct.ma_gio_hang = g.ma_gio_hang
            WHERE ct.ma_chi_tiet = ? AND g.trang_thai = "active"
        `, [itemId]);

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy item trong giỏ hàng'
            });
        }

        if (itemRows[0].ma_nguoi_dung !== ma_nguoi_dung) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập'
            });
        }

        // Xóa item
        await db.query('DELETE FROM chi_tiet_gio_hang WHERE ma_chi_tiet = ?', [itemId]);

        res.json({
            success: true,
            message: 'Đã xóa khỏi giỏ hàng'
        });

    } catch (error) {
        console.error('Lỗi xóa khỏi giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Xóa toàn bộ giỏ hàng
router.delete('/clear', authenticateToken, async (req, res) => {
    try {
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Lấy giỏ hàng active
        const [cartRows] = await db.query(
            'SELECT ma_gio_hang FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"',
            [ma_nguoi_dung]
        );

        if (cartRows.length > 0) {
            // Xóa tất cả items trong giỏ
            await db.query('DELETE FROM chi_tiet_gio_hang WHERE ma_gio_hang = ?', [cartRows[0].ma_gio_hang]);

            // Có thể đánh dấu giỏ hàng là abandoned thay vì xóa
            // await db.query('UPDATE gio_hang SET trang_thai = "abandoned" WHERE ma_gio_hang = ?', [cartRows[0].ma_gio_hang]);
        }

        res.json({
            success: true,
            message: 'Đã xóa toàn bộ giỏ hàng'
        });

    } catch (error) {
        console.error('Lỗi xóa giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Đánh dấu giỏ hàng là đã đặt (gọi sau khi thanh toán thành công)
router.post('/mark-ordered', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Lấy cart active hiện tại
        const [cartRows] = await connection.query(
            'SELECT ma_gio_hang FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"',
            [ma_nguoi_dung]
        );

        if (cartRows.length > 0) {
            const ma_gio_hang = cartRows[0].ma_gio_hang;

            // Đánh dấu cart cũ là "ordered"
            await connection.query(
                'UPDATE gio_hang SET trang_thai = "ordered" WHERE ma_gio_hang = ?',
                [ma_gio_hang]
            );

            // Tạo cart mới cho user
            await connection.query(
                'INSERT INTO gio_hang (ma_nguoi_dung, trang_thai) VALUES (?, "active")',
                [ma_nguoi_dung]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã cập nhật giỏ hàng'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Lỗi đánh dấu giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;