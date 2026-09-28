// Canonical daily date keys for India (Asia/Kolkata) — used wherever daily
// completion logic needs a timezone on the server.
const todayKeyIST = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDateKey = (key) => typeof key === "string" && DATE_KEY_RE.test(key);

module.exports = { todayKeyIST, isValidDateKey };