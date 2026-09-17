import express from 'express';
import Project from '../models/Project.js';
import Message from '../models/Message.js';
import Digest from '../models/Digest.js';
import ActionItem from '../models/ActionItem.js';
import Conflict from '../models/Conflict.js';
import Decision from '../models/Decision.js';
import User from '../models/User.js';
import { protect, requireProjectMember } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyzeProjectMessages, searchProjectMemory } from '../services/llmService.js';
import { parseTranscript } from '../services/transcriptParser.js';

const router = express.Router();

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const projects = await Project.find({ members: req.user._id }).populate('members', 'name email role').sort({ updatedAt: -1 });

  const result = await Promise.all(
    projects.map(async (project) => {
      const latestMessage = await Message.findOne({ project: project._id }).sort({ timestamp: -1 });
      const unresolvedConflicts = await Conflict.countDocuments({ project: project._id, resolutionStatus: 'unresolved' });
      const pendingActions = await ActionItem.countDocuments({ project: project._id, status: 'open' });
      const channelSet = new Set((await Message.find({ project: project._id }).select('channel')).map((m) => m.channel));

      return {
        _id: project._id,
        name: project.name,
        createdBy: project.createdBy,
        members: project.members,
        unresolvedConflictCount: unresolvedConflicts,
        pendingActionItems: pendingActions,
        lastActivity: latestMessage ? latestMessage.timestamp : project.updatedAt,
        connectedChannels: [...channelSet],
      };
    })
  );

  return res.json({ projects: result });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, memberEmails = [] } = req.body;
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    return res.status(400).json({ message: 'Project name is required.' });
  }

  if (trimmedName.length > 200) {
    return res.status(400).json({ message: 'Project name is too long — keep it under 200 characters.' });
  }

  const requestedEmails = [...new Set(
    (Array.isArray(memberEmails) ? memberEmails : [memberEmails])
      .flatMap((value) => (typeof value === 'string' ? value.split(/[\n,;]+/) : []))
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean)
      .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  )];

  const users = await User.find({ email: { $in: requestedEmails } });
  const foundEmails = new Set(users.map((u) => u.email));
  // Emails typed in but with no matching account: surfaced back to the
  // caller rather than silently dropped, so a judge who invites a
  // colleague who hasn't signed up yet sees why they weren't added.
  const unmatchedEmails = requestedEmails.filter((email) => !foundEmails.has(email));

  const members = [...new Set([req.user._id.toString(), ...users.map((u) => u._id.toString())])].map((id) => id);

  const project = await Project.create({
    name: trimmedName,
    createdBy: req.user._id,
    members,
  });

  const populated = await project.populate('members', 'name email role');

  return res.status(201).json({ project: populated, unmatchedEmails });
}));

router.get('/:id', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('members', 'name email role');
  return res.json({ project });
}));

router.get('/:id/messages', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const messages = await Message.find({ project: req.params.id }).sort({ timestamp: 1 });
  return res.json({ messages });
}));

router.post('/:id/messages', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const { channel, sender, content, timestamp } = req.body;

  if (!channel || !sender || !content) {
    return res.status(400).json({ message: 'Channel, sender, and content are required.' });
  }

  if (!['whatsapp', 'email', 'site'].includes(channel)) {
    return res.status(400).json({ message: 'Channel must be whatsapp, email, or site.' });
  }

  const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return res.status(400).json({ message: 'That timestamp is not valid.' });
  }

  const message = await Message.create({
    project: req.params.id,
    channel,
    sender: String(sender).trim(),
    content: String(content).trim(),
    timestamp: parsedTimestamp,
  });

  return res.status(201).json({ message });
}));

/**
 * Conversation capture. Accepts a raw paste — a WhatsApp export, an
 * email chain, meeting notes or a transcript — splits it into
 * structured messages, and optionally runs analysis straight away so
 * the extraction is visible in one step.
 */
router.post('/:id/ingest', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const { channel = 'whatsapp', sender = 'Unknown', rawText, analyze = true } = req.body;

  if (!rawText || !String(rawText).trim()) {
    return res.status(400).json({ message: 'Paste some conversation text to capture.' });
  }

  if (String(rawText).length > 200000) {
    return res.status(400).json({ message: 'That paste is too long — try splitting it into smaller chunks.' });
  }

  if (!['whatsapp', 'email', 'site'].includes(channel)) {
    return res.status(400).json({ message: 'Channel must be whatsapp, email, or site.' });
  }

  const parsed = parseTranscript(rawText, { defaultSender: sender || 'Unknown', baseTime: new Date() });

  if (!parsed.length) {
    return res.status(400).json({ message: 'Nothing readable in that paste.' });
  }

  const created = await Message.insertMany(
    parsed.map((message) => ({
      project: req.params.id,
      channel,
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp,
    }))
  );

  const digest = analyze ? await analyzeProjectMessages(req.params.id) : null;

  return res.status(201).json({ captured: created.length, messages: created, digest });
}));

router.get('/:id/digest', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const digest = await Digest.findOne({ project: req.params.id }).sort({ generatedAt: -1 });
  return res.json({ digest });
}));

router.get('/:id/actions', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const actions = await ActionItem.find({ project: req.params.id }).populate('sourceMessage').sort({ status: 1, createdAt: -1 });
  return res.json({ actions });
}));

router.get('/:id/conflicts', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const conflicts = await Conflict.find({ project: req.params.id }).populate('conflictingMessageRefs').sort({ createdAt: -1 });
  return res.json({ conflicts });
}));

router.get('/:id/decisions', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const decisions = await Decision.find({ project: req.params.id }).populate('sourceMessage').sort({ createdAt: -1 });
  return res.json({ decisions });
}));

router.get('/:id/memory', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const results = await searchProjectMemory(req.params.id, String(q));
  return res.json(results);
}));

/**
 * Conversation-to-task conversion: an extracted action is a task the
 * team can actually work, so its status is owned by the user and is
 * preserved across re-analysis.
 */
router.patch('/actions/:actionId', protect, validateObjectId('actionId'), asyncHandler(async (req, res) => {
  const { status, owner, dueDate } = req.body;

  const action = await ActionItem.findById(req.params.actionId);

  if (!action) {
    return res.status(404).json({ message: 'Action item not found.' });
  }

  const hasAccess = await Project.findOne({ _id: action.project, members: req.user._id });

  if (!hasAccess) {
    return res.status(403).json({ message: 'You do not have access to this action item.' });
  }

  if (status) {
    if (!['open', 'done'].includes(status)) {
      return res.status(400).json({ message: 'Status must be open or done.' });
    }
    action.status = status;
  }

  if (typeof owner === 'string' && owner.trim()) {
    action.owner = owner.trim().slice(0, 200);
  }

  if (dueDate !== undefined) {
    const parsed = dueDate ? new Date(dueDate) : null;
    action.dueDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  await action.save();
  await action.populate('sourceMessage');

  return res.json({ action });
}));

// Sign off a pending approval from the decision log.
router.patch('/decisions/:decisionId/approve', protect, validateObjectId('decisionId'), asyncHandler(async (req, res) => {
  const decision = await Decision.findById(req.params.decisionId);

  if (!decision) {
    return res.status(404).json({ message: 'Decision not found.' });
  }

  const hasAccess = await Project.findOne({ _id: decision.project, members: req.user._id });

  if (!hasAccess) {
    return res.status(403).json({ message: 'You do not have access to this decision.' });
  }

  decision.status = 'decided';
  decision.manuallyResolved = true;
  decision.approvedBy = req.user._id;
  decision.approvedAt = new Date();
  await decision.save();
  await decision.populate('sourceMessage');

  return res.json({ decision });
}));

router.patch('/conflicts/:conflictId/resolve', protect, validateObjectId('conflictId'), asyncHandler(async (req, res) => {
  const conflict = await Conflict.findById(req.params.conflictId).populate('project');

  if (!conflict) {
    return res.status(404).json({ message: 'Conflict not found.' });
  }

  if (!conflict.project) {
    return res.status(404).json({ message: 'The project for this conflict no longer exists.' });
  }

  const projectId = conflict.project._id.toString();
  const hasAccess = await Project.findOne({ _id: projectId, members: req.user._id });

  if (!hasAccess) {
    return res.status(403).json({ message: 'You do not have access to this conflict.' });
  }

  conflict.resolutionStatus = 'resolved';
  conflict.resolvedBy = req.user._id;
  await conflict.save();

  return res.json({ conflict });
}));

router.post('/:id/analyze', validateObjectId('id'), requireProjectMember, asyncHandler(async (req, res) => {
  const digest = await analyzeProjectMessages(req.params.id);
  return res.json({ digest, sourcedFrom: digest?.generatedAt ? 'live-or-cached' : 'empty' });
}));

export default router;
