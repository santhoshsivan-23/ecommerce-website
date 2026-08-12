const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'insecure_dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_EXPIRES_DAYS = Number(process.env.COOKIE_EXPIRES_DAYS || 7);

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/** Sets the auth cookie and returns the token so clients can also use a Bearer header. */
function sendTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
  return token;
}

function clearTokenCookie(res) {
  res.clearCookie('token');
}

module.exports = { signToken, verifyToken, sendTokenCookie, clearTokenCookie };
