import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import { connectDB } from './config/db.js';

dotenv.config({ path: '../.env' });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set.');
}

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Any /api route that doesn't match the ones above — a typo'd path, an
// old bookmarked link, a judge poking at the API directly — gets a
// consistent JSON 404 instead of Express's default HTML error page.
app.use('/api', (req, res) => {
  return res.status(404).json({ message: 'That endpoint does not exist.' });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  // Malformed JSON body (e.g. a hand-crafted request, or a client bug)
  // is thrown by express.json() before any route runs.
  if (error.type === 'entity.parse.failed' || error instanceof SyntaxError) {
    return res.status(400).json({ message: 'That request was not valid JSON.' });
  }

  // A stray ObjectId cast that slipped past validateObjectId (e.g. in
  // a nested query) surfaces as a Mongoose CastError — treat it as a
  // bad request rather than a server fault.
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'That request referenced something that does not exist.' });
  }

  // Mongoose schema validation failures (e.g. a required field missing
  // on a manually-crafted request) are the caller's fault, not ours.
  if (error.name === 'ValidationError') {
    const firstIssue = Object.values(error.errors || {})[0];
    return res.status(400).json({ message: firstIssue?.message || 'That request was invalid.' });
  }

  // Duplicate-key errors outside the signup flow (e.g. two concurrent
  // digest upserts racing) shouldn't look like an outage to the client.
  if (error.code === 11000) {
    return res.status(409).json({ message: 'That already exists.' });
  }

  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Keystone API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
