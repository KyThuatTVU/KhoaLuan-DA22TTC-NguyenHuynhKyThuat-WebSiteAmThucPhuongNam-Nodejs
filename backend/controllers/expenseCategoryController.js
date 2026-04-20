const db = require('../config/database');

// Lấy danh sách loại chi phí
exports.getCategories = async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT 
                ma_loai_chi_phi,
                ten_loai_chi_phi,
                mo_ta,
                mau_sac,
                icon,
                thu_tu_hien_thi,
                trang_thai,
                ngay_tao
            FROM loai_chi_phi 
            WHERE trang_thai = 'active'
            ORDER BY thu_tu_hien_thi ASC, ten_loai_chi_phi ASC
        `);
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách loại chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách loại chi phí',
            error: error.message
        });
    }
};

// Lấy chi tiết một loại chi phí
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [categories] = await db.query(`
            SELECT * FROM loai_chi_phi WHERE ma_loai_chi_phi = ?
        `, [id]);
        
        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại chi phí'
            });
        }
        
        res.json({
            success: true,
            data: categories[0]
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết loại chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Thêm loại chi phí mới
exports.createCategory = async (req, res) => {
    try {
        const {
            ten_loai_chi_phi,
            mo_ta,
            mau_sac,
            icon,
            thu_tu_hien_thi
        } = req.body;
        
        // Validate
        if (!ten_loai_chi_phi) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên loại chi phí'
            });
        }
        
        // Kiểm tra trùng tên
        const [existing] = await db.query(
            'SELECT ma_loai_chi_phi FROM loai_chi_phi WHERE ten_loai_chi_phi = ?',
            [ten_loai_chi_phi]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Tên loại chi phí đã tồn tại'
            });
        }
        
        const [result] = await db.query(`
            INSERT INTO loai_chi_phi 
            (ten_loai_chi_phi, mo_ta, mau_sac, icon, thu_tu_hien_thi)
            VALUES (?, ?, ?, ?, ?)
        `, [
            ten_loai_chi_phi,
            mo_ta || null,
            mau_sac || '#6b7280',
            icon || 'fas fa-money-bill-wave',
            thu_tu_hien_thi || 0
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Thêm loại chi phí thành công',
            data: {
                ma_loai_chi_phi: result.insertId
            }
        });
    } catch (error) {
        console.error('Lỗi thêm loại chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm loại chi phí',
            error: error.message
        });
    }
};

// Cập nhật loại chi phí
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            ten_loai_chi_phi,
            mo_ta,
            mau_sac,
            icon,
            thu_tu_hien_thi,
            trang_thai
        } = req.body;
        
        // Kiểm tra tồn tại
        const [existing] = await db.query(
            'SELECT * FROM loai_chi_phi WHERE ma_loai_chi_phi = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại chi phí'
            });
        }
        
        // Kiểm tra trùng tên (trừ chính nó)
        if (ten_loai_chi_phi) {
            const [duplicate] = await db.query(
                'SELECT ma_loai_chi_phi FROM loai_chi_phi WHERE ten_loai_chi_phi = ? AND ma_loai_chi_phi != ?',
                [ten_loai_chi_phi, id]
            );
            
            if (duplicate.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên loại chi phí đã tồn tại'
                });
            }
        }
        
        await db.query(`
            UPDATE loai_chi_phi 
            SET ten_loai_chi_phi = ?,
                mo_ta = ?,
                mau_sac = ?,
                icon = ?,
                thu_tu_hien_thi = ?,
                trang_thai = ?
            WHERE ma_loai_chi_phi = ?
        `, [
            ten_loai_chi_phi || existing[0].ten_loai_chi_phi,
            mo_ta !== undefined ? mo_ta : existing[0].mo_ta,
            mau_sac || existing[0].mau_sac,
            icon || existing[0].icon,
            thu_tu_hien_thi !== undefined ? thu_tu_hien_thi : existing[0].thu_tu_hien_thi,
            trang_thai || existing[0].trang_thai,
            id
        ]);
        
        res.json({
            success: true,
            message: 'Cập nhật loại chi phí thành công'
        });
    } catch (error) {
        console.error('Lỗi cập nhật loại chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật loại chi phí',
            error: error.message
        });
    }
};

// Xóa loại chi phí (soft delete)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra tồn tại
        const [existing] = await db.query(
            'SELECT * FROM loai_chi_phi WHERE ma_loai_chi_phi = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại chi phí'
            });
        }
        
        // Kiểm tra có chi phí nào đang sử dụng không
        const [inUse] = await db.query(
            'SELECT COUNT(*) as count FROM chi_phi_hang_ngay WHERE ma_loai_chi_phi = ?',
            [id]
        );
        
        if (inUse[0].count > 0) {
            // Soft delete - chỉ ẩn đi
            await db.query(
                'UPDATE loai_chi_phi SET trang_thai = "inactive" WHERE ma_loai_chi_phi = ?',
                [id]
            );
            
            return res.json({
                success: true,
                message: 'Đã ẩn loại chi phí (vì có dữ liệu đang sử dụng)'
            });
        } else {
            // Hard delete - xóa hoàn toàn
            await db.query('DELETE FROM loai_chi_phi WHERE ma_loai_chi_phi = ?', [id]);
            
            return res.json({
                success: true,
                message: 'Xóa loại chi phí thành công'
            });
        }
    } catch (error) {
        console.error('Lỗi xóa loại chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa loại chi phí',
            error: error.message
        });
    }
};

// Thống kê sử dụng loại chi phí
exports.getCategoryStats = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                lcp.ma_loai_chi_phi,
                lcp.ten_loai_chi_phi,
                lcp.mau_sac,
                lcp.icon,
                COUNT(cp.ma_chi_phi) as so_luong_su_dung,
                COALESCE(SUM(cp.so_tien), 0) as tong_chi_phi,
                MAX(cp.ngay_chi) as ngay_su_dung_gan_nhat
            FROM loai_chi_phi lcp
            LEFT JOIN chi_phi_hang_ngay cp ON lcp.ma_loai_chi_phi = cp.ma_loai_chi_phi
            WHERE lcp.trang_thai = 'active'
            GROUP BY lcp.ma_loai_chi_phi
            ORDER BY tong_chi_phi DESC
        `);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Lỗi thống kê loại chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};