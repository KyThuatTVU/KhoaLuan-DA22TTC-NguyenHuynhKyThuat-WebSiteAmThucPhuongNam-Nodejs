const db = require('../config/database');

const supplierController = {
    // Lấy danh sách tất cả nhà cung cấp
    getAllSuppliers: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM nha_cung_cap ORDER BY ngay_tao DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách nhà cung cấp' });
        }
    },

    // Lấy chi tiết một nhà cung cấp
    getSupplierById: async (req, res) => {
        try {
            const { id } = req.params;
            const [rows] = await db.query('SELECT * FROM nha_cung_cap WHERE ma_nha_cung_cap = ?', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error fetching supplier:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết nhà cung cấp' });
        }
    },

    // Tạo nhà cung cấp mới
    createSupplier: async (req, res) => {
        try {
            const { ten_nha_cung_cap, so_dien_thoai, email, dia_chi, ghi_chu } = req.body;
            
            if (!ten_nha_cung_cap || !so_dien_thoai) {
                return res.status(400).json({ success: false, message: 'Tên và số điện thoại là bắt buộc' });
            }

            const [result] = await db.query(
                'INSERT INTO nha_cung_cap (ten_nha_cung_cap, so_dien_thoai, email, dia_chi, ghi_chu) VALUES (?, ?, ?, ?, ?)',
                [ten_nha_cung_cap, so_dien_thoai, email, dia_chi, ghi_chu]
            );

            res.json({ 
                success: true, 
                message: 'Thêm nhà cung cấp thành công', 
                data: { ma_nha_cung_cap: result.insertId } 
            });
        } catch (error) {
            console.error('Error creating supplier:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi tạo nhà cung cấp' });
        }
    },

    // Cập nhật nhà cung cấp
    updateSupplier: async (req, res) => {
        try {
            const { id } = req.params;
            const { ten_nha_cung_cap, so_dien_thoai, email, dia_chi, ghi_chu, trang_thai } = req.body;

            if (!ten_nha_cung_cap || !so_dien_thoai) {
                return res.status(400).json({ success: false, message: 'Tên và số điện thoại là bắt buộc' });
            }

            const [result] = await db.query(
                `UPDATE nha_cung_cap 
                 SET ten_nha_cung_cap = ?, so_dien_thoai = ?, email = ?, dia_chi = ?, ghi_chu = ?, trang_thai = ?
                 WHERE ma_nha_cung_cap = ?`,
                [ten_nha_cung_cap, so_dien_thoai, email, dia_chi, ghi_chu, trang_thai, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp để cập nhật' });
            }

            res.json({ success: true, message: 'Cập nhật nhà cung cấp thành công' });
        } catch (error) {
            console.error('Error updating supplier:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật nhà cung cấp' });
        }
    },

    // Xóa nhà cung cấp (hoặc chuyển trạng thái ngừng hợp tác)
    deleteSupplier: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Kiểm tra xem nhà cung cấp có phiếu nhập nào chưa
            const [imports] = await db.query('SELECT COUNT(*) as count FROM phieu_nhap WHERE ma_nha_cung_cap = ?', [id]);
            
            if (imports[0].count > 0) {
                // Nếu đã có giao dịch, chỉ cho phép ẩn đi (ngừng hợp tác)
                await db.query('UPDATE nha_cung_cap SET trang_thai = "ngung_hop_tac" WHERE ma_nha_cung_cap = ?', [id]);
                return res.json({ success: true, message: 'Nhà cung cấp đã có giao dịch, chuyển sang trạng thái Ngừng hợp tác' });
            }

            const [result] = await db.query('DELETE FROM nha_cung_cap WHERE ma_nha_cung_cap = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp để xóa' });
            }

            res.json({ success: true, message: 'Xóa nhà cung cấp thành công' });
        } catch (error) {
            console.error('Error deleting supplier:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi xóa nhà cung cấp' });
        }
    }
};

module.exports = supplierController;
