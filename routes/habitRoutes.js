const express = require("express");
const Habit = require("../models/Habit");
const authMiddleware = require("../middleware/authMiddleware");
const { todayKeyIST, isValidDateKey } = require("../utils/dateIST");

const router = express.Router();

const STATUSES = ["done", "skip", "fail"];
const TIME_OF_DAY = ["morning", "afternoon", "evening"];

// Whitelisted habit fields the frontend may create/update. Returns null when invalid.
const pickHabitFields = (body) => {
    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.color !== undefined) data.color = body.color;
    if (body.timeOfDay !== undefined) data.timeOfDay = body.timeOfDay;
    if (body.targetDays !== undefined) {
        if (
            !Array.isArray(body.targetDays) ||
            !body.targetDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        ) {
            return null;
        }
        data.targetDays = body.targetDays;
    }
    return data;
};

// Re-sync the legacy completedDates array from the rich completions history.
const syncCompletedDates = (habit) => {
    habit.completedDates = habit.completions
        .filter((c) => c.status === "done")
        .map((c) => c.date);
};


router.post("/", authMiddleware, async (req, res) => {
    try {
        const data = pickHabitFields(req.body);

        if (data === null) {
            return res.status(400).json({
                message: "Invalid habit data: targetDays must be integers 0-6 (Sunday = 0)"
            });
        }

        if (!data.name || !String(data.name).trim()) {
            return res.status(400).json({
                message: "Habit name is required"
            });
        }

        if (data.timeOfDay !== undefined && !TIME_OF_DAY.includes(data.timeOfDay)) {
            return res.status(400).json({
                message: "timeOfDay must be morning, afternoon or evening"
            });
        }

        const habit = new Habit({
            userId: req.userId,
            ...data,
            name: String(data.name).trim()
        });

        await habit.save();

        res.status(201).json({
            message: "Habit created successfully",
            habit
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


router.get("/", authMiddleware, async (req, res) => {
    try {
        const habits = await Habit.find({
            userId: req.userId
        }).sort({ createdAt: 1 });

        res.status(200).json({
            habits
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const data = pickHabitFields(req.body);

        if (data === null) {
            return res.status(400).json({
                message: "Invalid habit data: targetDays must be integers 0-6 (Sunday = 0)"
            });
        }

        if (data.name !== undefined && !String(data.name).trim()) {
            return res.status(400).json({
                message: "Habit name cannot be empty"
            });
        }

        if (data.timeOfDay !== undefined && !TIME_OF_DAY.includes(data.timeOfDay)) {
            return res.status(400).json({
                message: "timeOfDay must be morning, afternoon or evening"
            });
        }

        const habit = await Habit.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.userId
            },
            {
                $set: data
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!habit) {
            return res.status(404).json({
                message: "Habit not found"
            });
        }

        res.status(200).json({
            message: "Habit updated successfully",
            habit
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


// Original endpoint from the uploaded backend — kept working.
// Marks today (Asia/Kolkata) as completed.
router.put("/:id/complete", authMiddleware, async (req, res) => {
    try {
        const habit = await Habit.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!habit) {
            return res.status(404).json({
                message: "Habit not found"
            });
        }

        const today = todayKeyIST();

        if (!habit.completedDates.includes(today)) {
            habit.completedDates.push(today);
        }

        // Keep the rich status history in sync too.
        const entry = habit.completions.find((c) => c.date === today);
        if (entry) {
            entry.status = "done";
        } else {
            habit.completions.push({ date: today, status: "done" });
        }

        await habit.save();

        res.status(200).json({
            message: "Habit marked as completed",
            habit
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


// Status endpoint used by the frontend.
//   body: { date?: "YYYY-MM-DD", status?: "done" | "skip" | "fail" | null | "none" }
//   - status given            -> set that status for the date (upsert)
//   - status null / "none"    -> undo: clear the entry for the date
//   - status omitted          -> toggle: done -> cleared, anything else -> done
//   - date omitted            -> today in Asia/Kolkata
router.post("/:id/complete", authMiddleware, async (req, res) => {
    try {
        const habit = await Habit.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!habit) {
            return res.status(404).json({
                message: "Habit not found"
            });
        }

        const status = req.body.status;
        const date = req.body.date || todayKeyIST();

        if (!isValidDateKey(date)) {
            return res.status(400).json({
                message: "date must be in YYYY-MM-DD format"
            });
        }

        if (status !== undefined && status !== null && status !== "none" && !STATUSES.includes(status)) {
            return res.status(400).json({
                message: "status must be done, skip, fail or none"
            });
        }

        const entryIndex = habit.completions.findIndex((c) => c.date === date);
        let message;

        if (status === null || status === "none") {
            // Undo
            if (entryIndex !== -1) habit.completions.splice(entryIndex, 1);
            message = "Status cleared";
        } else if (status === undefined) {
            // Toggle
            if (entryIndex !== -1 && habit.completions[entryIndex].status === "done") {
                habit.completions.splice(entryIndex, 1);
                message = "Status cleared";
            } else if (entryIndex !== -1) {
                habit.completions[entryIndex].status = "done";
                message = "Habit marked as completed";
            } else {
                habit.completions.push({ date, status: "done" });
                message = "Habit marked as completed";
            }
        } else {
            // Explicit status
            if (entryIndex !== -1) {
                habit.completions[entryIndex].status = status;
            } else {
                habit.completions.push({ date, status });
            }
            message = `Habit marked as ${status} for ${date}`;
        }

        syncCompletedDates(habit);

        await habit.save();

        res.status(200).json({
            message,
            habit
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


// Completion history for one habit, as the frontend's map:
//   { "YYYY-MM-DD": "done" | "skip" | "fail" }
router.get("/:id/history", authMiddleware, async (req, res) => {
    try {
        const habit = await Habit.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!habit) {
            return res.status(404).json({
                message: "Habit not found"
            });
        }

        const history = {};
        for (const d of habit.completedDates) {
            if (!history[d]) history[d] = "done";
        }
        for (const c of habit.completions) {
            history[c.date] = c.status;
        }

        res.status(200).json({
            history
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});


router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const habit = await Habit.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!habit) {
            return res.status(404).json({
                message: "Habit not found"
            });
        }

        res.status(200).json({
            message: "Habit deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});

module.exports = router;