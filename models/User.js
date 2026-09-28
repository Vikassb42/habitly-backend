const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    // "local" for email/password accounts, "google" for the demo Google flow
    provider: {
        type: String,
        default: "local"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Serialize with an `id` field (matching the frontend) and never expose the
// password hash in JSON responses.
userSchema.set("toJSON", {
    versionKey: false,
    transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.name = ret.username; // the frontend uses `name`
        delete ret._id;
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model("User", userSchema);