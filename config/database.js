const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/admin_manager_employee_portal')
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });

const db = mongoose.connection;

db.once('open', () => {
    console.log('MongoDB connection successful');
});

module.exports = db;
