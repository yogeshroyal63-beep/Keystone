import mongoose from 'mongoose';

/**
 * Guards a route param that is expected to be a Mongo ObjectId.
 * Without this, a judge navigating to a made-up or malformed URL
 * (e.g. /project/hello/threads, or an id copy-pasted with a typo)
 * causes Mongoose to throw a CastError deep inside the route, which
 * — pre-asyncHandler — either hung the request or surfaced as an
 * opaque 500. This turns that into a clean, expected 400.
 */
export const validateObjectId = (...paramNames) => (req, res, next) => {
  for (const paramName of paramNames) {
    const value = req.params[paramName];
    if (!mongoose.isValidObjectId(value)) {
      return res.status(400).json({ message: 'That link looks broken — check the URL and try again.' });
    }
  }
  return next();
};

export default validateObjectId;
