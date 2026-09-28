const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (userId) =>
    jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

// Shape the frontend expects
const publicUser = (user) => ({
    id: user._id.toString(),
    name: user.username,
    email: user.email,
    createdAt: user.createdAt
});


// =====================================================
// REGISTER
// =====================================================

router.post("/register", async (req, res) => {
    try {
        const username = req.body.name || req.body.username;
        const email = String(req.body.email || "").toLowerCase();
        const password = req.body.password;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address"
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            }); 
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            token: signToken(newUser._id),
            user: publicUser(newUser)
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


// =====================================================
// NORMAL LOGIN
// =====================================================

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body.email || "").toLowerCase();
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        res.status(200).json({
            message: "Login successful",
            token: signToken(user._id),
            user: publicUser(user)
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


// =====================================================
// GOOGLE LOGIN
// =====================================================

router.post("/google", async (req, res) => {
    try {
        const email = String(req.body.email || "").toLowerCase();

        if (!email || !EMAIL_RE.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid Gmail address"
            });
        }

        // Only allow Google login for an existing account
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "This Google account is not registered. Please create an account first."
            });
        }

        // Existing user → create JWT
        res.status(200).json({
            message: "Google login successful",
            token: signToken(user._id),
            user: publicUser(user)
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        }); 
    }
});


module.exports = router;