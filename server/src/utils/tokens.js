import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set.');
  }

  return process.env.JWT_SECRET;
};

export const generateAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '15m' }
  );

export const generateRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      type: 'refresh',
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

export const verifyToken = (token) => jwt.verify(token, getJwtSecret());
