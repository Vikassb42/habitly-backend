const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// Update the logged-in user's profile (name / email) — used by the Profile page.
router.put("/me", authMiddleware, async (req, res) => {
    try {
        const { name, email } = req.body;
        const updates = {};

        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({
                    message: "Name cannot be empty"
                });
            }
            updates.username = String(name).trim();
        }

        if (email !== undefined) {
            const normalized = String(email).toLowerCase();
            if (!EMAIL_RE.test(normalized)) {
                return res.status(400).json({
                    message: "Please provide a valid email address"
                });
            }
            const existing = await User.findOne({ email: normalized });
            if (existing && existing._id.toString() !== req.userId) {
                return res.status(400).json({
                    message: "Another account already uses this email"
                });
            }
            updates.email = normalized;
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user._id.toString(),
                name: user.username,
                email: user.email,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});

module.exports = router;