const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Employee = require('../models/Employee');

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            username: user.username
        },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '7d' }
    );
};

// Verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');

        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({ message: 'Admin not found' });
        }

        req.user = admin;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Manager authentication middleware
const managerAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');

        if (decoded.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Manager only.' });
        }

        const manager = await Manager.findById(decoded.id);
        if (!manager || !manager.isActive) {
            return res.status(401).json({ message: 'Manager not found or inactive' });
        }

        req.user = manager;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Employee authentication middleware
const employeeAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');

        if (decoded.role !== 'employee') {
            return res.status(403).json({ message: 'Access denied. Employee only.' });
        }

        const employee = await Employee.findById(decoded.id);
        if (!employee || !employee.isActive) {
            return res.status(401).json({ message: 'Employee not found or inactive' });
        }

        req.user = employee;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Admin or Manager authentication middleware
const adminOrManagerAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');

        if (decoded.role !== 'admin' && decoded.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Admin or Manager only.' });
        }

        let user;
        if (decoded.role === 'admin') {
            user = await Admin.findById(decoded.id);
        } else {
            user = await Manager.findById(decoded.id);
            if (user && !user.isActive) {
                return res.status(401).json({ message: 'Manager account is inactive' });
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Session-based authentication middleware for web views
const adminWebAuth = async (req, res, next) => {
    try {
        console.log('Admin Web Auth - Session:', req.session?.user);

        // Check for session-based auth first
        if (req.session && req.session.user && req.session.user.role === 'admin') {
            try {
                const admin = await Admin.findById(req.session.user.id);
                console.log('Admin found:', admin ? 'Yes' : 'No');

                if (admin) {
                    req.user = admin;
                    req.user._id = admin._id; // Ensure _id is set
                    console.log('Admin authenticated successfully:', admin.username);
                    return next();
                } else {
                    console.log('Admin not found');
                }
            } catch (dbError) {
                console.error('Database error in admin auth:', dbError);
            }
        }

        // Fallback to JWT auth
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
                if (decoded.role === 'admin') {
                    const admin = await Admin.findById(decoded.id);
                    if (admin) {
                        req.user = admin;
                        req.user._id = admin._id;
                        return next();
                    }
                }
            } catch (jwtError) {
                console.error('JWT verification error:', jwtError);
            }
        }

        console.log('Admin authentication failed');
        return res.status(401).json({ message: 'Authentication required' });
    } catch (error) {
        console.error('Admin web auth error:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

const managerWebAuth = async (req, res, next) => {
    try {
        console.log('Manager Web Auth - Session:', req.session?.user);

        // Check for session-based auth first
        if (req.session && req.session.user && req.session.user.role === 'manager') {
            try {
                const manager = await Manager.findById(req.session.user.id);
                console.log('Manager found:', manager ? 'Yes' : 'No');

                if (manager && manager.isActive) {
                    req.user = manager;
                    req.user._id = manager._id; // Ensure _id is set
                    console.log('Manager authenticated successfully:', manager.username);
                    return next();
                } else {
                    console.log('Manager not found or inactive');
                }
            } catch (dbError) {
                console.error('Database error in manager auth:', dbError);
            }
        }

        // Fallback to JWT auth
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
                if (decoded.role === 'manager') {
                    const manager = await Manager.findById(decoded.id);
                    if (manager && manager.isActive) {
                        req.user = manager;
                        req.user._id = manager._id;
                        return next();
                    }
                }
            } catch (jwtError) {
                console.error('JWT verification error:', jwtError);
            }
        }

        console.log('Manager authentication failed');
        return res.status(401).json({ message: 'Authentication required' });
    } catch (error) {
        console.error('Manager web auth error:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

const employeeWebAuth = async (req, res, next) => {
    try {
        console.log('Employee Web Auth - Session:', req.session?.user);

        // Check for session-based auth first
        if (req.session && req.session.user && req.session.user.role === 'employee') {
            try {
                const employee = await Employee.findById(req.session.user.id);
                console.log('Employee found:', employee ? 'Yes' : 'No');

                if (employee && employee.isActive) {
                    req.user = employee;
                    req.user._id = employee._id; // Ensure _id is set
                    console.log('Employee authenticated successfully:', employee.username);
                    return next();
                } else {
                    console.log('Employee not found or inactive');
                }
            } catch (dbError) {
                console.error('Database error in employee auth:', dbError);
            }
        }

        // Fallback to JWT auth
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
                if (decoded.role === 'employee') {
                    const employee = await Employee.findById(decoded.id);
                    if (employee && employee.isActive) {
                        req.user = employee;
                        req.user._id = employee._id;
                        return next();
                    }
                }
            } catch (jwtError) {
                console.error('JWT verification error:', jwtError);
            }
        }

        console.log('Employee authentication failed');
        return res.status(401).json({ message: 'Authentication required' });
    } catch (error) {
        console.error('Employee web auth error:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

module.exports = {
    generateToken,
    verifyToken,
    adminAuth,
    managerAuth,
    employeeAuth,
    adminOrManagerAuth,
    adminWebAuth,
    managerWebAuth,
    employeeWebAuth
};
