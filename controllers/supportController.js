const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    
    // Generate token
    const token = jwt.sign(
      { userId: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const linkSession = async (req, res) => {
  try {
    const { sessionToken } = req.body;
    const userId = req.userId;
    
    // Get session ID from token
    const sessionResult = await pool.query(
      'SELECT id, risk_level FROM assessment_sessions WHERE session_token = $1',
      [sessionToken]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionId = sessionResult.rows[0].id;
    const riskLevel = sessionResult.rows[0].risk_level;
    
    // Create support request
    await pool.query(
      'INSERT INTO support_requests (user_id, session_id, status) VALUES ($1, $2, $3)',
      [userId, sessionId, 'pending']
    );
    
    // Generate support message based on risk level
    let supportMessage = '';
    if (riskLevel === 'high') {
      supportMessage = 'We strongly recommend immediate professional support. A counselor will contact you within 24 hours.';
    } else if (riskLevel === 'moderate') {
      supportMessage = 'You will be added to our peer support group. Check your email for WhatsApp group invitation.';
    } else {
      supportMessage = 'Thank you for reaching out. We offer preventive workshops and wellness tips.';
    }
    
    res.json({
      message: 'Support request created successfully',
      supportMessage,
      riskLevel
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to link session' });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const userId = req.userId;
    
    const result = await pool.query(
      `SELECT sr.*, s.risk_level, s.total_score, s.created_at as assessment_date
       FROM support_requests sr
       JOIN assessment_sessions s ON sr.session_id = s.id
       WHERE sr.user_id = $1
       ORDER BY sr.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

module.exports = { register, login, linkSession, getMyRequests };