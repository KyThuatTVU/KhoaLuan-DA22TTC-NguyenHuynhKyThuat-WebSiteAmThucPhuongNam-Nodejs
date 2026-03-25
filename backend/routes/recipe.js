const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

router.get('/dish/:id', requireAdmin, recipeController.getRecipeByDish);
router.post('/dish/:id', requireAdmin, recipeController.updateRecipe);

module.exports = router;
