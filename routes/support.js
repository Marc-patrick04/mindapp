const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateUser } = require('../middleware/auth');

router.post('/register', supportController.register);
router.post('/login', supportController.login);
router.post('/link-session', authenticateUser, supportController.linkSession);
router.get('/my-requests', authenticateUser, supportController.getMyRequests);

module.exports = router;