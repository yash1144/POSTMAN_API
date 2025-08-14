const bcrypt = require('bcrypt');
const crypto = require('crypto');

const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Employee = require('../models/Employee');
const { generateToken } = require('../middleware/auth');
const { sendManagerWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');

class AdminController {
    // 1. Admin Registration
    async register(req, res) {
        try {
            const { username, email, firstName, lastName, phone, password } = req.body;

            // Check if admin already exists
            const existingAdmin = await Admin.findOne({
                $or: [{ username }, { email }]
            });

            if (existingAdmin) {
                return res.status(400).json({ message: 'Admin with this username or email already exists' });
            }

            // Create new admin
            const admin = new Admin({
                username,
                email,
                firstName,
                lastName,
                phone,
                password,
                image: req.file ? req.file.filename : null,
                role: 'admin'
            });

            await admin.save();

            const token = generateToken(admin);

            res.status(201).json({
                message: 'Admin registered successfully',
                token,
                admin: admin.toJSON()
            });
        } catch (error) {
            console.error('Admin registration error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 2. Admin Login
    async login(req, res) {
        try {
            const { username, password } = req.body;

            const admin = await Admin.findOne({
                $or: [{ username }, { email: username }]
            });

            if (!admin) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isMatch = await admin.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = generateToken(admin);

            res.json({
                message: 'Login successful',
                token,
                admin: admin.toJSON()
            });
        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 3. Get Admin Profile
    async getProfile(req, res) {
        try {
            res.json({
                message: 'Admin profile retrieved successfully',
                admin: req.user.toJSON()
            });
        } catch (error) {
            console.error('Get admin profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 3b. Get Admin Profile Page (Web)
    async getProfilePage(req, res) {
        try {
            const admin = await Admin.findById(req.user._id);
            res.json({
                message: 'Admin profile retrieved successfully',
                admin: admin ? admin.toJSON() : null
            });
        } catch (error) {
            console.error('Admin profile page error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 4. Change Password
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

    // 4.1. Update Admin Profile
    async updateProfile(req, res) {
        try {
            const { username, email, firstName, lastName, phone } = req.body;
            const admin = req.user;

            // Check if username or email already exists (excluding current admin)
            if (username && username !== admin.username) {
                const existingUsername = await Admin.findOne({ username, _id: { $ne: admin._id } });
                if (existingUsername) {
                    return res.status(400).json({ message: 'Username already exists' });
                }
            }

            if (email && email !== admin.email) {
                const existingEmail = await Admin.findOne({ email, _id: { $ne: admin._id } });
                if (existingEmail) {
                    return res.status(400).json({ message: 'Email already exists' });
                }
            }

            // Update fields if provided
            if (username) admin.username = username;
            if (email) admin.email = email;
            if (firstName) admin.firstName = firstName;
            if (lastName) admin.lastName = lastName;
            if (phone) admin.phone = phone;

            // Handle image upload
            if (req.file) {
                admin.image = req.file.filename;
            }

            await admin.save();

            res.json({
                message: 'Profile updated successfully',
                admin: admin.toJSON()
            });
        } catch (error) {
            console.error('Update admin profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 5. Forgot Password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const admin = await Admin.findOne({ email });
            if (!admin) {
                return res.status(404).json({ message: 'Admin with this email does not exist' });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

            await admin.save();

            try {
                await sendPasswordResetEmail(admin, resetToken);
                res.json({ message: 'Password reset email sent' });
            } catch (error) {
                admin.resetPasswordToken = undefined;
                admin.resetPasswordExpire = undefined;
                await admin.save();

                console.error('Error sending password reset email:', error);
                res.status(500).json({ message: 'Email could not be sent' });
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 6. Admin Dashboard View
    async getDashboard(req, res) {
        try {
            const managers = await Manager.find({}).populate('createdBy', 'username email');
            const employees = await Employee.find({})
                .populate('createdBy', 'username email')
                .populate('managerId', 'username email');

            const stats = {
                totalManagers: managers.length,
                activeManagers: managers.filter(m => m.isActive).length,
                inactiveManagers: managers.filter(m => !m.isActive).length,
                totalEmployees: employees.length,
                activeEmployees: employees.filter(e => e.isActive).length,
                inactiveEmployees: employees.filter(e => !e.isActive).length
            };

            res.json({
                message: 'Admin dashboard data retrieved successfully',
                admin: req.user ? req.user.toJSON() : null,
                managers: managers.map(m => m.toJSON()),
                employees: employees.map(e => e.toJSON()),
                stats
            });
        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 7. Create Manager
    async createManager(req, res) {
        try {
            const { username, email, firstName, lastName, phone, department, password } = req.body;

            // Check if manager already exists
            const existingManager = await Manager.findOne({
                $or: [{ username }, { email }]
            });

            if (existingManager) {
                return res.status(400).json({ message: 'Manager with this username or email already exists' });
            }

            // Create new manager
            const manager = new Manager({
                username,
                email,
                firstName,
                lastName,
                phone,
                department,
                password,
                image: req.file ? req.file.filename : null,
                createdBy: req.user._id,
                role: 'manager'
            });

            await manager.save();

            // Send welcome email
            try {
                await sendManagerWelcomeEmail(manager, password);
            } catch (error) {
                console.error('Error sending manager welcome email:', error);
            }

            res.status(201).json({
                message: 'Manager created successfully',
                manager: manager.toJSON()
            });
        } catch (error) {
            console.error('Create manager error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 8. Get All Managers
    async getManagers(req, res) {
        try {
            const managers = await Manager.find({})
                .populate('createdBy', 'username email')
                .sort({ createdAt: -1 });

            res.json({
                message: 'Managers retrieved successfully',
                managers
            });
        } catch (error) {
            console.error('Get managers error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 9. Toggle Manager Status
    async toggleManagerStatus(req, res) {
        try {
            const { id } = req.params;

            const manager = await Manager.findById(id);
            if (!manager) {
                return res.status(404).json({ message: 'Manager not found' });
            }

            manager.isActive = !manager.isActive;
            await manager.save();

            res.json({
                message: `Manager ${manager.isActive ? 'activated' : 'deactivated'} successfully`,
                manager: manager.toJSON()
            });
        } catch (error) {
            console.error('Toggle manager status error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 10. Get All Employees
    async getEmployees(req, res) {
        try {
            const employees = await Employee.find({})
                .populate('createdBy', 'username email')
                .populate('managerId', 'username email')
                .sort({ createdAt: -1 });

            res.json({
                message: 'Employees retrieved successfully',
                employees
            });
        } catch (error) {
            console.error('Get employees error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 11.1. Update Employee Data (Admin)
    async updateEmployee(req, res) {
        try {
            const { id } = req.params;
            const { username, email, firstName, lastName, phone, department, position, salary, address, managerId } = req.body;

            // Find employee
            const employee = await Employee.findById(id);
            if (!employee) {
                return res.status(404).json({ message: 'Employee not found' });
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

            // Verify manager exists if managerId is provided
            if (managerId && managerId !== employee.managerId?.toString()) {
                const manager = await Manager.findById(managerId);
                if (!manager || !manager.isActive) {
                    return res.status(400).json({ message: 'Invalid or inactive manager' });
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
            if (managerId) employee.managerId = managerId;

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

    // 11.2. Update Manager Data (Admin)
    async updateManager(req, res) {
        try {
            const { id } = req.params;
            const { username, email, firstName, lastName, phone, department } = req.body;

            // Find manager
            const manager = await Manager.findById(id);
            if (!manager) {
                return res.status(404).json({ message: 'Manager not found' });
            }

            // Check if username or email already exists (excluding current manager)
            if (username && username !== manager.username) {
                const existingUsername = await Manager.findOne({ username, _id: { $ne: id } });
                if (existingUsername) {
                    return res.status(400).json({ message: 'Username already exists' });
                }
            }

            if (email && email !== manager.email) {
                const existingEmail = await Manager.findOne({ email, _id: { $ne: id } });
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
                message: 'Manager updated successfully',
                manager: manager.toJSON()
            });
        } catch (error) {
            console.error('Update manager error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // 12. Toggle Employee Status
    async toggleEmployeeStatus(req, res) {
        try {
            const { id } = req.params;

            const employee = await Employee.findById(id);
            if (!employee) {
                return res.status(404).json({ message: 'Employee not found' });
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

    // 6b. Create Manager (Web Form)
    async createManagerWeb(req, res) {
        try {
            const { username, email, firstName, lastName, phone, password, department } = req.body;

            // Check if manager already exists
            const existingManager = await Manager.findOne({
                $or: [{ username }, { email }]
            });

            if (existingManager) {
                return res.status(400).json({ message: 'Manager with this username or email already exists' });
            }

            // Create new manager
            const manager = new Manager({
                username,
                email,
                firstName,
                lastName,
                phone,
                password,
                department,
                image: req.file ? req.file.filename : null,
                role: 'manager',
                isActive: true,
                createdBy: req.session?.user ? req.session.user.id : null
            });

            await manager.save();

            // Send welcome email
            try {
                await sendManagerWelcomeEmail(manager);
            } catch (error) {
                console.error('Error sending welcome email:', error);
            }
            res.status(201).json({ message: 'Manager added successfully', manager: manager.toJSON() });
        } catch (error) {
            console.error('Create manager web error:', error);
            res.status(500).json({ message: 'Error adding manager' });
        }
    }

    // 12b. Toggle Manager Status (Web Form)
    async toggleManagerStatusWeb(req, res) {
        try {
            const { id } = req.params;

            const manager = await Manager.findById(id);
            if (!manager) {
                return res.status(404).json({ message: 'Manager not found' });
            }

            manager.isActive = !manager.isActive;
            await manager.save();
            res.json({ message: `Manager ${manager.isActive ? 'activated' : 'deactivated'} successfully`, manager: manager.toJSON() });
        } catch (error) {
            console.error('Toggle manager status web error:', error);
            res.status(500).json({ message: 'Error updating manager status' });
        }
    }

    // 20b. Toggle Employee Status (Web Form)
    async toggleEmployeeStatusWeb(req, res) {
        try {
            const { id } = req.params;

            const employee = await Employee.findById(id);
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

module.exports = new AdminController();
