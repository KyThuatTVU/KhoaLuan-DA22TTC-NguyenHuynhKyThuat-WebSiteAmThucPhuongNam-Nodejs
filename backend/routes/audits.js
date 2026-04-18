const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

// Routes for Inventory Audits (Kiểm kê kho)
router.get('/', auditController.getAuditSessions);
router.get('/:id', auditController.getAuditDetail);
router.post('/', auditController.createAuditSession);
router.put('/:id', auditController.updateAuditSession);
router.delete('/:id', auditController.deleteAuditSession);

module.exports = router;
