// Password hashing with Node's built-in crypto (no extra package).
// scrypt is slow on purpose, so guessing passwords takes a long time.
// Each account gets its own random salt; only the salt + hash are saved.
const crypto = require("crypto");

const KEY_LENGTH = 64;

function newSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, KEY_LENGTH).toString("hex");
}

// Compare in constant time so the check doesn't leak how many characters matched.
function checkPassword(password, salt, hash) {
  const attempt = Buffer.from(hashPassword(password, salt), "hex");
  const saved = Buffer.from(hash, "hex");
  return (
    attempt.length === saved.length && crypto.timingSafeEqual(attempt, saved)
  );
}

module.exports = { newSalt, hashPassword, checkPassword };
