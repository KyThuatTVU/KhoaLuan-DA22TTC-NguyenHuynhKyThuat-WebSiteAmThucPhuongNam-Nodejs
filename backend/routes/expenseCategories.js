const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategoryController');

// Lấy danh sách loại chi phí
router.get('/', expenseCategoryController.getCategories);

// Lấy thống kê sử dụng loại chi phí
router.get('/stats', expenseCategoryController.getCategoryStats);

// Lấy chi tiết một loại chi phí
router.get('/:id', expenseCategoryController.getCategoryById);

// Thêm loại chi phí mới
router.post('/', expenseCategoryController.createCategory);

// Cập nhật loại chi phí
router.put('/:id', expenseCategoryController.updateCategory);

// Xóa loại chi phí
router.delete('/:id', expenseCategoryController.deleteCategory);

module.exports = router;