const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

// Admin auth
router.post('/login', adminController.login);

// Question management
router.get('/questions', authenticateAdmin, adminController.getAllQuestions);
router.post('/questions', authenticateAdmin, adminController.createQuestion);
router.put('/questions/:id', authenticateAdmin, adminController.updateQuestion);
router.delete('/questions/:id', authenticateAdmin, adminController.deleteQuestion);

// Rating rules
router.get('/rules', authenticateAdmin, adminController.getRules);
router.post('/rules', authenticateAdmin, adminController.createRule);
router.delete('/rules/:id', authenticateAdmin, adminController.deleteRule);

// Risk thresholds
router.get('/thresholds', authenticateAdmin, adminController.getThresholds);
router.post('/thresholds', authenticateAdmin, adminController.createThreshold);
router.put('/thresholds/:id', authenticateAdmin, adminController.updateThreshold);

// Support requests
router.get('/support-requests', authenticateAdmin, adminController.getSupportRequests);
router.put('/support-requests/:id/status', authenticateAdmin, adminController.updateSupportStatus);

// Stats
router.get('/stats', authenticateAdmin, adminController.getStats);

module.exports = router;