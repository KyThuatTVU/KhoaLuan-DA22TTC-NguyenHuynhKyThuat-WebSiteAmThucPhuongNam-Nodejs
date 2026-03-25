/**
 * POS Routes - API endpoints cho hệ thống bán hàng
 */

const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');

// Tạo đơn hàng từ POS
router.post('/orders', posController.createPOSOrder);

// Lấy danh sách bàn
router.get('/tables', posController.getTables);

// Lấy đơn hàng đang phục vụ tại bàn
router.get('/table-orders', posController.getTableOrders);

// Thanh toán đơn tại bàn
router.put('/table-orders/:orderId/complete', posController.completeTableOrder);

// Thống kê bán hàng theo ngày
router.get('/stats/daily', posController.getDailySalesStats);

// Lấy lịch sử đơn hàng (tất cả loại)
router.get('/orders/history', posController.getAllOrders);

// Lấy tất cả đơn hàng cho trang quản lý
router.get('/orders/all', posController.getAllOrdersForManagement);

// Lấy chi tiết đơn hàng
router.get('/orders/:orderId', posController.getOrderDetail);

// Cập nhật trạng thái đơn hàng
router.put('/orders/:orderId/status', posController.updateOrderStatus);

module.exports = router;
