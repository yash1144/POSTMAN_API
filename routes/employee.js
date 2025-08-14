const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employeeController');
const { employeeAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 14. Employee Login
router.post('/login',
    employeeController.login
);



// 15. Employee Profile (API)
router.get('/profile', employeeAuth, employeeController.getProfile);



// 16. Change Password
router.put('/change-password',
    employeeAuth,
    employeeController.changePassword
);

// 17. Forgot Password
router.post('/forgot-password',
    employeeController.forgotPassword
);

// Get Employee Dashboard Info
router.get('/dashboard-data', employeeAuth, employeeController.getDashboardData);

// Update Employee Profile (enhanced)
router.put('/update-profile',
    employeeAuth,
    upload.single('image'),
    employeeController.updateProfile
);

module.exports = router;
