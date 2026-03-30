const db = require('../config/database');
const inventoryController = require('./inventoryController');

// Lấy danh sách lịch sử hao hụt
const getAllWastage = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT h.*, nl.ten_nguyen_lieu, nv.ten_nhan_vien
            FROM hao_hut_nguyen_lieu h
            JOIN nguyen_lieu nl ON h.ma_nguyen_lieu = nl.ma_nguyen_lieu
            LEFT JOIN nhan_vien nv ON h.ma_nhan_vien = nv.ma_nhan_vien
            ORDER BY h.thoi_gian DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching wastage:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Tạo báo cáo hao hụt mới
const createWastageReport = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { ma_nguyen_lieu, so_luong_hao_hut, ly_do, ma_nhan_vien } = req.body;
        const hinh_anh = req.file ? `uploads/wastage/${req.file.filename}` : null;

        if (!ma_nguyen_lieu || !so_luong_hao_hut) {
            throw new Error('Thiếu thông tin nguyên liệu hoặc số lượng hao hụt');
        }

        // 1. Lấy đơn vị tính để lưu trữ cho đồng bộ
        const [ing] = await connection.query('SELECT don_vi_tinh, so_luong_ton FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [ma_nguyen_lieu]);
        if (ing.length === 0) throw new Error('Không tìm thấy nguyên liệu');
        
        const don_vi_tinh = ing[0].don_vi_tinh;
        const currentStock = parseFloat(ing[0].so_luong_ton);

        // Nếu số lượng báo cáo hao hụt lớn hơn tồn kho thực tế, ta chỉ trừ tối đa số lượng đang có
        let finalWastage = parseFloat(so_luong_hao_hut);
        if (currentStock < finalWastage) {
            finalWastage = currentStock;
        }

        if (finalWastage <= 0 && parseFloat(so_luong_hao_hut) > 0) {
            throw new Error('Tồn kho hiện tại đã bằng 0, không thể báo cáo thêm hao hụt.');
        }

        // 2. Lưu vào bảng hao hụt (lưu số lượng thực tế bị trừ)
        await connection.query(
            `INSERT INTO hao_hut_nguyen_lieu (ma_nguyen_lieu, so_luong_hao_hut, don_vi_tinh, ly_do, hinh_anh, ma_nhan_vien)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ma_nguyen_lieu, finalWastage, don_vi_tinh, ly_do, hinh_anh, ma_nhan_vien || null]
        );

        // 3. Trừ kho nguyên liệu
        await connection.query(
            'UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton - ? WHERE ma_nguyen_lieu = ?',
            [finalWastage, ma_nguyen_lieu]
        );

        // 4. Cập nhật lại số lượng món ăn tối đa có thể phục vụ
        await inventoryController.updateAllDishMaxPortions(connection);

        await connection.commit();
        res.json({ success: true, message: 'Đã ghi nhận hao hụt và cập nhật kho thành công' });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating wastage report:', error);
        res.status(500).json({ success: false, message: error.message || 'Lỗi server' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getAllWastage,
    createWastageReport
};
