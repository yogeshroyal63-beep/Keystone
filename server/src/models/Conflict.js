import mongoose from 'mongoose';

const conflictSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    conflictingMessageRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    description: { type: String, required: true, trim: true },
    resolutionStatus: { type: String, enum: ['unresolved', 'resolved'], default: 'unresolved' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Conflict', conflictSchema);
