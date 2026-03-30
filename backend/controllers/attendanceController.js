/**
 * Attendance Controller - Chấm công nhân viên (Có tự động phát hiện đi muộn/về sớm)
 */
const db = require('../config/database');

// Lấy lịch sử chấm công theo nhân viên và khoảng thời gian
const getAttendanceRecords = async (req, res) => {
    try {
        const { ma_nhan_vien, start, end } = req.query;
        let query = `
            SELECT cc.*, nv.ten_nhan_vien, nv.ma_nv_code, nv.vai_tro
            FROM cham_cong cc
            JOIN nhan_vien nv ON cc.ma_nhan_vien = nv.ma_nhan_vien
            WHERE nv.is_deleted = 0
        `;
        const params = [];

        if (ma_nhan_vien) {
            query += ' AND cc.ma_nhan_vien = ?';
            params.push(ma_nhan_vien);
        }
        if (start && end) {
            query += ' AND cc.ngay BETWEEN ? AND ?';
            params.push(start, end);
        }

        query += ' ORDER BY cc.ngay DESC, cc.gio_vao DESC';
        const [records] = await db.query(query, params);
        res.json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Chấm công trực tiếp (API cho POS hoặc Mobile)
const checkInOut = async (req, res) => {
    try {
        const { ma_nhan_vien, type, ghi_chu } = req.body;
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

        // Tìm ca làm việc được phân trong ngày hôm nay
        const [shiftAssignments] = await db.query(`
            SELECT pc.*, c.ten_ca, c.gio_bat_dau, c.gio_ket_thuc
            FROM phan_ca pc
            JOIN ca_lam_viec c ON pc.ma_ca = c.ma_ca
            WHERE pc.ma_nhan_vien = ? AND pc.ngay = ?
            ORDER BY c.gio_bat_dau ASC
        `, [ma_nhan_vien, date]);

        if (type === 'check-in') {
            const [existing] = await db.query(
                'SELECT * FROM cham_cong WHERE ma_nhan_vien = ? AND ngay = ? AND gio_vao IS NOT NULL AND gio_ra IS NULL',
                [ma_nhan_vien, date]
            );

            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Bạn đang trong ca làm việc (chưa check-out)!' });
            }

            let status = 'Đúng giờ';
            let assignedShiftId = null;

            if (shiftAssignments.length > 0) {
                // Lấy ca gần nhất với thời gian hiện tại hoặc ca đầu tiên trong ngày
                const shift = shiftAssignments[0]; 
                assignedShiftId = shift.ma_ca;
                
                if (time > shift.gio_bat_dau) {
                    status = 'Đi muộn';
                }
            } else {
                status = 'Ngoài ca';
            }

            await db.query(
                'INSERT INTO cham_cong (ma_nhan_vien, ngay, gio_vao, trang_thai, ghi_chu) VALUES (?, ?, ?, ?, ?)',
                [ma_nhan_vien, date, time, status, ghi_chu]
            );
            
            res.json({ 
                success: true, 
                message: `Check-in thành công! (${status})`,
                time: time,
                status: status
            });

        } else if (type === 'check-out') {
            const [record] = await db.query(
                'SELECT * FROM cham_cong WHERE ma_nhan_vien = ? AND ngay = ? AND gio_ra IS NULL',
                [ma_nhan_vien, date]
            );

            if (record.length === 0) {
                return res.status(404).json({ success: false, message: 'Chưa có dữ liệu check-in cho lượt này!' });
            }

            // Tính số giờ làm
            const checkInTime = record[0].gio_vao;
            const h1 = parseInt(checkInTime.split(':')[0]);
            const m1 = parseInt(checkInTime.split(':')[1]);
            const h2 = now.getHours();
            const m2 = now.getMinutes();
            
            let hours = (h2 - h1) + (m2 - m1) / 60;
            if (hours < 0) hours = 0; // Đề phòng trường hợp qua đêm (cần logic phức tạp hơn)

            let status = record[0].trang_thai;
            if (shiftAssignments.length > 0) {
                const shift = shiftAssignments[0];
                if (time < shift.gio_ket_thuc) {
                    status = status === 'Đúng giờ' ? 'Về sớm' : status + ', Về sớm';
                }
            }

            await db.query(
                'UPDATE cham_cong SET gio_ra = ?, so_gio_lam = ?, trang_thai = ?, ghi_chu = ? WHERE ma_cham_cong = ?',
                [time, hours.toFixed(2), status, ghi_chu || record[0].ghi_chu, record[0].ma_cham_cong]
            );

            // Cập nhật trạng thái phân ca thành 'completed'
            if (shiftAssignments.length > 0) {
                await db.query('UPDATE phan_ca SET trang_thai = "completed" WHERE ma_nhan_vien = ? AND ngay = ?', [ma_nhan_vien, date]);
            }

            res.json({ 
                success: true, 
                message: 'Check-out thành công!', 
                hours: parseFloat(hours.toFixed(2)),
                status: status
            });
        }
    } catch (error) {
        console.error('CheckInOut Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin cập nhật thủ công bản ghi chấm công
const updateAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { gio_vao, gio_ra, so_gio_lam, trang_thai, ghi_chu } = req.body;
        await db.query(`
            UPDATE cham_cong 
            SET gio_vao = ?, gio_ra = ?, so_gio_lam = ?, trang_thai = ?, ghi_chu = ?
            WHERE ma_cham_cong = ?
        `, [gio_vao, gio_ra, so_gio_lam, trang_thai, ghi_chu, id]);
        res.json({ success: true, message: 'Cập nhật bản ghi chấm công thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin xóa bản ghi chấm công
const deleteAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM cham_cong WHERE ma_cham_cong = ?', [id]);
        res.json({ success: true, message: 'Xóa bản ghi chấm công thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAttendanceRecords,
    checkInOut,
    updateAttendanceRecord,
    deleteAttendanceRecord
};
