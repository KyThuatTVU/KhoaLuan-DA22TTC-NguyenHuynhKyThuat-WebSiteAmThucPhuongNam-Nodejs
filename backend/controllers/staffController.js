/**
 * Staff Controller - Quản lý nhân viên
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Lấy danh sách nhân viên
const getAllStaff = async (req, res) => {
    try {
        const [staff] = await db.query(`
            SELECT 
                ma_nhan_vien,
                ten_nhan_vien,
                tai_khoan,
                so_dien_thoai,
                vai_tro,
                trang_thai,
                ngay_tao
            FROM nhan_vien
            ORDER BY ngay_tao DESC
        `);
        
        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Thêm nhân viên mới
const createStaff = async (req, res) => {
    try {
        const { ten_nhan_vien, tai_khoan, mat_khau, so_dien_thoai, vai_tro } = req.body;
        
        // Validate
        if (!ten_nhan_vien || !tai_khoan || !mat_khau) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ thông tin!' 
            });
        }
        
        // Check if username exists
        const [existing] = await db.query(
            'SELECT ma_nhan_vien FROM nhan_vien WHERE tai_khoan = ?',
            [tai_khoan]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tài khoản đã tồn tại!' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(mat_khau, 10);
        
        // Insert staff
        const [result] = await db.query(
            `INSERT INTO nhan_vien 
            (ten_nhan_vien, tai_khoan, mat_khau_hash, so_dien_thoai, vai_tro, trang_thai)
            VALUES (?, ?, ?, ?, ?, 1)`,
            [ten_nhan_vien, tai_khoan, hashedPassword, so_dien_thoai, vai_tro || 'staff']
        );
        
        res.json({ 
            success: true, 
            message: 'Thêm nhân viên thành công!',
            data: { ma_nhan_vien: result.insertId }
        });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật nhân viên
const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_nhan_vien, so_dien_thoai, vai_tro, trang_thai } = req.body;
        
        const [result] = await db.query(
            `UPDATE nhan_vien 
            SET ten_nhan_vien = ?, so_dien_thoai = ?, vai_tro = ?, trang_thai = ?
            WHERE ma_nhan_vien = ?`,
            [ten_nhan_vien, so_dien_thoai, vai_tro, trang_thai, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy nhân viên!' 
            });
        }
        
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Đổi mật khẩu nhân viên
const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { mat_khau_moi } = req.body;
        
        if (!mat_khau_moi || mat_khau_moi.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mật khẩu phải có ít nhất 6 ký tự!' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);
        
        const [result] = await db.query(
            'UPDATE nhan_vien SET mat_khau_hash = ? WHERE ma_nhan_vien = ?',
            [hashedPassword, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy nhân viên!' 
            });
        }
        
        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Xóa nhân viên
const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete - chỉ đổi trạng thái
        const [result] = await db.query(
            'UPDATE nhan_vien SET trang_thai = 0 WHERE ma_nhan_vien = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy nhân viên!' 
            });
        }
        
        res.json({ success: true, message: 'Xóa nhân viên thành công!' });
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
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng nhập đầy đủ thông tin!' 
            });
        }
        
        // Find staff
        const [staff] = await db.query(
            `SELECT * FROM nhan_vien 
            WHERE tai_khoan = ? AND trang_thai = 1`,
            [tai_khoan]
        );
        
        if (staff.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Tài khoản không tồn tại hoặc đã bị khóa!' 
            });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(mat_khau, staff[0].mat_khau_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Mật khẩu không đúng!' 
            });
        }
        
        // Return user info (without password)
        const userData = {
            ma_nhan_vien: staff[0].ma_nhan_vien,
            ten_nhan_vien: staff[0].ten_nhan_vien,
            tai_khoan: staff[0].tai_khoan,
            vai_tro: staff[0].vai_tro,
            so_dien_thoai: staff[0].so_dien_thoai
        };
        
        res.json({ 
            success: true, 
            message: 'Đăng nhập thành công!',
            data: userData
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
