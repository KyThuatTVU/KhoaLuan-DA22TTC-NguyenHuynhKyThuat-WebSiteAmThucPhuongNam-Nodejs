const db = require('../config/database');

// Lấy danh sách phiếu nhập
const getImportReceipts = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT pn.*, nv.ten_nhan_vien 
            FROM phieu_nhap pn
            LEFT JOIN nhan_vien nv ON pn.ma_nhan_vien = nv.ma_nhan_vien
            ORDER BY pn.thoi_gian_nhap DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching import receipts:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy chi tiết một phiếu nhập
const getImportReceiptDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [receipt] = await db.query(`
            SELECT pn.*, nv.ten_nhan_vien 
            FROM phieu_nhap pn
            LEFT JOIN nhan_vien nv ON pn.ma_nhan_vien = nv.ma_nhan_vien
            WHERE pn.ma_phieu_nhap = ?
        `, [id]);

        if (receipt.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
        }

        const [items] = await db.query(`
            SELECT ctpn.*, nl.ten_nguyen_lieu, nl.don_vi_tinh as don_vi_xuat
            FROM chi_tiet_phieu_nhap ctpn
            JOIN nguyen_lieu nl ON ctpn.ma_nguyen_lieu = nl.ma_nguyen_lieu
            WHERE ctpn.ma_phieu_nhap = ?
        `, [id]);

        res.json({ success: true, data: { ...receipt[0], items } });
    } catch (error) {
        console.error('Error fetching receipt detail:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Tạo phiếu nhập mới (Mặc định hoàn tất và cập nhật kho luôn cho đơn giản, hoặc có thể tách luồng duyệt)
const createImportReceipt = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { ma_nhan_vien, nha_cung_cap, ghi_chu, items } = req.body; // items: [{ma_nguyen_lieu, so_luong_nhap, don_gia, don_vi_nhap}]

        if (!items || items.length === 0) {
            throw new Error('Danh sách hàng nhập không được trống');
        }

        // 1. Tính tổng tiền
        let tongTien = 0;
        items.forEach(item => {
            tongTien += (item.so_luong_nhap * item.don_gia);
        });

        // 2. Tạo phiếu nhập
        const [result] = await connection.query(
            'INSERT INTO phieu_nhap (ma_nhan_vien, ma_nha_cung_cap, nha_cung_cap, ghi_chu, tong_tien, trang_thai) VALUES (?, ?, ?, ?, ?, "hoan_tat")',
            [ma_nhan_vien || null, req.body.ma_nha_cung_cap || null, nha_cung_cap, ghi_chu, tongTien]
        );
        const maPhieuNhap = result.insertId;

        // 3. Thêm chi tiết và cập nhật kho
        for (const item of items) {
            await connection.query(
                'INSERT INTO chi_tiet_phieu_nhap (ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia, don_vi_nhap) VALUES (?, ?, ?, ?, ?)',
                [maPhieuNhap, item.ma_nguyen_lieu, item.so_luong_nhap, item.don_gia, item.don_vi_nhap]
            );

            // Lấy tỉ lệ quy đổi để cập nhật kho chính xác
            const [ing] = await connection.query('SELECT ti_le_chuyen_doi FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [item.ma_nguyen_lieu]);
            const conversionRate = ing[0] ? (ing[0].ti_le_chuyen_doi || 1) : 1;
            const actualAdded = item.so_luong_nhap * conversionRate;

            await connection.query(
                'UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton + ? WHERE ma_nguyen_lieu = ?',
                [actualAdded, item.ma_nguyen_lieu]
            );
        }

        // 4. Cập nhật số lượng món ăn tối đa có thể phục vụ
        const inventoryController = require('./inventoryController');
        await inventoryController.updateAllDishMaxPortions(connection);

        await connection.commit();
        res.json({ success: true, message: 'Nhập hàng thành công', ma_phieu_nhap: maPhieuNhap });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating import receipt:', error);
        res.status(500).json({ success: false, message: error.message || 'Lỗi server' });
    } finally {
        connection.release();
    }
};

// Xóa phiếu nhập (Cần hoàn kho)
const deleteImportReceipt = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Lấy chi tiết phiếu cũ để hoàn kho
        const [items] = await connection.query('SELECT * FROM chi_tiet_phieu_nhap WHERE ma_phieu_nhap = ?', [id]);
        
        for (const item of items) {
            const [ing] = await connection.query('SELECT ti_le_chuyen_doi FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [item.ma_nguyen_lieu]);
            const conversionRate = ing[0]?.ti_le_chuyen_doi || 1;
            const amountToSubtract = item.so_luong_nhap * conversionRate;

            // Cập nhật trừ kho
            await connection.query(
                'UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton - ? WHERE ma_nguyen_lieu = ?',
                [amountToSubtract, item.ma_nguyen_lieu]
            );
        }

        // 2. Xóa chi tiết và phiếu
        await connection.query('DELETE FROM chi_tiet_phieu_nhap WHERE ma_phieu_nhap = ?', [id]);
        const [result] = await connection.query('DELETE FROM phieu_nhap WHERE ma_phieu_nhap = ?', [id]);

        if (result.affectedRows === 0) throw new Error('Không tìm thấy phiếu nhập');

        // 3. Cập nhật lại định lượng món ăn
        const inventoryController = require('./inventoryController');
        await inventoryController.updateAllDishMaxPortions(connection);

        await connection.commit();
        res.json({ success: true, message: 'Đã xóa và hoàn kho thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting receipt:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// Cập nhật phiếu nhập (Hoàn kho cũ + Nhập kho mới)
const updateImportReceipt = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { ma_nhan_vien, ma_nha_cung_cap, nha_cung_cap, ghi_chu, items } = req.body;

        // 1. Hoàn kho cũ
        const [oldItems] = await connection.query('SELECT * FROM chi_tiet_phieu_nhap WHERE ma_phieu_nhap = ?', [id]);
        for (const item of oldItems) {
            const [ing] = await connection.query('SELECT ti_le_chuyen_doi FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [item.ma_nguyen_lieu]);
            const rate = ing[0]?.ti_le_chuyen_doi || 1;
            await connection.query('UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton - ? WHERE ma_nguyen_lieu = ?', [item.so_luong_nhap * rate, item.ma_nguyen_lieu]);
        }

        // 2. Xóa chi tiết cũ
        await connection.query('DELETE FROM chi_tiet_phieu_nhap WHERE ma_phieu_nhap = ?', [id]);

        // 3. Tính tổng tiền mới và cập nhật phiếu
        let tongTien = items.reduce((sum, it) => sum + (it.so_luong_nhap * it.don_gia), 0);
        await connection.query(
            'UPDATE phieu_nhap SET ma_nhan_vien = ?, ma_nha_cung_cap = ?, nha_cung_cap = ?, ghi_chu = ?, tong_tien = ? WHERE ma_phieu_nhap = ?',
            [ma_nhan_vien || null, ma_nha_cung_cap || null, nha_cung_cap, ghi_chu, tongTien, id]
        );

        // 4. Thêm chi tiết mới và cập nhật kho mới
        for (const item of items) {
            await connection.query(
                'INSERT INTO chi_tiet_phieu_nhap (ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia, don_vi_nhap) VALUES (?, ?, ?, ?, ?)',
                [id, item.ma_nguyen_lieu, item.so_luong_nhap, item.don_gia, item.don_vi_nhap]
            );

            const [ing] = await connection.query('SELECT ti_le_chuyen_doi FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [item.ma_nguyen_lieu]);
            const rate = ing[0]?.ti_le_chuyen_doi || 1;
            await connection.query('UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton + ? WHERE ma_nguyen_lieu = ?', [item.so_luong_nhap * rate, item.ma_nguyen_lieu]);
        }

        // 5. Cập nhật món ăn
        const inventoryController = require('./inventoryController');
        await inventoryController.updateAllDishMaxPortions(connection);

        await connection.commit();
        res.json({ success: true, message: 'Cập nhật phiếu nhập thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating receipt:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getImportReceipts,
    getImportReceiptDetail,
    createImportReceipt,
    deleteImportReceipt,
    updateImportReceipt
};
