const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            // user: process.env.EMAIL_USER,
            user: '6494vanshsukhiyaji@gmail.com',
            pass: 'wfqbxvqcjscnhszv'
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // Verify transporter configuration
    transporter.verify((error, success) => {
        if (error) {
            console.error('Email transporter verification failed:', error);
        } else {
            console.log('Email transporter is ready to send messages');
        }
    });

    return transporter;
};

// Send welcome email to manager
const sendManagerWelcomeEmail = async (managerData, password) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: '6494vanshsukhiyaji@gmail.com',
            to: 'vanshsukhiyaji@gmail.com',
            subject: 'Welcome to Admin Manager Employee Portal - Manager Account Created',
            html: `
                <h2>Welcome to the Portal!</h2>
                <p>Dear ${managerData.username},</p>
                <p>Your manager account has been created successfully. Here are your login details:</p>
                <ul>
                    <li><strong>Username:</strong> ${managerData.username}</li>
                    <li><strong>Email:</strong> ${managerData.email}</li>
                    <li><strong>Password:</strong> ${password}</li>
                    <li><strong>Portal Link:</strong> ${process.env.PORTAL_URL || 'http://localhost:3000'}</li>
                </ul>
                <p>Please login and change your password immediately for security purposes.</p>
                <p>Best regards,<br>Admin Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Manager welcome email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending manager welcome email:', error);
        return false;
    }
};

// Send welcome email to employee
const sendEmployeeWelcomeEmail = async (employeeData, password) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: '6494vanshsukhiyaji@gmail.com',
            to: 'vanshsukhiyaji@gmail.com',
            subject: 'Welcome to Admin Manager Employee Portal - Employee Account Created',
            html: `
                <h2>Welcome to the Portal!</h2>
                <p>Dear ${employeeData.username},</p>
                <p>Your employee account has been created successfully. Here are your login details:</p>
                <ul>
                    <li><strong>Username:</strong> ${employeeData.username}</li>
                    <li><strong>Email:</strong> ${employeeData.email}</li>
                    <li><strong>Password:</strong> ${password}</li>
                    <li><strong>Portal Link:</strong> ${process.env.PORTAL_URL || 'http://localhost:3000'}</li>
                </ul>
                <p>Please login and change your password immediately for security purposes.</p>
                <p>Best regards,<br>Management Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Employee welcome email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending employee welcome email:', error);
        return false;
    }
};

// Send password reset email
const sendPasswordResetEmail = async (userData, resetToken) => {
    try {
        const transporter = createTransporter();

        const resetUrl = `${process.env.PORTAL_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        const mailOptions = {
            from: 'gotawalavrushank@gmail.com',
            to: 'vrushankgotawala@gmail.com',
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset Request</h2>
                <p>Dear ${userData.username},</p>
                <p>You have requested to reset your password. Click the link below to reset your password:</p>
                <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
                <p>Best regards,<br>Support Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};

module.exports = {
    sendManagerWelcomeEmail,
    sendEmployeeWelcomeEmail,
    sendPasswordResetEmail
};
