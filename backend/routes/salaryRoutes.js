const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

// Get all salary slips for an employee
router.get('/employee/:employee_id', salaryController.getEmployeeSalarySlips);

// Get specific salary slip by ID
router.get('/:id', salaryController.getSalarySlipById);

// Get salary slip by month and year
router.get('/:employee_id/:month/:year', salaryController.getSalarySlipByMonth);

// Generate salary slip for an employee
router.post('/generate', salaryController.generateSalarySlip);

// Generate salary slips for all employees (Admin only)
router.post('/generate-bulk', salaryController.generateBulkSalarySlips);

// Mark salary as paid (Admin only)
router.put('/:id/mark-paid', salaryController.markAsPaid);

// Delete salary slip (Admin only)
router.delete('/:id', salaryController.deleteSalarySlip);

module.exports = router;