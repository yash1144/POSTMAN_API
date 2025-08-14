const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Admin = require('../models/Admin');
const { sendPasswordResetEmail } = require('../utils/email');

// 1. Admin Registration
router.post('/register',
    upload.single('image'),
    adminController.register
);

// 2. Admin Login
router.post('/login',
    adminController.login
);

// 3. Get Admin Profile (API)
router.get('/profile', adminAuth, adminController.getProfile);



// 4. Change Password
router.put('/change-password',
    adminAuth,
    adminController.changePassword
);

// 4.1. Update Admin Profile
router.put('/update-profile',
    adminAuth,
    upload.single('image'),
    adminController.updateProfile
);

// 5. Forgot Password
router.post('/forgot-password',
    async (req, res) => {
        try {
            const { email } = req.body;

            const admin = await Admin.findOne({ email });
            if (!admin) {
                return res.status(404).json({ message: 'Admin with this email not found' });
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            admin.resetPasswordToken = resetToken;
            admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour

            await admin.save();

            await sendPasswordResetEmail(admin, resetToken);

            res.json({ message: 'Password reset email sent successfully' });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// 6. Add Manager (API)
router.post('/add-manager',
    adminAuth,
    upload.single('image'),
    adminController.createManager
);



// 11. Get All Managers
router.get('/managers', adminAuth, adminController.getManagers);

// 12. Delete/Deactivate Manager (API)
router.put('/manager/:id/toggle-status', adminAuth, adminController.toggleManagerStatus);



// 19. View All Employees
router.get('/employees', adminAuth, adminController.getEmployees);

// 20. Delete/Deactivate Employee (API)
router.put('/employee/:id/toggle-status', adminAuth, adminController.toggleEmployeeStatus);



module.exports = router;
