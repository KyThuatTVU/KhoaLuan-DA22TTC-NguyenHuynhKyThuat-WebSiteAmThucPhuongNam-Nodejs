/**
 * Payroll Controller - Quản lý lương nhân viên (Lương = Lương cơ bản + Giờ làm * Ráp + Thưởng - Phạt)
 */
const db = require('../config/database');

// Lấy danh sách bảng lương theo tháng/năm
const getPayrollReports = async (req, res) => {
    try {
        const { thang, nam, store } = req.query;
        let query = `
            SELECT bl.*, nv.ten_nhan_vien, nv.ma_nv_code, nv.vai_tro
            FROM bang_luong bl
            JOIN nhan_vien nv ON bl.ma_nhan_vien = nv.ma_nhan_vien
            WHERE nv.is_deleted = 0
        `;
        const params = [];

        if (thang) {
            query += ' AND bl.thang = ?';
            params.push(thang);
        }
        if (nam) {
            query += ' AND bl.nam = ?';
            params.push(nam);
        }

        query += ' ORDER BY bl.nam DESC, bl.thang DESC';
        const [reports] = await db.query(query, params);
        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Tạo bảng lương tự động dựa trên chấm công và hồ sơ nhân viên
const generatePayroll = async (req, res) => {
    try {
        const { thang, nam } = req.body;
        
        if (!thang || !nam) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin tháng/năm' });
        }

        // 1. Lấy danh sách nhân viên còn hoạt động
        const [staff] = await db.query(`
            SELECT ma_nhan_vien, ten_nhan_vien, luong_theo_gio, luong_co_ban 
            FROM nhan_vien 
            WHERE is_deleted = 0 AND trang_thai = 1
        `);
        
        let createdCount = 0;
        let updatedCount = 0;

        for (const s of staff) {
            // 2. Tính tổng giờ làm và số ngày làm việc trong tháng/năm từ bảng cham_cong
            const [[attendance]] = await db.query(`
                SELECT SUM(so_gio_lam) as tong_gio, COUNT(DISTINCT ngay) as tong_ngay
                FROM cham_cong 
                WHERE ma_nhan_vien = ? 
                AND MONTH(ngay) = ? 
                AND YEAR(ngay) = ?
            `, [s.ma_nhan_vien, thang, nam]);

            const tongGio = attendance.tong_gio || 0;
            const tongNgayLam = attendance.tong_ngay || 0;
            const luongTheoGio = s.luong_theo_gio || 0;
            
            // Tính Lương cơ bản được chiết khấu theo số ngày thực tế đi làm
            // Tháng trong Javascript (Date(year, monthIndex, 0)) sẽ trả về ngày cuối cùng của tháng đó.
            const soNgayTrongThang = new Date(nam, thang, 0).getDate();
            const luongCoBanGoc = parseFloat(s.luong_co_ban || 0);
            
            // Công thức: Lấy tiền lương chia cho số ngày trong tháng đó và nhân lại cho số ngày thực tế đã làm
            let luongCoBan = luongCoBanGoc;
            if (luongCoBanGoc > 0) {
                // Đảm bảo không vượt quá 100% nếu số ngày làm lớn hơn ngày của tháng do lỗi nhập
                const daysToCalculate = Math.min(tongNgayLam, soNgayTrongThang);
                luongCoBan = (luongCoBanGoc / soNgayTrongThang) * daysToCalculate;
            }

            // 3. Kiểm tra bản ghi lương hiện tại để giữ lại Thưởng/Phạt nếu đã nhập thủ công
            const [existing] = await db.query(
                'SELECT * FROM bang_luong WHERE ma_nhan_vien = ? AND thang = ? AND nam = ?',
                [s.ma_nhan_vien, thang, nam]
            );

            const thuong = existing.length > 0 ? existing[0].thuong : 0;
            const phat = existing.length > 0 ? existing[0].phat : 0;

            // Công thức: Lương = Lương cơ bản + (Giờ làm * Giá giờ) + Thưởng - Phạt
            const tongLuong = (parseFloat(luongCoBan) + (tongGio * luongTheoGio) + parseFloat(thuong) - parseFloat(phat)).toFixed(2);

            if (existing.length > 0) {
                await db.query(`
                    UPDATE bang_luong 
                    SET luong_co_ban = ?, tong_gio_lam = ?, luong_theo_gio = ?, tong_luong = ?
                    WHERE ma_luong = ?
                `, [luongCoBan, tongGio, luongTheoGio, tongLuong, existing[0].ma_luong]);
                updatedCount++;
            } else {
                await db.query(`
                    INSERT INTO bang_luong (ma_nhan_vien, thang, nam, luong_co_ban, tong_gio_lam, luong_theo_gio, thuong, phat, tong_luong, trang_thai)
                    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'chua_thanh_toan')
                `, [s.ma_nhan_vien, thang, nam, luongCoBan, tongGio, luongTheoGio, tongLuong]);
                createdCount++;
            }
        }

        res.json({ 
            success: true, 
            message: `Tính lương xong: Thêm mới ${createdCount}, Cập nhật ${updatedCount}` 
        });
    } catch (error) {
        console.error('Generate Payroll Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật chi tiết bảng lương (Thưởng, Phạt, Trạng thái)
const updatePayrollReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { thuong, phat, phu_cap, khau_tru, trang_thai } = req.body;
        
        const [[report]] = await db.query('SELECT * FROM bang_luong WHERE ma_luong = ?', [id]);
        if (!report) return res.status(404).json({ success: false, message: 'Bản ghi không tồn tại' });

        // Chấp nhận cả thuong/phat hoặc phu_cap/khau_tru từ frontend
        const inputThuong = thuong !== undefined ? thuong : phu_cap;
        const inputPhat = phat !== undefined ? phat : khau_tru;

        const newThuong = inputThuong !== undefined ? parseFloat(inputThuong) : parseFloat(report.thuong);
        const newPhat = inputPhat !== undefined ? parseFloat(inputPhat) : parseFloat(report.phat);
        
        // Tính lại tổng lương
        const tongLuongMoi = (parseFloat(report.luong_co_ban) + (report.tong_gio_lam * report.luong_theo_gio) + newThuong - newPhat).toFixed(2);

        await db.query(`
            UPDATE bang_luong 
            SET thuong = ?, phat = ?, tong_luong = ?, trang_thai = ?
            WHERE ma_luong = ?
        `, [newThuong, newPhat, tongLuongMoi, trang_thai || report.trang_thai, id]);
        
        res.json({ success: true, message: 'Cập nhật bảng lương (Thưởng/Phạt) thành công!' });
    } catch (error) {
        console.error('Update Payroll Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Xóa bản ghi lương
const deletePayrollReport = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM bang_luong WHERE ma_luong = ?', [id]);
        res.json({ success: true, message: 'Xóa bản ghi lương thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPayrollReports,
    generatePayroll,
    updatePayrollReport,
    deletePayrollReport
};
