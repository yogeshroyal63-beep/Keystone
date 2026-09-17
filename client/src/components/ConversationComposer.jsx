import { useState } from 'react';
import { ClipboardPaste, Loader2, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const channels = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'site', label: 'Site note' },
];

// Matches the paste used in the README demo script, so "Use a sample
// paste" reproduces the demo in one click.
const sample = `[14/05/26, 8:12 AM] Dev: Structural comments are back. Beam strengthening is approved as drawn.
[14/05/26, 8:15 AM] Priya: Noted. That means the steel order has to be placed by 22 May or we miss the fabrication slot.
[14/05/26, 8:19 AM] Dev: I'll raise the purchase order today and send it to you for sign-off.
[14/05/26, 8:24 AM] Priya: Hold on — the cladding spec is still pending approval, don't order that part yet.`;

export default function ConversationComposer({ projectId, onCaptured }) {
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState('whatsapp');
  const [sender, setSender] = useState('');
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const reset = () => {
    setRawText('');
    setSender('');
    setError('');
    setResult('');
  };

  const capture = async (event) => {
    event.preventDefault();
    if (!rawText.trim()) return;

    setSaving(true);
    setError('');
    setResult('');

    try {
      const data = await apiRequest(
        `/api/projects/${projectId}/ingest`,
        {
          method: 'POST',
          body: JSON.stringify({ channel, sender: sender.trim() || 'Unknown', rawText }),
        },
        accessToken
      );

      setRawText('');
      setResult(
        `Captured ${data.captured} ${data.captured === 1 ? 'message' : 'messages'} and re-read the thread.`
      );
      await onCaptured?.();
    } catch (err) {
      setError(err.message || 'That paste could not be captured.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ghost-button"
      >
        <ClipboardPaste size={14} />
        Add conversation
      </button>
    );
  }

  return (
    <section className="surface mb-8 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-[1.4rem] text-ink">Add conversation</h2>
          <p className="mt-1 text-[13px] text-muted">
            Paste a WhatsApp export, an email chain, or meeting notes. Keystone splits it into
            messages and re-reads the thread for tasks, deadlines and decisions.
          </p>
        </div>
        <button type="button" onClick={() => { setOpen(false); reset(); }} aria-label="Close" className="ghost-button">
          <X size={14} />
        </button>
      </div>

      <form onSubmit={capture} className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="flex-1 min-w-[150px]">
            <span className="mb-1.5 block text-[13px] text-muted">Channel</span>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className="premium-input"
            >
              {channels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex-1 min-w-[150px]">
            <span className="mb-1.5 block text-[13px] text-muted">
              Sender <span className="text-muted">(used only when the paste has no names)</span>
            </span>
            <input
              type="text"
              value={sender}
              onChange={(event) => setSender(event.target.value)}
              placeholder="e.g. Ravi"
              className="premium-input"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted">Conversation</span>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={7}
            placeholder={sample}
            className="premium-input resize-y font-mono text-[13px] leading-6"
          />
        </label>

        {error ? <p className="text-[13px] text-rust">{error}</p> : null}
        {result ? <p className="text-[13px] text-blueprint">{result}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || !rawText.trim()}
            className="premium-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Reading conversation…' : 'Capture and analyse'}
          </button>

          <button
            type="button"
            onClick={() => setRawText(sample)}
            className="ghost-button"
          >
            Use a sample paste
          </button>
        </div>
      </form>
    </section>
  );
}
