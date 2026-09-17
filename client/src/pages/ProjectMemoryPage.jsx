import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import ProjectTabs from '../components/ProjectTabs';

export default function ProjectMemoryPage() {
  const { id: projectId } = useParams();
  const { accessToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  // Guards against a slower earlier request resolving after a faster
  // later one (e.g. clearing search right after submitting it) and
  // overwriting fresher results with stale ones.
  const requestIdRef = useRef(0);

  const fetchMemory = async (term) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(
        `/api/projects/${projectId}/memory?q=${encodeURIComponent(term)}`,
        {},
        accessToken
      );
      if (requestId !== requestIdRef.current) return;
      setResults(data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setResults({ messages: [], actionItems: [], decisions: [] });
      setSearched(Boolean(term.trim()));
      setError(err.message || 'Search is temporarily unavailable.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // Open on the full project history rather than an empty search box,
  // so the memory reads as a log you can browse as well as search.
  useEffect(() => {
    fetchMemory('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, accessToken]);

  const runSearch = async (event) => {
    event.preventDefault();
    setSearched(Boolean(query.trim()));
    await fetchMemory(query.trim());
  };

  const clearSearch = async () => {
    setQuery('');
    setSearched(false);
    await fetchMemory('');
  };

  const totalResults = results
    ? results.messages.length + results.actionItems.length + results.decisions.length
    : 0;

  return (
    <div>
      <PageHeader back={{ to: `/project/${projectId}/threads`, label: 'Back to thread' }} title="Project memory" />

      <ProjectTabs projectId={projectId} />

      <form onSubmit={runSearch} className="mb-8 flex items-center gap-2 border border-hair bg-panel px-3 py-2.5">
        <Search size={16} className="text-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this project — a decision, a material, a revision number"
          className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
        />
        {query ? (
          <button type="button" onClick={clearSearch} className="text-[13px] text-muted hover:text-ink">
            Clear
          </button>
        ) : null}
      </form>

      {!searched && !loading && totalResults > 0 && (
        <p className="mb-5 text-[14px] text-muted">
          Everything recorded on this project, newest first. Search to narrow it down.
        </p>
      )}

      {error ? <p className="mb-5 text-[13px] text-rust">{error}</p> : null}

      {loading && <p className="text-[14px] text-muted">Searching…</p>}

      {!loading && !error && results && totalResults === 0 && (
        <p className="text-[14px] text-muted">
          {searched
            ? `Nothing in this project mentions “${query}”. Try a material, a name, or a revision number.`
            : 'Nothing recorded yet. Capture a conversation on the thread to build the project memory.'}
        </p>
      )}

      {!loading && results && totalResults > 0 && (
        <div className="space-y-8">
          {results.decisions.length > 0 && (
            <section>
              <p className="mb-3 text-[12px] uppercase tracking-wide text-muted">Decisions & approvals</p>
              <div className="border-t border-hair">
                {results.decisions.map((decision) => (
                  <div key={decision._id} className="record-row">
                    <p className="text-[15px] leading-6 text-ink">{decision.description}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      {decision.status === 'pending_approval' ? 'Pending approval' : 'Decided'}
                      {decision.decidedBy ? ` · ${decision.decidedBy}` : ''}
                      {decision.sourceMessage ? ` · from ${decision.sourceMessage.sender}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.actionItems.length > 0 && (
            <section>
              <p className="mb-3 text-[12px] uppercase tracking-wide text-muted">Action items</p>
              <div className="border-t border-hair">
                {results.actionItems.map((item) => (
                  <div key={item._id} className="record-row">
                    <p className={`text-[15px] leading-6 ${item.status === 'done' ? 'mark-done' : 'mark-open'}`}>
                      {item.description}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      {item.owner}
                      {item.dueDate ? ` · due ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.messages.length > 0 && (
            <section>
              <p className="mb-3 text-[12px] uppercase tracking-wide text-muted">Messages</p>
              <div>
                {results.messages.map((message) => (
                  <article key={message._id} className="wire-message">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="source-tag text-muted">{message.channel.toUpperCase()}</span>
                      <span className="text-[12px] text-muted">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-ink">{message.sender}</p>
                    <p className="mt-1 text-[15px] leading-6 text-ink">{message.content}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
