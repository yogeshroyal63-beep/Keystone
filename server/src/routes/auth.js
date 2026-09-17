import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/tokens.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const trimmedName = String(name || '').trim();
  const trimmedEmail = normalizeEmail(email);
  const trimmedPassword = String(password || '').trim();

  if (!trimmedName || !trimmedEmail || !trimmedPassword) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (trimmedName.length > 200) {
    return res.status(400).json({ message: 'Name is too long — keep it under 200 characters.' });
  }

  if (!emailPattern.test(trimmedEmail)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  if (trimmedPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  if (trimmedPassword.length > 200) {
    return res.status(400).json({ message: 'Password is too long.' });
  }

  const existingUser = await User.findOne({ email: trimmedEmail });
  if (existingUser) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

  let user;
  try {
    user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      role: 'member',
    });
  } catch (error) {
    // A duplicate-key race: two signups for the same email landed
    // between the findOne check above and this create.
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }
    throw error;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = normalizeEmail(email);
  const trimmedPassword = String(password || '').trim();

  if (!trimmedEmail || !trimmedPassword) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (!emailPattern.test(trimmedEmail)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  const user = await User.findOne({ email: trimmedEmail });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isMatch = await bcrypt.compare(trimmedPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    const payload = verifyToken(refreshToken);

    if (payload.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const user = await User.findById(payload.sub).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Session expired.' });
    }

    const accessToken = generateAccessToken(user);
    const nextRefreshToken = generateRefreshToken(user);

    return res.json({
      accessToken,
      refreshToken: nextRefreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token.' });
  }
}));

router.get('/me', protect, asyncHandler(async (req, res) => {
  return res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role },
  });
}));

export default router;
