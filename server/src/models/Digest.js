import mongoose from 'mongoose';

const digestSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    summaryText: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Digest', digestSchema);
