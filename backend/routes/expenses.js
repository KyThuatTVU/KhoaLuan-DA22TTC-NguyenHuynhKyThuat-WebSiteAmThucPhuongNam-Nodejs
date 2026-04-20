const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// Lấy danh sách loại chi phí
router.get('/categories', expenseController.getExpenseCategories);

// Lấy danh sách chi phí theo ngày
router.get('/', expenseController.getExpensesByDate);

// Lấy chi phí theo khoảng thời gian
router.get('/range', expenseController.getExpensesByDateRange);

// Thống kê chi phí theo tháng
router.get('/stats/monthly', expenseController.getMonthlyExpenseStats);

// Lấy chi tiết một chi phí
router.get('/:id', expenseController.getExpenseById);

// Thêm chi phí mới
router.post('/', expenseController.createExpense);

// Cập nhật chi phí
router.put('/:id', expenseController.updateExpense);

// Xóa chi phí
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
