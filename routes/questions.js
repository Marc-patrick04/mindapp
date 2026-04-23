// routes/questions.js
const express = require('express');
const router = express.Router();
const { getActiveQuestions } = require('../controllers/assessmentController');

// GET /api/questions - Get all active questions
router.get('/questions', getActiveQuestions);

// GET /api/questions/all - Get all questions (admin only - you might want to add auth)
router.get('/questions/all', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    });

    const result = await pool.query('SELECT * FROM questions ORDER BY display_order');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all questions:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;