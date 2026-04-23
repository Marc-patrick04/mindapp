// routes/assessment.js
const express = require('express');
const router = express.Router();
const { submitAssessment, getSession } = require('../controllers/assessmentController');

// POST /api/assessment/submit - Submit assessment answers
router.post('/submit', submitAssessment);

// GET /api/assessment/session/:token - Get assessment session
router.get('/session/:token', getSession);

module.exports = router;