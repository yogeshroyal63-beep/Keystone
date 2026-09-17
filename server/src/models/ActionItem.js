import mongoose from 'mongoose';

const actionItemSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sourceMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    description: { type: String, required: true, trim: true },
    owner: { type: String, default: 'Unassigned', trim: true },
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('ActionItem', actionItemSchema);
