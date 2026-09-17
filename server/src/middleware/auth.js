import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Project from '../models/Project.js';

dotenv.config({ path: '../.env' });

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set.');
  }

  return process.env.JWT_SECRET;
};

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.sub).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId).populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isMember = project.members.some((member) => member._id.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this project.' });
    }

    req.project = project;
    next();
  } catch (error) {
    // A malformed id (not a valid ObjectId) is the caller's mistake,
    // not a server fault — routes that mount this after
    // validateObjectId won't hit this branch, but requireProjectMember
    // is safe to use on its own too.
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'That link looks broken — check the URL and try again.' });
    }
    return next(error);
  }
};
