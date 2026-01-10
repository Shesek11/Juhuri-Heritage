const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment variables (in development)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dictionary', require('./routes/dictionary'));
app.use('/api/dialects', require('./routes/dialects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/gemini', require('./routes/gemini'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/logs', require('./routes/logs'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));

    // Handle React routing - send all non-API requests to index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'שגיאת שרת פנימית',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
// Initialize Database
const initializeDatabase = require('./utils/dbInit');
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
});

module.exports = app;
