const db = require('../config/database');

// Lấy danh sách chi phí theo ngày
exports.getExpensesByDate = async (req, res) => {
    try {
        const { ngay } = req.query;
        
        let query = `
            SELECT 
                cp.*,
                nv.ten_nhan_vien as nguoi_tao_ten
            FROM chi_phi_hang_ngay cp
            LEFT JOIN nhan_vien nv ON cp.nguoi_tao = nv.ma_nhan_vien
            WHERE 1=1
        `;
        
        const params = [];
        
        if (ngay) {
            query += ' AND DATE(cp.ngay_chi) = ?';
            params.push(ngay);
        }
        
        query += ' ORDER BY cp.ngay_chi DESC, cp.ngay_tao DESC';
        
        const [expenses] = await db.query(query, params);
        
        // Tính tổng chi phí
        const tongChi = expenses.reduce((sum, item) => sum + parseFloat(item.so_tien), 0);
        
        res.json({
            success: true,
            data: expenses,
            tongChi: tongChi
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách chi phí',
            error: error.message
        });
    }
};

// Lấy chi phí theo khoảng thời gian
exports.getExpensesByDateRange = async (req, res) => {
    try {
        const { tu_ngay, den_ngay } = req.query;
        
        if (!tu_ngay || !den_ngay) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp từ ngày và đến ngày'
            });
        }
        
        const query = `
            SELECT 
                cp.*,
                nv.ten_nhan_vien as nguoi_tao_ten
            FROM chi_phi_hang_ngay cp
            LEFT JOIN nhan_vien nv ON cp.nguoi_tao = nv.ma_nhan_vien
            WHERE DATE(cp.ngay_chi) BETWEEN ? AND ?
            ORDER BY cp.ngay_chi DESC, cp.ngay_tao DESC
        `;
        
        const [expenses] = await db.query(query, [tu_ngay, den_ngay]);
        
        // Tính tổng chi phí
        const tongChi = expenses.reduce((sum, item) => sum + parseFloat(item.so_tien), 0);
        
        // Thống kê theo loại chi phí
        const thongKeTheoLoai = expenses.reduce((acc, item) => {
            const loai = item.loai_chi_phi;
            if (!acc[loai]) {
                acc[loai] = {
                    loai: loai,
                    so_luong: 0,
                    tong_tien: 0
                };
            }
            acc[loai].so_luong++;
            acc[loai].tong_tien += parseFloat(item.so_tien);
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: expenses,
            tongChi: tongChi,
            thongKeTheoLoai: Object.values(thongKeTheoLoai)
        });
    } catch (error) {
        console.error('Lỗi lấy chi phí theo khoảng thời gian:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi phí',
            error: error.message
        });
    }
};

// Lấy chi tiết một chi phí
exports.getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                cp.*,
                nv.ten_nhan_vien as nguoi_tao_ten
            FROM chi_phi_hang_ngay cp
            LEFT JOIN nhan_vien nv ON cp.nguoi_tao = nv.ma_nhan_vien
            WHERE cp.ma_chi_phi = ?
        `;
        
        const [expenses] = await db.query(query, [id]);
        
        if (expenses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chi phí'
            });
        }
        
        res.json({
            success: true,
            data: expenses[0]
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết chi phí',
            error: error.message
        });
    }
};

// Thêm chi phí mới
exports.createExpense = async (req, res) => {
    try {
        const {
            ngay_chi,
            loai_chi_phi,
            ten_chi_phi,
            so_tien,
            mo_ta,
            nguoi_nhan,
            phuong_thuc_thanh_toan,
            nguoi_tao
        } = req.body;
        
        // Validate
        if (!ngay_chi || !loai_chi_phi || !ten_chi_phi || !so_tien) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
            });
        }
        
        if (parseFloat(so_tien) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền phải lớn hơn 0'
            });
        }
        
        // Tìm ma_loai_chi_phi từ tên loại chi phí
        let ma_loai_chi_phi = null;
        try {
            const [categoryResult] = await db.query(
                'SELECT ma_loai_chi_phi FROM loai_chi_phi WHERE ten_loai_chi_phi = ? AND trang_thai = "active"',
                [loai_chi_phi]
            );
            if (categoryResult.length > 0) {
                ma_loai_chi_phi = categoryResult[0].ma_loai_chi_phi;
            }
        } catch (err) {
            console.warn('Could not find category ID, using name only:', err.message);
        }
        
        const query = `
            INSERT INTO chi_phi_hang_ngay 
            (ngay_chi, loai_chi_phi, ma_loai_chi_phi, ten_chi_phi, so_tien, mo_ta, nguoi_nhan, phuong_thuc_thanh_toan, nguoi_tao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.query(query, [
            ngay_chi,
            loai_chi_phi,
            ma_loai_chi_phi,
            ten_chi_phi,
            so_tien,
            mo_ta || null,
            nguoi_nhan || null,
            phuong_thuc_thanh_toan || 'Tiền mặt',
            nguoi_tao || null
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Thêm chi phí thành công',
            data: {
                ma_chi_phi: result.insertId
            }
        });
    } catch (error) {
        console.error('Lỗi thêm chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm chi phí',
            error: error.message
        });
    }
};

// Cập nhật chi phí
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            ngay_chi,
            loai_chi_phi,
            ten_chi_phi,
            so_tien,
            mo_ta,
            nguoi_nhan,
            phuong_thuc_thanh_toan
        } = req.body;
        
        // Kiểm tra chi phí có tồn tại
        const [existing] = await db.query(
            'SELECT * FROM chi_phi_hang_ngay WHERE ma_chi_phi = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chi phí'
            });
        }
        
        // Validate
        if (!ngay_chi || !loai_chi_phi || !ten_chi_phi || !so_tien) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
            });
        }
        
        if (parseFloat(so_tien) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền phải lớn hơn 0'
            });
        }
        
        // Tìm ma_loai_chi_phi từ tên loại chi phí
        let ma_loai_chi_phi = null;
        try {
            const [categoryResult] = await db.query(
                'SELECT ma_loai_chi_phi FROM loai_chi_phi WHERE ten_loai_chi_phi = ? AND trang_thai = "active"',
                [loai_chi_phi]
            );
            if (categoryResult.length > 0) {
                ma_loai_chi_phi = categoryResult[0].ma_loai_chi_phi;
            }
        } catch (err) {
            console.warn('Could not find category ID, using name only:', err.message);
        }
        
        const query = `
            UPDATE chi_phi_hang_ngay 
            SET ngay_chi = ?,
                loai_chi_phi = ?,
                ma_loai_chi_phi = ?,
                ten_chi_phi = ?,
                so_tien = ?,
                mo_ta = ?,
                nguoi_nhan = ?,
                phuong_thuc_thanh_toan = ?
            WHERE ma_chi_phi = ?
        `;
        
        await db.query(query, [
            ngay_chi,
            loai_chi_phi,
            ma_loai_chi_phi,
            ten_chi_phi,
            so_tien,
            mo_ta || null,
            nguoi_nhan || null,
            phuong_thuc_thanh_toan || 'Tiền mặt',
            id
        ]);
        
        res.json({
            success: true,
            message: 'Cập nhật chi phí thành công'
        });
    } catch (error) {
        console.error('Lỗi cập nhật chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật chi phí',
            error: error.message
        });
    }
};

// Xóa chi phí
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra chi phí có tồn tại
        const [existing] = await db.query(
            'SELECT * FROM chi_phi_hang_ngay WHERE ma_chi_phi = ?',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chi phí'
            });
        }
        
        await db.query('DELETE FROM chi_phi_hang_ngay WHERE ma_chi_phi = ?', [id]);
        
        res.json({
            success: true,
            message: 'Xóa chi phí thành công'
        });
    } catch (error) {
        console.error('Lỗi xóa chi phí:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa chi phí',
            error: error.message
        });
    }
};

// Thống kê chi phí theo tháng
exports.getMonthlyExpenseStats = async (req, res) => {
    try {
        const { thang, nam } = req.query;
        
        if (!thang || !nam) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp tháng và năm'
            });
        }
        
        const query = `
            SELECT 
                loai_chi_phi,
                COUNT(*) as so_luong,
                SUM(so_tien) as tong_tien
            FROM chi_phi_hang_ngay
            WHERE MONTH(ngay_chi) = ? AND YEAR(ngay_chi) = ?
            GROUP BY loai_chi_phi
            ORDER BY tong_tien DESC
        `;
        
        const [stats] = await db.query(query, [thang, nam]);
        
        // Tổng chi phí trong tháng
        const tongChiThang = stats.reduce((sum, item) => sum + parseFloat(item.tong_tien), 0);
        
        res.json({
            success: true,
            data: stats,
            tongChiThang: tongChiThang
        });
    } catch (error) {
        console.error('Lỗi thống kê chi phí tháng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thống kê chi phí',
            error: error.message
        });
    }
};

// Lấy danh sách loại chi phí
exports.getExpenseCategories = async (req, res) => {
    try {
        // Lấy từ database nếu có bảng loai_chi_phi
        const [categories] = await db.query(`
            SELECT ten_loai_chi_phi 
            FROM loai_chi_phi 
            WHERE trang_thai = 'active' 
            ORDER BY thu_tu_hien_thi ASC, ten_loai_chi_phi ASC
        `);
        
        if (categories.length > 0) {
            // Trả về từ database
            res.json({
                success: true,
                data: categories.map(c => c.ten_loai_chi_phi)
            });
        } else {
            // Fallback về danh sách cũ nếu chưa có dữ liệu
            const fallbackCategories = [
                'Nguyên liệu',
                'Điện nước',
                'Tiền thuê mặt bằng',
                'Lương nhân viên',
                'Bảo trì sửa chữa',
                'Marketing',
                'Văn phòng phẩm',
                'Vận chuyển',
                'Bảo hiểm',
                'Thuế phí',
                'Đào tạo nhân viên',
                'Khấu hao thiết bị',
                'Chi phí pháp lý',
                'Khác'
            ];
            
            res.json({
                success: true,
                data: fallbackCategories
            });
        }
    } catch (error) {
        console.error('Lỗi lấy danh sách loại chi phí:', error);
        
        // Fallback về danh sách cũ nếu có lỗi database
        const fallbackCategories = [
            'Nguyên liệu',
            'Điện nước',
            'Tiền thuê mặt bằng',
            'Lương nhân viên',
            'Bảo trì sửa chữa',
            'Marketing',
            'Văn phòng phẩm',
            'Vận chuyển',
            'Bảo hiểm',
            'Thuế phí',
            'Đào tạo nhân viên',
            'Khấu hao thiết bị',
            'Chi phí pháp lý',
            'Khác'
        ];
        
        res.json({
            success: true,
            data: fallbackCategories
        });
    }
};
