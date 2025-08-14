const express = require('express');
const router = express.Router();

const managerController = require('../controllers/managerController');
const { managerAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 7. Manager Login
router.post('/login',
    managerController.login
);



// 8. Manager Profile (API)
router.get('/profile', managerAuth, managerController.getProfile);



// 9. Change Password
router.put('/change-password',
    managerAuth,
    managerController.changePassword
);



// 10. Forgot Password
router.post('/forgot-password',
    managerController.forgotPassword
);

// 11. Add Employee (API)
router.post('/add-employee',
    managerAuth,
    upload.single('image'),
    managerController.addEmployee
);

// 12. Get All Employees (API)
router.get('/employees', managerAuth, managerController.getEmployees);

// 13. Toggle Employee Status (API)
router.put('/employee/:id/toggle-status', managerAuth, managerController.toggleEmployeeStatus);



// Get Manager Statistics
router.get('/stats', managerAuth, managerController.getStats);

module.exports = router;
