import Digest from '../models/Digest.js';
import ActionItem from '../models/ActionItem.js';
import Conflict from '../models/Conflict.js';
import Decision from '../models/Decision.js';
import Message from '../models/Message.js';

const formatMessageForPrompt = (message, index) => {
  const isoTime = new Date(message.timestamp).toISOString();
  return `${index}. [${message.channel}] ${message.sender} @ ${isoTime}\n${message.content}`;
};

/**
 * Re-analysis used to delete every extracted record and recreate it,
 * which threw away work the team had done in the UI: a completed task
 * came back open and a resolved conflict came back unresolved. Records
 * are now matched on their normalised description so human state
 * survives each run.
 */
const normalizeKey = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const analyzeProjectMessages = async (projectId) => {
  const messages = await Message.find({ project: projectId }).sort({ timestamp: 1 }).lean();

  if (!messages.length) {
    const fallbackDigest = await Digest.findOne({ project: projectId }).sort({ generatedAt: -1 });
    return (
      fallbackDigest || {
        project: projectId,
        summaryText: 'No project messages yet. Add updates to generate a digest.',
        generatedAt: new Date(),
      }
    );
  }

  const formattedMessages = messages.map(formatMessageForPrompt).join('\n\n');
  const todayIso = new Date().toISOString().slice(0, 10);

  const prompt = `You are reviewing project communication for a construction project. Today's date is ${todayIso}. Identify the main status, outstanding actions, deadlines, decisions/approvals, and contradictions across all messages. Use the exact message list below and infer what matters in a real construction workflow.

Return STRICT JSON with exactly these keys:
{
  "summary": "plain-language project summary paragraph",
  "actionItems": [{ "description": "clear action item", "owner": "person or team", "sourceMessageIndex": 0, "dueDate": "YYYY-MM-DD or null if no deadline is mentioned or implied" }],
  "decisions": [{ "description": "clear statement of what was decided or is pending", "status": "decided or pending_approval", "decidedBy": "person or team, empty string if unclear", "sourceMessageIndex": 0 }],
  "conflicts": [{ "description": "clear contradiction description", "messageIndexes": [0, 2], "severity": "high" }]
}

Message list:
${formattedMessages}

Rules:
- Use plain English prose for summary.
- Include only real action items that are explicit or strongly implied from the thread.
- Only set a dueDate when the thread states or clearly implies one (e.g. "by Friday", "before the pour on the 12th"); otherwise use null. Resolve relative dates against today's date.
- A decision is something that was actually settled ("approved except master bathroom"). A pending_approval is something explicitly awaiting sign-off ("please refer Rev 04 for approval"). Do not invent decisions that were not stated.
- Do not create invented details.
- Source message indexes should match the zero-based positions above.
- Conflicts should reflect genuine disagreements, not minor wording differences.
- Respond with valid JSON only, no markdown fences.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'groq/compound-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a project communication analyst. Return only valid JSON that matches the requested schema.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Groq response was empty.');
    }

    const parsed = JSON.parse(content);
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : 'No summary available.';

    const digest = await Digest.findOneAndUpdate(
      { project: projectId },
      { project: projectId, summaryText: summary, generatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await reconcileActionItems(projectId, parsed.actionItems, messages);
    await reconcileDecisions(projectId, parsed.decisions, messages);
    await reconcileConflicts(projectId, parsed.conflicts, messages);

    return digest;
  } catch (error) {
    console.error('LLM analysis failed, falling back to cached digest:', error.message);
    const lastDigest = await Digest.findOne({ project: projectId }).sort({ generatedAt: -1 });
    return (
      lastDigest || {
        project: projectId,
        summaryText:
          'The latest project recap is temporarily unavailable. Review the raw thread, then run a fresh analysis when the connection is stable.',
        generatedAt: new Date(),
      }
    );
  }
};

async function reconcileActionItems(projectId, raw, messages) {
  const items = Array.isArray(raw) ? raw : [];
  const existing = await ActionItem.find({ project: projectId });
  const byKey = new Map(existing.map((item) => [normalizeKey(item.description), item]));
  const keptIds = [];

  for (const item of items) {
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    const owner = typeof item.owner === 'string' && item.owner.trim() ? item.owner.trim() : 'Unassigned';
    const sourceMessage = messages[Number(item.sourceMessageIndex)];

    if (!description || !sourceMessage) continue;

    const parsedDue = item.dueDate && item.dueDate !== 'null' ? new Date(item.dueDate) : null;
    const dueDate = parsedDue && !Number.isNaN(parsedDue.getTime()) ? parsedDue : null;
    const prior = byKey.get(normalizeKey(description));

    if (prior) {
      // status is deliberately untouched: it belongs to the user.
      prior.description = description;
      prior.owner = owner;
      prior.dueDate = dueDate;
      prior.sourceMessage = sourceMessage._id;
      await prior.save();
      keptIds.push(prior._id);
    } else {
      const created = await ActionItem.create({
        project: projectId,
        sourceMessage: sourceMessage._id,
        description,
        owner,
        status: 'open',
        dueDate,
      });
      keptIds.push(created._id);
    }
  }

  await ActionItem.deleteMany({ project: projectId, _id: { $nin: keptIds } });
}

async function reconcileDecisions(projectId, raw, messages) {
  const decisions = Array.isArray(raw) ? raw : [];
  const existing = await Decision.find({ project: projectId });
  const byKey = new Map(existing.map((item) => [normalizeKey(item.description), item]));
  const keptIds = [];

  for (const decision of decisions) {
    const description = typeof decision.description === 'string' ? decision.description.trim() : '';
    const sourceMessage = messages[Number(decision.sourceMessageIndex)];

    if (!description || !sourceMessage) continue;

    const status = decision.status === 'pending_approval' ? 'pending_approval' : 'decided';
    const decidedBy = typeof decision.decidedBy === 'string' ? decision.decidedBy.trim() : '';
    const prior = byKey.get(normalizeKey(description));

    if (prior) {
      prior.description = description;
      prior.decidedBy = decidedBy || prior.decidedBy;
      prior.sourceMessage = sourceMessage._id;
      // A pending approval signed off in the app stays signed off.
      if (!prior.manuallyResolved) {
        prior.status = status;
      }
      await prior.save();
      keptIds.push(prior._id);
    } else {
      const created = await Decision.create({
        project: projectId,
        sourceMessage: sourceMessage._id,
        description,
        status,
        decidedBy,
      });
      keptIds.push(created._id);
    }
  }

  await Decision.deleteMany({ project: projectId, _id: { $nin: keptIds } });
}

async function reconcileConflicts(projectId, raw, messages) {
  const conflicts = Array.isArray(raw) ? raw : [];
  const existing = await Conflict.find({ project: projectId });
  const byKey = new Map(existing.map((item) => [normalizeKey(item.description), item]));
  const keptIds = [];

  for (const conflict of conflicts) {
    const description = typeof conflict.description === 'string' ? conflict.description.trim() : '';
    const rawIndexes = Array.isArray(conflict.messageIndexes) ? conflict.messageIndexes : [];
    const messageIds = rawIndexes
      .map((index) => messages[Number(index)])
      .filter(Boolean)
      .map((message) => message._id);

    if (!description || !messageIds.length) continue;

    const prior = byKey.get(normalizeKey(description));

    if (prior) {
      // resolutionStatus and resolvedBy are preserved.
      prior.description = description;
      prior.conflictingMessageRefs = messageIds;
      await prior.save();
      keptIds.push(prior._id);
    } else {
      const created = await Conflict.create({
        project: projectId,
        conflictingMessageRefs: messageIds,
        description,
        resolutionStatus: 'unresolved',
      });
      keptIds.push(created._id);
    }
  }

  await Conflict.deleteMany({ project: projectId, _id: { $nin: keptIds } });
}

/**
 * Searchable project memory. With no query this returns the most recent
 * records so the page opens as a browsable project history rather than
 * an empty search box; with a query it filters across messages, tasks
 * and decisions. Plain regex matching is enough here — the corpus is one
 * project's communication, not a whole corpus needing a search index.
 */
export const searchProjectMemory = async (projectId, query) => {
  const trimmed = (query || '').trim();

  if (!trimmed) {
    const [messages, actionItems, decisions] = await Promise.all([
      Message.find({ project: projectId }).sort({ timestamp: -1 }).limit(20),
      ActionItem.find({ project: projectId }).populate('sourceMessage').sort({ createdAt: -1 }).limit(20),
      Decision.find({ project: projectId }).populate('sourceMessage').sort({ createdAt: -1 }).limit(20),
    ]);

    return { messages, actionItems, decisions, browse: true };
  }

  const pattern = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [messages, actionItems, decisions] = await Promise.all([
    Message.find({ project: projectId, content: pattern }).sort({ timestamp: -1 }).limit(20),
    ActionItem.find({ project: projectId, description: pattern })
      .populate('sourceMessage')
      .sort({ createdAt: -1 })
      .limit(20),
    Decision.find({ project: projectId, description: pattern })
      .populate('sourceMessage')
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  return { messages, actionItems, decisions, browse: false };
};
