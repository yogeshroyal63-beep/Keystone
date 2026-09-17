import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    channel: { type: String, enum: ['whatsapp', 'email', 'site'], required: true },
    sender: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    timestamp: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);
