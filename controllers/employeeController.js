const bcrypt = require('bcrypt');
const crypto = require('crypto');

const Employee = require('../models/Employee');
const { generateToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/email');

class EmployeeController {
    // 14. Employee Login
    async login(req, res) {
        try {
            const { username, password } = req.body;

            const employee = await Employee.findOne({
                $or: [{ username }, { email: username }],
                isActive: true
            }).populate('managerId', 'username email phone');

            if (!employee) {
                return res.status(401).json({ message: 'Invalid credentials or account inactive' });
            }

            const isMatch = await employee.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = generateToken(employee);

            res.json({
                message: 'Login successful',
                token,
                employee: employee.toJSON()
            });
        } catch (error) {
            console.error('Employee login error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 15. Get Employee Profile
    async getProfile(req, res) {
        try {
            const employee = await Employee.findById(req.user._id)
                .populate('managerId', 'username email phone')
                .populate('createdBy', 'username email');

            res.json({
                message: 'Employee profile retrieved successfully',
                employee: employee.toJSON()
            });
        } catch (error) {
            console.error('Get employee profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // Employee Dashboard View
    async getDashboard(req, res) {
        try {
            const employee = await Employee.findById(req.user._id)
                .populate('managerId', 'username email phone image')
                .populate('createdBy', 'username email');
            res.json({
                message: 'Employee dashboard data retrieved successfully',
                employee: employee ? employee.toJSON() : null
            });
        } catch (error) {
            console.error('Employee dashboard error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 16. Change Password
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            const isMatch = await req.user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            req.user.password = newPassword;
            await req.user.save();

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 17. Forgot Password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const employee = await Employee.findOne({ email, isActive: true });
            if (!employee) {
                return res.status(404).json({ message: 'Employee with this email does not exist or is inactive' });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            employee.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            employee.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

            await employee.save();

            try {
                await sendPasswordResetEmail(employee, resetToken);
                res.json({ message: 'Password reset email sent' });
            } catch (error) {
                employee.resetPasswordToken = undefined;
                employee.resetPasswordExpire = undefined;
                await employee.save();

                console.error('Error sending password reset email:', error);
                res.status(500).json({ message: 'Email could not be sent' });
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // Update Employee Profile (enhanced)
    async updateProfile(req, res) {
        try {
            const { username, email, firstName, lastName, phone, address } = req.body;
            const employee = req.user;

            // Check if username or email already exists (excluding current employee)
            if (username && username !== employee.username) {
                const existingUsername = await Employee.findOne({ username, _id: { $ne: employee._id } });
                if (existingUsername) {
                    return res.status(400).json({ message: 'Username already exists' });
                }
            }

            if (email && email !== employee.email) {
                const existingEmail = await Employee.findOne({ email, _id: { $ne: employee._id } });
                if (existingEmail) {
                    return res.status(400).json({ message: 'Email already exists' });
                }
            }

            // Update fields if provided
            if (username) employee.username = username;
            if (email) employee.email = email;
            if (firstName) employee.firstName = firstName;
            if (lastName) employee.lastName = lastName;
            if (phone) employee.phone = phone;
            if (address) employee.address = address;

            // Handle image upload
            if (req.file) {
                employee.image = req.file.filename;
            }

            await employee.save();

            res.json({
                message: 'Profile updated successfully',
                employee: employee.toJSON()
            });
        } catch (error) {
            console.error('Update employee profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 15b. Get Employee Profile Page (Web)
    async getProfilePage(req, res) {
        try {
            const employee = await Employee.findById(req.user._id)
                .populate('managerId', 'username email phone firstName lastName');
            res.json({
                message: 'Employee profile retrieved successfully',
                employee: employee ? employee.toJSON() : null
            });
        } catch (error) {
            console.error('Employee profile page error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // Employee Dashboard View
    async getDashboard(req, res) {
        try {
            console.log('EMPLOYEE DASHBOARD req.user:', req.user);

            if (!req.user) {
                console.error('Employee dashboard: req.user is undefined');
                return res.status(401).json({ message: 'Authentication required' });
            }

            const employee = await Employee.findById(req.user._id)
                .populate('managerId', 'username email phone firstName lastName')
                .populate('createdBy', 'username email');
            res.json({
                message: 'Employee dashboard data retrieved successfully',
                employee: employee ? employee.toJSON() : null,
                manager: employee ? employee.managerId : null
            });
        } catch (error) {
            console.error('Employee dashboard error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // Get Employee Dashboard Data
    async getDashboardData(req, res) {
        try {
            const employee = await Employee.findById(req.user._id)
                .populate('managerId', 'username email phone firstName lastName')
                .populate('createdBy', 'username email');

            const dashboardData = {
                employee: employee.toJSON(),
                manager: employee.managerId,
                joinDate: employee.createdAt,
                isActive: employee.isActive
            };

            res.json({
                message: 'Employee dashboard data retrieved successfully',
                data: dashboardData
            });
        } catch (error) {
            console.error('Get employee dashboard error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 14b. Update Employee Profile (Web Form)
    async updateProfileWeb(req, res) {
        try {
            const { username, email, phone, address } = req.body;

            const employee = await Employee.findById(req.session.user.id);
            if (!employee) {
                return res.status(404).json({ message: 'Employee not found' });
            }

            // Update fields if provided
            if (username) employee.username = username;
            if (email) employee.email = email;
            if (phone) employee.phone = phone;
            if (address) employee.address = address;

            // Handle image upload
            if (req.file) {
                employee.image = req.file.filename;
            }

            await employee.save();
            res.json({ message: 'Profile updated successfully', employee: employee.toJSON() });
        } catch (error) {
            console.error('Update profile web error:', error);
            res.status(500).json({ message: 'Error updating profile' });
        }
    }
}

module.exports = new EmployeeController();
