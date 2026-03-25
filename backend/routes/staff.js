/**
 * Staff Routes - API quản lý nhân viên
 */

const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// Đăng nhập nhân viên
router.post('/login', staffController.staffLogin);

// Lấy danh sách nhân viên
router.get('/', staffController.getAllStaff);

// Thêm nhân viên mới
router.post('/', staffController.createStaff);

// Cập nhật nhân viên
router.put('/:id', staffController.updateStaff);

// Đổi mật khẩu
router.put('/:id/password', staffController.changePassword);

// Xóa nhân viên
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
