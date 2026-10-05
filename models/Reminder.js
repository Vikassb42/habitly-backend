const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    morning: {
      enabled: {
        type: Boolean,
        default: true,
      },
      time: {
        type: String,
        default: "07:00",
      },
    },

    afternoon: {
      enabled: {
        type: Boolean,
        default: false,
      },
      time: {
        type: String,
        default: "13:00",
      },
    },

    evening: {
      enabled: {
        type: Boolean,
        default: true,
      },
      time: {
        type: String,
        default: "20:00",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Reminder", reminderSchema);