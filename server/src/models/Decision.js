import mongoose from 'mongoose';

const decisionSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sourceMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    description: { type: String, required: true, trim: true },
    // "decided": already made. "pending_approval": explicitly awaiting sign-off.
    status: { type: String, enum: ['decided', 'pending_approval'], default: 'decided' },
    decidedBy: { type: String, default: '', trim: true },
    // Set when someone signs off in the app. Re-analysis leaves these alone.
    manuallyResolved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Decision', decisionSchema);
