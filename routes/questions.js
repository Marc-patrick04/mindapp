// routes/questions.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Create database pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// GET /api/questions - Get active questions for assessment
router.get('/questions', async (req, res) => {
  console.log('📊 GET /api/questions - Fetching active questions');

  try {
    const result = await pool.query(
      'SELECT * FROM questions WHERE is_active = true ORDER BY display_order'
    );

    // Parse JSON options for each question
    const questions = result.rows.map(q => {
      if (q.options && typeof q.options === 'string') {
        try {
          q.options = JSON.parse(q.options);
        } catch (e) {
          console.error('Error parsing options for question', q.id, e);
        }
      }
      return q;
    });

    console.log(`✅ Found ${questions.length} active questions`);
    res.json(questions);

  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// GET /api/questions/all - Get all questions (for admin)
router.get('/questions/all', async (req, res) => {
  console.log('📊 GET /api/questions/all - Fetching all questions');

  try {
    const result = await pool.query('SELECT * FROM questions ORDER BY display_order');

    const questions = result.rows.map(q => {
      if (q.options && typeof q.options === 'string') {
        try {
          q.options = JSON.parse(q.options);
        } catch (e) {
          console.error('Error parsing options for question', q.id, e);
        }
      }
      return q;
    });

    console.log(`✅ Found ${questions.length} total questions`);
    res.json(questions);

  } catch (error) {
    console.error('❌ Error fetching all questions:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

module.exports = router;