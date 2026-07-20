const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Requires valid invite code)
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user (Phone & Password) and return JWT Token
 * @access  Public
 */
router.post('/login', authController.login);

module.exports = router;