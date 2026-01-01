const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token without expiration
const generateToken = (userId) => {
    // Note: No expiresIn option means token never expires
    return jwt.sign({ userId }, process.env.JWT_SECRET);
};

// Signup controller
exports.signup = async (req, res) => {
    try {
        const { phoneNumber, email, password } = req.body;

        // Validate input
        if (!phoneNumber || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide phone number, email, and password'
            });
        }

        // Check if user already exists with phone number
        const existingPhone = await User.findOne({ phoneNumber });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number already registered'
            });
        }

        // Check if user already exists with email
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create new user
        const user = new User({
            phoneNumber,
            email,
            password
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: {
                    id: user._id,
                    phoneNumber: user.phoneNumber,
                    email: user.email,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

// Login controller
exports.login = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // Validate input
        if (!phoneNumber || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide phone number and password'
            });
        }

        // Find user by phone number
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    phoneNumber: user.phoneNumber,
                    email: user.email,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Get current user (protected route example)
exports.getMe = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data',
            error: error.message
        });
    }
};
