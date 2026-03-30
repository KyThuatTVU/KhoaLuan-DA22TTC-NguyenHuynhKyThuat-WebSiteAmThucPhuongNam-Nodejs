const db = require('../config/database');

const kitchenSlipController = {
    // Lấy danh sách phiếu kê đồ
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT pk.*, nv.ten_nhan_vien 
                FROM phieu_ke_do pk 
                LEFT JOIN nhan_vien nv ON pk.ma_nhan_vien = nv.ma_nhan_vien 
                ORDER BY pk.thoi_gian_tao DESC
            `);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching kitchen slips:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    },

    // Lấy chi tiết 1 phiếu
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const [slip] = await db.query(`
                SELECT pk.*, nv.ten_nhan_vien 
                FROM phieu_ke_do pk 
                LEFT JOIN nhan_vien nv ON pk.ma_nhan_vien = nv.ma_nhan_vien 
                WHERE pk.ma_phieu_ke = ?
            `, [id]);

            if (slip.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu kê' });
            }

            const [items] = await db.query(`
                SELECT ct.*, nl.ten_nguyen_lieu, nl.don_vi_tinh, nl.muc_canh_bao
                FROM chi_tiet_phieu_ke ct
                JOIN nguyen_lieu nl ON ct.ma_nguyen_lieu = nl.ma_nguyen_lieu
                WHERE ct.ma_phieu_ke = ?
            `, [id]);

            res.json({ success: true, data: { ...slip[0], items } });
        } catch (error) {
            console.error('Error fetching kitchen slip detail:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    },

    // Tạo phiếu kê đồ mới
    create: async (req, res) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const { ngay_ke, ghi_chu, items } = req.body;

            if (!items || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Phiếu kê phải có ít nhất 1 nguyên liệu' });
            }

            // Lấy mã nhân viên từ session nếu có
            const ma_nhan_vien = req.session?.adminUser?.id || null;

            const [result] = await conn.query(
                'INSERT INTO phieu_ke_do (ngay_ke, ma_nhan_vien, ghi_chu) VALUES (?, ?, ?)',
                [ngay_ke || new Date().toISOString().split('T')[0], ma_nhan_vien, ghi_chu]
            );

            const ma_phieu_ke = result.insertId;

            for (const item of items) {
                await conn.query(
                    'INSERT INTO chi_tiet_phieu_ke (ma_phieu_ke, ma_nguyen_lieu, so_luong_con_lai, so_luong_can_nhap, ghi_chu) VALUES (?, ?, ?, ?, ?)',
                    [ma_phieu_ke, item.ma_nguyen_lieu, item.so_luong_con_lai, item.so_luong_can_nhap, item.ghi_chu || null]
                );
            }

            await conn.commit();
            res.json({ success: true, message: 'Tạo phiếu kê đồ thành công', data: { ma_phieu_ke } });
        } catch (error) {
            await conn.rollback();
            console.error('Error creating kitchen slip:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        } finally {
            conn.release();
        }
    },

    // Duyệt phiếu
    approve: async (req, res) => {
        try {
            const { id } = req.params;
            const [result] = await db.query(
                'UPDATE phieu_ke_do SET trang_thai = "da_duyet" WHERE ma_phieu_ke = ? AND trang_thai = "cho_duyet"',
                [id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hoặc phiếu đã duyệt' });
            }
            res.json({ success: true, message: 'Đã duyệt phiếu kê đồ' });
        } catch (error) {
            console.error('Error approving slip:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    },

    // Xóa phiếu
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const [result] = await db.query('DELETE FROM phieu_ke_do WHERE ma_phieu_ke = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu' });
            }
            res.json({ success: true, message: 'Xóa phiếu thành công' });
        } catch (error) {
            console.error('Error deleting slip:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    }
};

module.exports = kitchenSlipController;
