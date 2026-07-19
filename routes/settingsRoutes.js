const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Public Route (User Website အတွက် Token မလိုအပ်ပါ)
router.get('/', settingsController.getSettings);

// Admin Route (Token လိုအပ်ပါမယ် - လောလောဆယ် Admin ကနေပဲ Update လုပ်မယ်)
router.put('/', settingsController.updateSettings);

module.exports = router;