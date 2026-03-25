const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Middleware xác thực Admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

router.get('/', requireAdmin, inventoryController.getAllIngredients);
router.post('/', requireAdmin, inventoryController.createIngredient);
router.put('/:id', requireAdmin, inventoryController.updateIngredient);
router.post('/:id/add-stock', requireAdmin, inventoryController.addStock);

module.exports = router;
