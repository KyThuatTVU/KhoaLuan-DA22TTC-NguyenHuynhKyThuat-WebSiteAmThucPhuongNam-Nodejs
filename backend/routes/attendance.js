const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Quản lý chấm công
router.get('/', attendanceController.getAttendanceRecords);
router.post('/check-in-out', attendanceController.checkInOut);
router.put('/:id', attendanceController.updateAttendanceRecord);
router.delete('/:id', attendanceController.deleteAttendanceRecord);

module.exports = router;
