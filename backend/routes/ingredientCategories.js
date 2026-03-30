const express = require('express');
const router = express.Router();
const controller = require('../controllers/ingredientCategoryController');
const { isAdmin } = require('../middleware/auth.middleware');

// Toàn bộ route yêu cầu quyền Admin
router.get('/', isAdmin, controller.getAllCategories);
router.post('/', isAdmin, controller.createCategory);
router.put('/:id', isAdmin, controller.updateCategory);
router.delete('/:id', isAdmin, controller.deleteCategory);

module.exports = router;
