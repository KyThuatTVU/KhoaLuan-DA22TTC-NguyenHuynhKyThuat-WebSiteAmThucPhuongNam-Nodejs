const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');

// Routes for Import Receipts (Phiếu nhập hàng)
router.get('/', importController.getImportReceipts);
router.get('/:id', importController.getImportReceiptDetail);
router.post('/', importController.createImportReceipt);
router.put('/:id', importController.updateImportReceipt);
router.delete('/:id', importController.deleteImportReceipt);

module.exports = router;
