const mongoose = require("mongoose");

// Canonical daily date key: "YYYY-MM-DD"
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const habitSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    description: {
        type: String,
        default: "",
        maxlength: 500
    },

    // e.g. "Health", "Fitness", "Mindfulness", "Productivity", "Learning", ...
    category: {
        type: String,
        default: "Health",
        maxlength: 50
    },

    // Emoji shown on the habit card, e.g. "🧘"
    icon: {
        type: String,
        default: "🎯",
        maxlength: 16
    },

    // Hex color shown on the habit card, e.g. "#22D3EE"
    color: {
        type: String,
        default: "#3B66F5",
        maxlength: 16
    },

    timeOfDay: {
        type: String,
        enum: ["morning", "afternoon", "evening"],
        default: "morning"
    },

    // Days the habit repeats on: 0 = Sunday ... 6 = Saturday
    targetDays: {
        type: [Number],
        default: [0, 1, 2, 3, 4, 5, 6]
    },

    // Rich per-day status history. One entry per date:
    //   done  -> counts toward streaks + completion rate
    //   skip  -> neutral, bridges a streak without extending it
    //   fail  -> breaks the current streak
    completions: {
        type: [
            {
                date: { type: String, match: DATE_KEY_RE },
                status: { type: String, enum: ["done", "skip", "fail"] }
            }
        ],
        default: []
    },

    // Kept from the original backend for backwards compatibility ("done" dates only).
    completedDates: {
        type: [String],
        default: []
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

habitSchema.index({ userId: 1, createdAt: 1 });

// Serialize with an `id` field and convert the completions array into the
// { "YYYY-MM-DD": "done" | "skip" | "fail" } map the frontend expects.
// Legacy completedDates (from the original backend) are folded in as "done".
habitSchema.set("toJSON", {
    versionKey: false,
    transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;

        const map = {};
        for (const d of ret.completedDates || []) {
            if (!map[d]) map[d] = "done";
        }
        for (const c of ret.completions || []) {
            map[c.date] = c.status;
        }
        ret.completions = map;
        return ret;
    }
});

module.exports = mongoose.model("Habit", habitSchema);