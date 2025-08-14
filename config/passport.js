const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Employee = require('../models/Employee');

// Local Strategy for Admin
passport.use('admin-local', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        const admin = await Admin.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!admin) {
            return done(null, false, { message: 'Admin not found' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, admin);
    } catch (error) {
        return done(error);
    }
}));

// Local Strategy for Manager
passport.use('manager-local', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        const manager = await Manager.findOne({
            $or: [{ username }, { email: username }],
            isActive: true
        });

        if (!manager) {
            return done(null, false, { message: 'Manager not found or inactive' });
        }

        const isMatch = await bcrypt.compare(password, manager.password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, manager);
    } catch (error) {
        return done(error);
    }
}));

// Local Strategy for Employee
passport.use('employee-local', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        const employee = await Employee.findOne({
            $or: [{ username }, { email: username }],
            isActive: true
        });

        if (!employee) {
            return done(null, false, { message: 'Employee not found or inactive' });
        }

        const isMatch = await bcrypt.compare(password, employee.password);
        if (!isMatch) {
            return done(null, false, { message: 'Invalid credentials' });
        }

        return done(null, employee);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, { id: user._id, role: user.role });
});

passport.deserializeUser(async (obj, done) => {
    try {
        let user;

        switch (obj.role) {
            case 'admin':
                user = await Admin.findById(obj.id);
                break;
            case 'manager':
                user = await Manager.findById(obj.id);
                break;
            case 'employee':
                user = await Employee.findById(obj.id);
                break;
        }

        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
