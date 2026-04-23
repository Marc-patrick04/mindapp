// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const assessmentRoutes = require('./routes/assessment');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const questionsRoutes = require('./routes/questions');

// ============================================
// MOUNT API ROUTES
// ============================================
app.use('/api/assessment', assessmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api', questionsRoutes);  // This should handle /api/questions

// ============================================
// HTML ROUTES (for serving pages)
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/assessment', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'assessment.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/result', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

// ============================================
// 404 Handler for undefined routes
// ============================================
app.use('*', (req, res) => {
  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: `API endpoint '${req.path}' not found` });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`📊 Questions endpoint: http://localhost:${PORT}/api/questions`);
});