/**
 * Turns a pasted blob of unstructured communication into structured
 * messages. Handles the formats a project team actually pastes in:
 *
 *   [3/3/26, 8:10 AM] Nora: Use the previous marble sample
 *   03/03/2026, 08:10 - Nora: Use the previous marble sample
 *   [00:04:12] Nora: Use the previous marble sample
 *   Nora: Use the previous marble sample
 *
 * Lines without a recognisable speaker prefix are treated as
 * continuations of the message above them, which is what wrapped
 * email bodies and transcript paragraphs look like.
 */

// [3/3/26, 8:10 AM] Sender: text   |   [00:04:12] Sender: text
const BRACKETED = /^\[([^\]]{1,40})\]\s*([^:]{1,60}?):\s*(.*)$/;

// 03/03/2026, 08:10 - Sender: text
const DASHED = /^(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4},?\s*\d{1,2}:\d{2}(?:\s*[APap][Mm])?)\s*[-–—]\s*([^:]{1,60}?):\s*(.*)$/;

// Sender: text
const PLAIN = /^([A-Za-z][A-Za-z.'\- ]{1,40}?):\s*(.*)$/;

// Lines an export adds that are not real messages.
const NOISE = /^(messages and calls are end-to-end encrypted|<media omitted>|this message was deleted|joined using this group)/i;

// Email headers that are routing metadata rather than message bodies.
const DROPPED_HEADER = /^(to|cc|bcc|sent|date|reply-to):\s*/i;
const FROM_HEADER = /^from:\s*(.+)$/i;
const SUBJECT_HEADER = /^subject:\s*(.+)$/i;

// Words that start a line before a colon but are never a person.
const NOT_A_SPEAKER = new Set([
  'note', 'notes', 'update', 'fyi', 'reminder', 'action', 'actions', 'warning',
  'urgent', 'status', 'summary', 're', 'fwd', 'attachment', 'attachments',
  'deadline', 'decision', 'issue', 'nb', 'ps', 'eg', 'ie', 'http', 'https',
]);

// D/M/YY, H:MM am  —  also matches M/D/YY and YYYY-MM-DD.
const DATE_TIME = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])?$/;

/**
 * WhatsApp writes dates in the exporting phone's locale, and most of the
 * world (including India) exports day-first. Passing "14/05/26" straight
 * to new Date() yields an Invalid Date, which silently stamped every
 * imported message with the time of import. Day and month are therefore
 * resolved explicitly, defaulting to day-first when the values are
 * ambiguous.
 */
const parseDateTime = (raw) => {
  const match = raw.match(DATE_TIME);
  if (!match) return null;

  let [, a, b, c, hour, minute, second, meridiem] = match;
  a = Number(a);
  b = Number(b);
  c = Number(c);

  let day;
  let month;
  let year;

  if (String(match[1]).length === 4) {
    // ISO-ish: YYYY-MM-DD
    year = a;
    month = b;
    day = c;
  } else {
    year = c;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      day = a;
      month = b;
    }
  }

  if (year < 100) year += 2000;

  let hours = Number(hour);
  if (meridiem) {
    const isPm = meridiem.toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23) return null;

  const date = new Date(Date.UTC(year, month - 1, day, hours, Number(minute), Number(second || 0)));
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseTimestamp = (raw, fallback) => {
  if (!raw) return fallback;

  const cleaned = raw.trim();

  // Pure transcript offsets like 00:04:12 carry no date; keep the fallback.
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleaned)) return fallback;

  const explicit = parseDateTime(cleaned);
  if (explicit) return explicit;

  const parsed = new Date(cleaned.replace(',', ' '));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export const parseTranscript = (rawText, { defaultSender = 'Unknown', baseTime = new Date() } = {}) => {
  const lines = String(rawText || '').split(/\r?\n/);
  const messages = [];
  let order = 0;
  let pendingSender = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || NOISE.test(trimmed)) continue;
    if (DROPPED_HEADER.test(trimmed)) continue;

    // "From: Mila" opens a new email, so the body that follows is hers.
    const fromMatch = trimmed.match(FROM_HEADER);
    if (fromMatch) {
      pendingSender = fromMatch[1].replace(/<[^>]*>/g, '').trim();
      continue;
    }

    // Subject lines often carry the deadline, so keep them as content.
    const subjectMatch = trimmed.match(SUBJECT_HEADER);
    if (subjectMatch) {
      messages.push({
        sender: pendingSender || defaultSender,
        content: subjectMatch[1].trim(),
        timestamp: new Date(baseTime.getTime() + order * 60000),
      });
      order += 1;
      continue;
    }

    let match = trimmed.match(BRACKETED) || trimmed.match(DASHED);
    let sender;
    let content;
    let stamp;

    if (match) {
      stamp = parseTimestamp(match[1], new Date(baseTime.getTime() + order * 60000));
      sender = match[2].trim();
      content = match[3].trim();
    } else {
      match = trimmed.match(PLAIN);
      if (match) {
        // Guard against ordinary sentences that happen to contain a colon.
        const candidate = match[1].trim();
        const looksLikeName =
          candidate.split(/\s+/).length <= 4 && !NOT_A_SPEAKER.has(candidate.toLowerCase());
        if (looksLikeName) {
          stamp = new Date(baseTime.getTime() + order * 60000);
          sender = candidate;
          content = match[2].trim();
        }
      }
    }

    if (sender) {
      if (!content) continue;
      messages.push({ sender, content, timestamp: stamp });
      order += 1;
      continue;
    }

    // No speaker prefix: continuation of the previous message.
    if (messages.length) {
      messages[messages.length - 1].content += ` ${trimmed}`;
    } else {
      messages.push({
        sender: defaultSender,
        content: trimmed,
        timestamp: new Date(baseTime.getTime()),
      });
      order += 1;
    }
  }

  // Nothing matched a known shape, so keep the paste intact as one note
  // rather than silently dropping it.
  if (!messages.length) {
    const fallback = String(rawText || '').trim();
    if (!fallback) return [];
    return [{ sender: defaultSender, content: fallback, timestamp: new Date(baseTime.getTime()) }];
  }

  return messages.map((message) => ({
    ...message,
    sender: message.sender || defaultSender,
    content: message.content.trim(),
  }));
};

export default parseTranscript;
