/**
 * Staff Controller - Quản lý hồ sơ nhân viên và phân quyền
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Lấy danh sách nhân viên (có lọc và tìm kiếm)
const getAllStaff = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        let query = `
            SELECT 
                ma_nhan_vien, ma_nv_code, ten_nhan_vien, tai_khoan, 
                so_dien_thoai, dia_chi, ngay_sinh, gioi_tinh, vai_tro, 
                luong_theo_gio, luong_co_ban, trang_thai, ngay_vao_lam, 
                anh_dai_dien, cccd, anh_cccd, anh_cccd_sau, ngay_tao
            FROM nhan_vien
            WHERE is_deleted = 0
        `;
        const params = [];

        if (role) {
            query += ' AND vai_tro = ?';
            params.push(role);
        }

        if (status !== undefined && status !== '') {
            query += ' AND trang_thai = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (ten_nhan_vien LIKE ? OR ma_nv_code LIKE ? OR so_dien_thoai LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY ngay_tao DESC';
        
        const [staff] = await db.query(query, params);
        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Tạo mã nhân viên tự động (NV001, NV002...)
const generateEmployeeCode = async () => {
    const [lastStaff] = await db.query('SELECT ma_nv_code FROM nhan_vien ORDER BY ma_nhan_vien DESC LIMIT 1');
    let nextNum = 1;
    if (lastStaff.length > 0 && lastStaff[0].ma_nv_code) {
        const lastCode = lastStaff[0].ma_nv_code;
        const match = lastCode.match(/\d+/);
        if (match) {
            nextNum = parseInt(match[0]) + 1;
        }
    }
    return `NV${nextNum.toString().padStart(3, '0')}`;
};

// Thêm nhân viên mới
const createStaff = async (req, res) => {
    try {
        const { 
            ten_nhan_vien, tai_khoan, mat_khau, so_dien_thoai, 
            vai_tro, luong_theo_gio, luong_co_ban, dia_chi, 
            ngay_sinh, gioi_tinh, anh_cccd, anh_cccd_sau, ngay_vao_lam, anh_dai_dien 
        } = req.body;
        
        // Validate
        if (!ten_nhan_vien || !tai_khoan || !mat_khau) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' });
        }
        
        // Check if username exists
        const [existing] = await db.query('SELECT ma_nhan_vien FROM nhan_vien WHERE tai_khoan = ?', [tai_khoan]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Tài khoản đã tồn tại!' });
        }
        
        const ma_nv_code = await generateEmployeeCode();
        const hashedPassword = await bcrypt.hash(mat_khau, 10);
        
        const [result] = await db.query(
            `INSERT INTO nhan_vien 
            (ma_nv_code, ten_nhan_vien, tai_khoan, mat_khau_hash, so_dien_thoai, dia_chi, ngay_sinh, gioi_tinh, anh_cccd, anh_cccd_sau, ngay_vao_lam, anh_dai_dien, vai_tro, luong_theo_gio, luong_co_ban, trang_thai)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                ma_nv_code, ten_nhan_vien, tai_khoan, hashedPassword, so_dien_thoai, 
                dia_chi, ngay_sinh || null, gioi_tinh, anh_cccd || null, anh_cccd_sau || null, ngay_vao_lam || null, 
                anh_dai_dien, vai_tro || 'waiter', luong_theo_gio || 0, luong_co_ban || 0
            ]
        );
        
        res.json({ 
            success: true, 
            message: 'Thêm nhân viên thành công!',
            data: { ma_nhan_vien: result.insertId, ma_nv_code }
        });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật thông tin nhân viên
const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            ten_nhan_vien, tai_khoan, so_dien_thoai, dia_chi, ngay_sinh, 
            gioi_tinh, anh_cccd, anh_cccd_sau, ngay_vao_lam, anh_dai_dien, 
            vai_tro, luong_theo_gio, luong_co_ban, trang_thai 
        } = req.body;
        
        const [result] = await db.query(
            `UPDATE nhan_vien 
            SET ten_nhan_vien = ?, tai_khoan = ?, so_dien_thoai = ?, dia_chi = ?, ngay_sinh = ?, 
                gioi_tinh = ?, anh_cccd = ?, anh_cccd_sau = ?, ngay_vao_lam = ?, anh_dai_dien = ?, 
                vai_tro = ?, luong_theo_gio = ?, luong_co_ban = ?, trang_thai = ?
            WHERE ma_nhan_vien = ?`,
            [
                ten_nhan_vien, tai_khoan, so_dien_thoai, dia_chi, ngay_sinh || null, 
                gioi_tinh, anh_cccd || null, anh_cccd_sau || null, ngay_vao_lam || null, anh_dai_dien, 
                vai_tro, luong_theo_gio || 0, luong_co_ban || 0, trang_thai, id
            ]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên!' });
        }
        
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { mat_khau_moi } = req.body;
        
        if (!mat_khau_moi || mat_khau_moi.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự!' });
        }
        
        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);
        await db.query('UPDATE nhan_vien SET mat_khau_hash = ? WHERE ma_nhan_vien = ?', [hashedPassword, id]);
        
        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Xóa nhân viên (Soft Delete)
const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('UPDATE nhan_vien SET is_deleted = 1, trang_thai = 0 WHERE ma_nhan_vien = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên!' });
        }
        
        res.json({ success: true, message: 'Xóa nhân viên thành công (Soft deleted)!' });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Đăng nhập nhân viên
const staffLogin = async (req, res) => {
    try {
        const { tai_khoan, mat_khau } = req.body;
        
        if (!tai_khoan || !mat_khau) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu!' });
        }
        
        const [staff] = await db.query(
            `SELECT * FROM nhan_vien 
            WHERE tai_khoan = ? AND trang_thai = 1 AND is_deleted = 0`,
            [tai_khoan]
        );
        
        if (staff.length === 0) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa!' });
        }
        
        const isValidPassword = await bcrypt.compare(mat_khau, staff[0].mat_khau_hash);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Mật khẩu không đúng!' });
        }
        
        // Tạo session
        const userData = {
            ma_nhan_vien: staff[0].ma_nhan_vien,
            ma_nv_code: staff[0].ma_nv_code,
            ten_nhan_vien: staff[0].ten_nhan_vien,
            tai_khoan: staff[0].tai_khoan,
            vai_tro: staff[0].vai_tro,
            so_dien_thoai: staff[0].so_dien_thoai
        };
        
        req.session.admin = {
            ma_admin: staff[0].ma_nhan_vien, 
            tai_khoan: staff[0].tai_khoan,
            email: `${staff[0].tai_khoan}@pos.local`,
            ten_hien_thi: staff[0].ten_nhan_vien,
            anh_dai_dien: staff[0].anh_dai_dien || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff[0].ten_nhan_vien)}&background=10b981&color=fff`,
            role: staff[0].vai_tro
        };
        
        req.session.save((err) => {
            if (err) return res.status(500).json({ success: false, message: 'Lỗi tạo phiên đăng nhập' });
            res.json({ success: true, message: 'Đăng nhập thành công!', data: userData });
        });
    } catch (error) {
        console.error('Error staff login:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllStaff,
    createStaff,
    updateStaff,
    changePassword,
    deleteStaff,
    staffLogin
};
