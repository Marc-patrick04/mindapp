// routes/support.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const supportController = require('../controllers/supportController');

// Public routes (no auth required)
router.post('/register', supportController.register);
router.post('/login', supportController.login);

// Protected routes (require authentication)
router.post('/link-session', authenticateUser, supportController.linkSession);
router.get('/my-requests', authenticateUser, supportController.getMyRequests);

module.exports = router;