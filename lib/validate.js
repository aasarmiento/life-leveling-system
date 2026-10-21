// Checks for data sent by the pages, before anything touches the database.
// Each check returns { value } when the data is fine, or { error, field } when it isn't.
// The messages match the ones the Sign in / Create account pages already show.

// name@site.com: an @, a dot in the domain, and 2+ letters at the end (same rule as nav.js)
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200; // stops someone from sending a huge "password"
const NAME_MAX = 40;
const AVATARS = ["lime", "gold"];

const text = (v) => (typeof v === "string" ? v.trim() : "");

function checkEmail(raw) {
  const email = text(raw).toLowerCase();
  if (!email) return { error: "Enter your email address.", field: "email" };
  if (email.length > 254 || !EMAIL_RE.test(email))
    return { error: "Enter a full email address, like name@example.com.", field: "email" };
  return { value: email };
}

function checkSignup(body) {
  const b = body && typeof body === "object" ? body : {};
  const name = text(b.name);
  if (!name) return { error: "Enter a display name.", field: "name" };
  if (name.length > NAME_MAX) return { error: `Use ${NAME_MAX} characters or fewer.`, field: "name" };
  const email = checkEmail(b.email);
  if (email.error) return email;
  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < PASSWORD_MIN) return { error: "Use at least 8 characters.", field: "password" };
  if (password.length > PASSWORD_MAX) return { error: `Use ${PASSWORD_MAX} characters or fewer.`, field: "password" };
  const avatar = AVATARS.includes(b.avatar) ? b.avatar : "lime";
  return { value: { name, email: email.value, password, avatar } };
}

function checkSignin(body) {
  const b = body && typeof body === "object" ? body : {};
  const email = checkEmail(b.email);
  if (email.error) return email;
  const password = typeof b.password === "string" ? b.password : "";
  if (!password) return { error: "Enter your password.", field: "password" };
  return { value: { email: email.value, password: password.slice(0, PASSWORD_MAX + 1) } };
}

module.exports = { checkSignup, checkSignin, EMAIL_RE };
