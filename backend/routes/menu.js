/**
 * Menu Routes
 * Định nghĩa các route cho món ăn
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import controller
const menuController = require('../controllers/menuController');

// Cấu hình multer để upload ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../images'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh!'));
        }
    }
});

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// ==================== PUBLIC ROUTES ====================

// Lấy tất cả món ăn
router.get('/', menuController.getAllDishes);

// Lấy món ăn theo danh mục
router.get('/category/:id', menuController.getDishesByCategory);

// Lấy top món bán chạy
router.get('/top-selling', menuController.getTopSelling);

// Gợi ý món ăn liên quan (ML)
router.get('/related/:id', menuController.getRelatedDishes);

// ==================== ADMIN ROUTES ====================

// Toggle trạng thái món ăn
router.patch('/:id/toggle-status', requireAdmin, menuController.toggleStatus);

// Cập nhật số lượng tồn kho
router.patch('/:id/stock', requireAdmin, menuController.updateStock);

// ==================== CRUD ROUTES ====================

// Lấy chi tiết món ăn (đặt sau các route cụ thể)
router.get('/:id', menuController.getDishById);

// Thêm món ăn mới
router.post('/', requireAdmin, upload.single('anh_mon'), menuController.createDish);

// Cập nhật món ăn
router.put('/:id', requireAdmin, upload.single('anh_mon'), menuController.updateDish);

// Xóa món ăn
router.delete('/:id', requireAdmin, menuController.deleteDish);

module.exports = router;
