const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');

router.post('/submit', assessmentController.submitAssessment);
router.get('/session/:token', assessmentController.getSession);
router.get('/questions', assessmentController.getActiveQuestions);

module.exports = router;