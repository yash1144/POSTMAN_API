const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Import database configuration
require('./config/database');

// Import routes
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const employeeRoutes = require('./routes/employee');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for API access
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Static files for uploads only
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/employee', employeeRoutes);

// API Documentation route
app.get('/', (req, res) => {
    res.json({
        message: 'Admin Manager Employee Portal API',
        version: '1.0.0',
        endpoints: {
            admin: '/api/admin',
            manager: '/api/manager',
            employee: '/api/employee'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
