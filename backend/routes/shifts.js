const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');

// Quản lý ca làm việc
router.get('/', shiftController.getAllShifts);
router.post('/', shiftController.createShift);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);

// Quản lý phân ca
router.get('/schedules', shiftController.getSchedules);
router.post('/schedules', shiftController.createSchedule);
router.delete('/schedules/:id', shiftController.deleteSchedule);

module.exports = router;
