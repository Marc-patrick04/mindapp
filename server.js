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

// Logging middleware (helps debug)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// IMPORT ROUTES
// ============================================
const assessmentRoutes = require('./routes/assessment');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const questionsRoutes = require('./routes/questions');

// ============================================
// MOUNT API ROUTES - THIS IS THE CRITICAL PART
// ============================================

// Mount questions routes (should be first)
app.use('/api', questionsRoutes);  // This handles /api/questions

// Mount other routes
app.use('/api/assessment', assessmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);

// ============================================
// HTML ROUTES
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
// HEALTH CHECK ENDPOINT (for debugging)
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/questions', '/api/assessment', '/api/admin', '/api/support']
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    console.log(`404 - API endpoint not found: ${req.path}`);
    res.status(404).json({
      error: `API endpoint '${req.path}' not found`,
      availableEndpoints: ['/api/questions', '/api/assessment/submit', '/api/admin/login']
    });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📊 Questions endpoint: http://localhost:${PORT}/api/questions`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});