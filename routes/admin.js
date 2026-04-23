// routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Admin authentication (no auth required for login)
router.post('/login', adminController.login);

// All admin routes below require authentication
router.use(authenticateAdmin);

// Questions management
router.get('/questions', adminController.getAllQuestions);
router.post('/questions', adminController.createQuestion);
router.put('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);

// Risk thresholds
router.get('/thresholds', adminController.getThresholds);
router.post('/thresholds', adminController.createThreshold);
router.put('/thresholds/:id', adminController.updateThreshold);

// Support requests
router.get('/support-requests', adminController.getSupportRequests);
router.put('/support-requests/:id/status', adminController.updateSupportStatus);

// Statistics
router.get('/stats', adminController.getStats);

// Rating rules
router.get('/rules', adminController.getRules);
router.post('/rules', adminController.createRule);
router.delete('/rules/:id', adminController.deleteRule);

module.exports = router;