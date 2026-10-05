const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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



router.post("/google/register-info", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    // Verify Google access token
    const tokenInfo = await googleClient.getTokenInfo(credential);

    // Make sure the token belongs to our Habitly Google client
    if (tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({
        message: "Invalid Google client",
      });
    }

    const email = String(tokenInfo.email || "").toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Google account email not available",
      });
    }

    // Check whether this email already has a Habitly account
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this Google email already exists. Please sign in instead.",
      });
    }

    res.status(200).json({
      name: tokenInfo.name || email.split("@")[0],
      email,
    });
  } catch (error) {
    console.error("Google registration info error:", error);

    res.status(401).json({
      message: "Google authentication failed",
    });
  }
});

// =====================================================
// GOOGLE LOGIN
// =====================================================

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    // Verify the Google access token
    const tokenInfo = await googleClient.getTokenInfo(credential);

    // Make sure this token belongs to our Habitly Google client
    if (tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({
        message: "Invalid Google client",
      });
    }

    const email = String(tokenInfo.email || "").toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Google account email not available",
      });
    }

    // Check whether this Google account already exists
    const user = await User.findOne({ email });

if (!user) {
  return res.status(404).json({
    message: "No account found with this Google account. Please register first.",
  });
}

    // Existing or newly created user → create Habitly JWT
    res.status(200).json({
      message: "Google login successful",
      token: signToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google login error:", error);

    res.status(401).json({
      message: "Google authentication failed",
    });
  }
});


module.exports = router;