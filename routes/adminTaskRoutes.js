const express = require('express');
const router = express.Router();
const adminTaskController = require('../controllers/adminTaskController');

// ✅ CRITICAL SECURITY FIX: Use the centralized, secure adminAuth middleware
// Token မရှိရင် သို့မဟုတ် မမှန်ရင် 401 Unauthorized ပြန်ပို့ပါလိမ့်မယ်။ (Admin ID 1 ကို အလိုအလျောက် မပေးတော့ပါ)
const adminAuth = require('../middleware/auth');

/**
 * @route   GET /api/admin/tasks
 * @desc    Get all tasks
 * @access  Private (Admin)
 */
router.get('/', adminAuth, adminTaskController.getTasks);

/**
 * @route   POST /api/admin/tasks
 * @desc    Create a new task
 * @access  Private (Admin)
 */
router.post('/', adminAuth, adminTaskController.createTask);

/**
 * @route   PUT /api/admin/tasks/:id
 * @desc    Update an existing task
 * @access  Private (Admin)
 */
router.put('/:id', adminAuth, adminTaskController.updateTask);

/**
 * @route   DELETE /api/admin/tasks/:id
 * @desc    Delete a task
 * @access  Private (Admin)
 */
router.delete('/:id', adminAuth, adminTaskController.deleteTask);

/**
 * @route   PATCH /api/admin/tasks/:id/status
 * @desc    Toggle task status (Active/Inactive)
 * @access  Private (Admin)
 */
router.patch('/:id/status', adminAuth, adminTaskController.toggleTaskStatus);

module.exports = router;