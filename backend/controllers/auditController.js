const db = require('../config/database');

// Lấy danh sách phiếu kiểm kê
const getAuditSessions = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT kk.*, nv.ten_nhan_vien 
            FROM kiem_ke kk
            LEFT JOIN nhan_vien nv ON kk.ma_nhan_vien = nv.ma_nhan_vien
            ORDER BY kk.thoi_gian_kiem_ke DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching audit sessions:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy chi tiết một phiếu kiểm kê
const getAuditDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [audit] = await db.query(`
            SELECT kk.*, nv.ten_nhan_vien 
            FROM kiem_ke kk
            LEFT JOIN nhan_vien nv ON kk.ma_nhan_vien = nv.ma_nhan_vien
            WHERE kk.ma_kiem_ke = ?
        `, [id]);

        if (audit.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu kiểm kê' });
        }

        const [items] = await db.query(`
            SELECT ctkk.*, nl.ten_nguyen_lieu, nl.don_vi_tinh
            FROM chi_tiet_kiem_ke ctkk
            JOIN nguyen_lieu nl ON ctkk.ma_nguyen_lieu = nl.ma_nguyen_lieu
            WHERE ctkk.ma_kiem_ke = ?
        `, [id]);

        res.json({ success: true, data: { ...audit[0], items } });
    } catch (error) {
        console.error('Error fetching audit detail:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Tạo phiếu kiểm kê mới và cập nhật lại kho thực tế
const createAuditSession = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { ma_nhan_vien, ghi_chu, items } = req.body; // items: [{ma_nguyen_lieu, so_luong_thuc_te, ly_do}]

        if (!items || items.length === 0) {
            throw new Error('Danh sách kiểm kê không được trống');
        }

        // 1. Tạo phiếu kiểm kê
        const [result] = await connection.query(
            'INSERT INTO kiem_ke (ma_nhan_vien, ghi_chu, trang_thai) VALUES (?, ?, "hoan_tat")',
            [ma_nhan_vien || null, ghi_chu]
        );
        const maKiemKe = result.insertId;

        // 2. Thêm chi tiết và cập nhật kho thực tế
        for (const item of items) {
            // Lấy số lượng hệ thống hiện tại trước khi cập nhật
            const [ing] = await connection.query('SELECT so_luong_ton FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [item.ma_nguyen_lieu]);
            const systemStock = ing[0] ? (ing[0].so_luong_ton || 0) : 0;
            const discrepancy = item.so_luong_thuc_te - systemStock;

            await connection.query(
                `INSERT INTO chi_tiet_kiem_ke 
                (ma_kiem_ke, ma_nguyen_lieu, so_luong_he_thong, so_luong_thuc_te, chenh_lech, ly_do) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [maKiemKe, item.ma_nguyen_lieu, systemStock, item.so_luong_thuc_te, discrepancy, item.ly_do || 'Kiểm kê cuối ngày']
            );

            // Cập nhật lại kho chính xác theo số liệu đếm tay (thực tế)
            await connection.query(
                'UPDATE nguyen_lieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?',
                [item.so_luong_thuc_te, item.ma_nguyen_lieu]
            );
        }

        // 3. Cập nhật số lượng món ăn tối đa có thể phục vụ
        const inventoryController = require('./inventoryController');
        await inventoryController.updateAllDishMaxPortions(connection);

        await connection.commit();
        res.json({ success: true, message: 'Hoàn tất kiểm kê kho', ma_kiem_ke: maKiemKe });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating audit session:', error);
        res.status(500).json({ success: false, message: error.message || 'Lỗi server' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getAuditSessions,
    getAuditDetail,
    createAuditSession
};
