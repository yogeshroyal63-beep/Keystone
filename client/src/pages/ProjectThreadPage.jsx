import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Mail, MessageSquareText, RefreshCcw, ShieldAlert } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import ProjectTabs from '../components/ProjectTabs';
import ConversationComposer from '../components/ConversationComposer';

const channelMeta = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquareText },
  email: { label: 'Email', icon: Mail },
  site: { label: 'Site note', icon: ShieldAlert },
};

export default function ProjectThreadPage() {
  const { id: projectId } = useParams();
  const { accessToken } = useAuth();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [actions, setActions] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('all');

  const loadThreadState = async () => {
    const [projectRes, messagesRes, digestRes, actionsRes, conflictsRes, decisionsRes] = await Promise.all([
      apiRequest(`/api/projects/${projectId}`, {}, accessToken),
      apiRequest(`/api/projects/${projectId}/messages`, {}, accessToken),
      apiRequest(`/api/projects/${projectId}/digest`, {}, accessToken),
      apiRequest(`/api/projects/${projectId}/actions`, {}, accessToken),
      apiRequest(`/api/projects/${projectId}/conflicts`, {}, accessToken),
      apiRequest(`/api/projects/${projectId}/decisions`, {}, accessToken),
    ]);

    setProject(projectRes.project);
    setMessages(messagesRes.messages || []);
    setDigest(digestRes.digest);
    setActions(actionsRes.actions || []);
    setConflicts(conflictsRes.conflicts || []);
    setDecisions(decisionsRes.decisions || []);

    return { digest: digestRes.digest };
  };

  const analyzeNow = async () => {
    setIsAnalyzing(true);
    setError('');
    try {
      const data = await apiRequest(`/api/projects/${projectId}/analyze`, { method: 'POST' }, accessToken);
      setDigest(data.digest);
      await loadThreadState();
    } catch (err) {
      setError(err.message || 'Analysis could not be refreshed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setError('');
      try {
        const state = await loadThreadState();
        if (!state?.digest) {
          await analyzeNow();
        }
      } catch (err) {
        setError(err.message || 'Unable to load this project thread.');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, accessToken]);

  const visibleMessages = useMemo(() => {
    return selectedChannel === 'all'
      ? messages
      : messages.filter((message) => message.channel === selectedChannel);
  }, [messages, selectedChannel]);

  const uniqueChannels = useMemo(
    () => Array.from(new Set(messages.map((message) => message.channel))),
    [messages]
  );

  if (loading) {
    return <p className="text-[14px] text-muted">Reading the project thread…</p>;
  }

  if (error) {
    return (
      <div className="surface p-8 text-center">
        <h2 className="font-serif text-[2rem] text-ink">Project unavailable</h2>
        <p className="mt-3 text-[14px] text-muted">{error}</p>
        <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-full bg-blueprint px-4 py-2 text-[14px] font-medium text-surface">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        back={{ to: '/dashboard', label: 'All projects' }}
        title={project?.name || 'Project thread'}
        actions={
          <button
            type="button"
            onClick={analyzeNow}
            disabled={isAnalyzing}
            className="ghost-button disabled:opacity-60"
          >
            <RefreshCcw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            {isAnalyzing ? 'Analyzing…' : 'Re-analyze'}
          </button>
        }
      />

      <ProjectTabs projectId={projectId} />

      <ConversationComposer projectId={projectId} onCaptured={loadThreadState} />

      <div className="grid gap-8 lg:grid-cols-[150px_minmax(0,1fr)_340px]">
        <aside>
          <p className="mb-3 text-[13px] font-medium text-muted">Channels</p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedChannel('all')}
              className={`block w-full py-1.5 text-left text-[14px] transition ${
                selectedChannel === 'all' ? 'text-blueprint' : 'text-muted hover:text-ink'
              }`}
            >
              All
            </button>
            {uniqueChannels.map((channel) => {
              const meta = channelMeta[channel] || { label: channel };
              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setSelectedChannel(channel)}
                  className={`block w-full py-1.5 text-left text-[14px] transition ${
                    selectedChannel === channel ? 'text-blueprint' : 'text-muted hover:text-ink'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section>
          {visibleMessages.length ? (
            visibleMessages.map((message) => {
              const meta = channelMeta[message.channel] || { label: message.channel, icon: MessageSquareText };
              const Icon = meta.icon;
              return (
                <article key={message._id} className="wire-message">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="source-tag flex items-center gap-1.5 text-muted">
                      <Icon size={12} />
                      {meta.label.toUpperCase()}
                    </span>
                    <span className="text-[12px] text-muted">
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[14px] font-medium text-ink">{message.sender}</p>
                  <p className="mt-1 text-[15px] leading-6 text-ink">{message.content}</p>
                </article>
              );
            })
          ) : (
            <div className="surface p-6 text-[14px] text-muted">
              No messages in this channel yet. Add a conversation to start building the project memory.
            </div>
          )}
        </section>

        <aside className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-[19px] text-ink">Digest</h2>
            <span className="text-[12px] text-muted">
              {isAnalyzing ? 'Updating…' : 'Current'}
            </span>
          </div>

          {isAnalyzing ? (
            <p className="border border-dashed border-hair px-3 py-4 text-[13px] text-muted">
              Reviewing the current thread with Groq…
            </p>
          ) : (
            <>
              <div className="mb-5 border-b border-hair pb-5">
                <p className="mb-2 text-[13px] font-medium text-muted">Summary</p>
                <p className="text-[14px] leading-6 text-ink">
                  {digest?.summaryText || 'No summary yet — run an analysis to generate one.'}
                </p>
              </div>

              <div className="mb-5 border-b border-hair pb-5">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-medium text-muted">Tasks</p>
                  <Link to={`/project/${projectId}/actions`} className="text-[13px] text-blueprint hover:underline">All {actions.length}</Link>
                </div>
                {actions.length ? (
                  <ul className="space-y-2.5">
                    {actions.slice(0, 4).map((item) => (
                      <li key={item._id} className="text-[13px] leading-5">
                        <span className={item.status === 'done' ? 'mark-done' : 'mark-open'}>
                          {item.description}
                        </span>
                        <span className="ml-1 text-muted">
                          — {item.owner}
                          {item.dueDate ? ` · due ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-muted">Nothing flagged yet.</p>
                )}
              </div>

              <div className="mb-5 border-b border-hair pb-5">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-medium text-muted">Decisions</p>
                  <Link to={`/project/${projectId}/decisions`} className="text-[13px] text-blueprint hover:underline">All {decisions.length}</Link>
                </div>
                {decisions.length ? (
                  <ul className="space-y-2.5">
                    {decisions.slice(0, 4).map((decision) => (
                      <li key={decision._id} className="text-[13px] leading-5 text-ink">
                        {decision.description}
                        <span className="ml-1 text-muted">
                          {decision.status === 'pending_approval' ? '· pending approval' : '· decided'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-muted">No decisions captured yet.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-medium text-muted">Contradictions</p>
                  <Link to={`/project/${projectId}/conflicts`} className="text-[13px] text-blueprint hover:underline">All {conflicts.length}</Link>
                </div>
                {conflicts.length ? (
                  <ul className="space-y-3">
                    {conflicts.slice(0, 3).map((conflict) => (
                      <li key={conflict._id} className="conflict-brace py-0.5 text-[13px] leading-5 text-ink">
                        <span className="mb-0.5 flex items-center gap-1.5 text-rust">
                          <AlertTriangle size={12} />
                        </span>
                        {conflict.description}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-muted">No open contradictions.</p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
