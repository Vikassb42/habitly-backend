const express = require("express");

const Reminder = require("../models/Reminder");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get reminders for the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    let reminders = await Reminder.findOne({
      userId: req.userId,
    });

    // Create default settings if this is the user's first time
    if (!reminders) {
      reminders = await Reminder.create({
        userId: req.userId,
      });
    }

    res.status(200).json({
      reminders,
    });
  } catch (error) {
    console.error("Get reminders error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Save/update reminders
router.put("/", authMiddleware, async (req, res) => {
  try {
    const { morning, afternoon, evening } = req.body;

    const reminders = await Reminder.findOneAndUpdate(
      {
        userId: req.userId,
      },
      {
        $set: {
          morning,
          afternoon,
          evening,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      message: "Reminders saved successfully",
      reminders,
    });
  } catch (error) {
    console.error("Save reminders error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;