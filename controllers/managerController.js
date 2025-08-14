const bcrypt = require('bcrypt');
const crypto = require('crypto');

const Manager = require('../models/Manager');
const Employee = require('../models/Employee');
const { generateToken } = require('../middleware/auth');
const { sendEmployeeWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');

class ManagerController {
    // 7. Manager Login
    async login(req, res) {
        try {
            const { username, password } = req.body;

            const manager = await Manager.findOne({
                $or: [{ username }, { email: username }],
                isActive: true
            });

            if (!manager) {
                return res.status(401).json({ message: 'Invalid credentials or account inactive' });
            }

            const isMatch = await manager.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = generateToken(manager);

            res.json({
                message: 'Login successful',
                token,
                manager: manager.toJSON()
            });
        } catch (error) {
            console.error('Manager login error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 8. Get Manager Profile
    async getProfile(req, res) {
        try {
            res.json({
                message: 'Manager profile retrieved successfully',
                manager: req.user.toJSON()
            });
        } catch (error) {
            console.error('Get manager profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 8b. Get Manager Profile Page (Web)
    async getProfilePage(req, res) {
        try {
            const manager = await Manager.findById(req.user._id);
            res.json({
                message: 'Manager profile retrieved successfully',
                manager: manager ? manager.toJSON() : null
            });
        } catch (error) {
            console.error('Manager profile page error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // Manager Dashboard View
    async getDashboard(req, res) {
        try {
            console.log('MANAGER DASHBOARD req.user:', req.user);

            if (!req.user) {
                console.error('Manager dashboard: req.user is undefined');
                return res.status(401).json({ message: 'Authentication required' });
            }

            const employees = await Employee.find({ managerId: req.user._id })
                .populate('createdBy', 'username email')
                .populate('managerId', 'username email');

            const stats = {
                totalEmployees: employees.length,
                activeEmployees: employees.filter(e => e.isActive).length,
                inactiveEmployees: employees.filter(e => !e.isActive).length
            };

            res.json({
                message: 'Manager dashboard data retrieved successfully',
                manager: req.user ? req.user.toJSON() : null,
                employees: employees.map(e => e.toJSON()),
                stats
            });
        } catch (error) {
            console.error('Manager dashboard error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 9. Change Password
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

    // 9.1. Update Manager Profile
    async updateProfile(req, res) {
        try {
            const { username, email, firstName, lastName, phone, department } = req.body;
            const manager = req.user;

            // Check if username or email already exists (excluding current manager)
            if (username && username !== manager.username) {
                const existingUsername = await Manager.findOne({ username, _id: { $ne: manager._id } });
                if (existingUsername) {
                    return res.status(400).json({ message: 'Username already exists' });
                }
            }

            if (email && email !== manager.email) {
                const existingEmail = await Manager.findOne({ email, _id: { $ne: manager._id } });
                if (existingEmail) {
                    return res.status(400).json({ message: 'Email already exists' });
                }
            }

            // Update fields if provided
            if (username) manager.username = username;
            if (email) manager.email = email;
            if (firstName) manager.firstName = firstName;
            if (lastName) manager.lastName = lastName;
            if (phone) manager.phone = phone;
            if (department) manager.department = department;

            // Handle image upload
            if (req.file) {
                manager.image = req.file.filename;
            }

            await manager.save();

            res.json({
                message: 'Profile updated successfully',
                manager: manager.toJSON()
            });
        } catch (error) {
            console.error('Update manager profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 10. Forgot Password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const manager = await Manager.findOne({ email, isActive: true });
            if (!manager) {
                return res.status(404).json({ message: 'Manager with this email does not exist or is inactive' });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            manager.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            manager.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

            await manager.save();

            try {
                await sendPasswordResetEmail(manager, resetToken);
                res.json({ message: 'Password reset email sent' });
            } catch (error) {
                manager.resetPasswordToken = undefined;
                manager.resetPasswordExpire = undefined;
                await manager.save();

                console.error('Error sending password reset email:', error);
                res.status(500).json({ message: 'Email could not be sent' });
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 11. Add Employee
    async addEmployee(req, res) {
        try {
            const { username, email, firstName, lastName, phone, department, position, salary, password } = req.body;

            // Check if employee already exists
            const existingEmployee = await Employee.findOne({
                $or: [{ username }, { email }]
            });

            if (existingEmployee) {
                return res.status(400).json({ message: 'Employee with this username or email already exists' });
            }

            // Create new employee
            const employee = new Employee({
                username,
                email,
                firstName,
                lastName,
                phone,
                department,
                position,
                salary,
                password,
                image: req.file ? req.file.filename : null,
                managerId: req.user._id,
                createdBy: req.user._id,
                role: 'employee'
            });

            await employee.save();

            // Send welcome email
            try {
                await sendEmployeeWelcomeEmail(employee, password);
            } catch (error) {
                console.error('Error sending employee welcome email:', error);
            }

            res.status(201).json({
                message: 'Employee added successfully',
                employee: employee.toJSON()
            });
        } catch (error) {
            console.error('Add employee error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 12. Get Employees under Manager
    async getEmployees(req, res) {
        try {
            const employees = await Employee.find({ managerId: req.user._id })
                .populate('createdBy', 'username email')
                .populate('managerId', 'username email');

            res.json({
                message: 'Employees retrieved successfully',
                employees
            });
        } catch (error) {
            console.error('Get employees error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 12.1. Update Employee Data (Manager)
    async updateEmployee(req, res) {
        try {
            const { id } = req.params;
            const { username, email, firstName, lastName, phone, department, position, salary, address } = req.body;

            // Find employee and verify it belongs to this manager
            const employee = await Employee.findOne({ _id: id, managerId: req.user._id });
            if (!employee) {
                return res.status(404).json({ message: 'Employee not found or not under your management' });
            }

            // Check if username or email already exists (excluding current employee)
            if (username && username !== employee.username) {
                const existingUsername = await Employee.findOne({ username, _id: { $ne: id } });
                if (existingUsername) {
                    return res.status(400).json({ message: 'Username already exists' });
                }
            }

            if (email && email !== employee.email) {
                const existingEmail = await Employee.findOne({ email, _id: { $ne: id } });
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
            if (department) employee.department = department;
            if (position) employee.position = position;
            if (salary) employee.salary = salary;
            if (address) employee.address = address;

            // Handle image upload
            if (req.file) {
                employee.image = req.file.filename;
            }

            await employee.save();

            res.json({
                message: 'Employee updated successfully',
                employee: employee.toJSON()
            });
        } catch (error) {
            console.error('Update employee error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 13. Toggle Employee Status
    async toggleEmployeeStatus(req, res) {
        try {
            const { id } = req.params;

            const employee = await Employee.findOne({
                _id: id,
                managerId: req.user._id
            });

            if (!employee) {
                return res.status(404).json({ message: 'Employee not found or not under your management' });
            }

            employee.isActive = !employee.isActive;
            await employee.save();

            res.json({
                message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
                employee: employee.toJSON()
            });
        } catch (error) {
            console.error('Toggle employee status error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // Get Manager Statistics
    async getStats(req, res) {
        try {
            const totalEmployees = await Employee.countDocuments({ managerId: req.user._id });
            const activeEmployees = await Employee.countDocuments({
                managerId: req.user._id,
                isActive: true
            });
            const inactiveEmployees = totalEmployees - activeEmployees;

            res.json({
                message: 'Manager statistics retrieved successfully',
                stats: {
                    totalEmployees,
                    activeEmployees,
                    inactiveEmployees
                }
            });
        } catch (error) {
            console.error('Get manager stats error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 7b. Create Employee (Web Form)
    async createEmployeeWeb(req, res) {
        try {
            const { username, email, firstName, lastName, phone, password, salary, address } = req.body;

            // Check if employee already exists
            const existingEmployee = await Employee.findOne({
                $or: [{ username }, { email }]
            });

            if (existingEmployee) {
                return res.status(400).json({ message: 'Employee with this username or email already exists' });
            }

            // Create new employee
            const employee = new Employee({
                username,
                email,
                firstName,
                lastName,
                phone,
                password,
                salary,
                address,
                image: req.file ? req.file.filename : null,
                role: 'employee',
                isActive: true,
                managerId: req.session?.user ? req.session.user.id : null,
                createdBy: req.session?.user ? req.session.user.id : null
            });

            await employee.save();

            // Send welcome email
            try {
                await sendEmployeeWelcomeEmail(employee);
            } catch (error) {
                console.error('Error sending welcome email:', error);
            }
            res.status(201).json({ message: 'Employee added successfully', employee: employee.toJSON() });
        } catch (error) {
            console.error('Create employee web error:', error);
            res.status(500).json({ message: 'Error adding employee' });
        }
    }

    // 9b. Change Password (Web Form)
    async changePasswordWeb(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            const manager = await Manager.findById(req.session.user.id);
            if (!manager) {
                return res.status(404).json({ message: 'Manager not found' });
            }

            const isMatch = await manager.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            manager.password = newPassword;
            await manager.save();
            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Change password web error:', error);
            res.status(500).json({ message: 'Error changing password' });
        }
    }

    // 13b. Toggle Employee Status (Web Form)
    async toggleEmployeeStatusWeb(req, res) {
        try {
            const { id } = req.params;

            const employee = await Employee.findOne({ _id: id, managerId: req.session.user.id });
            if (!employee) {
                return res.status(404).json({ message: 'Employee not found' });
            }

            employee.isActive = !employee.isActive;
            await employee.save();
            res.json({ message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`, employee: employee.toJSON() });
        } catch (error) {
            console.error('Toggle employee status web error:', error);
            res.status(500).json({ message: 'Error updating employee status' });
        }
    }
}

module.exports = new ManagerController();
