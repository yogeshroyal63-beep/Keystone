import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Check } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import ProjectTabs from '../components/ProjectTabs';

export default function ProjectConflictsPage() {
  const { id: projectId } = useParams();
  const { accessToken } = useAuth();
  const [project, setProject] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadConflicts = async () => {
    try {
      setError('');
      const [projectRes, conflictsRes] = await Promise.all([
        apiRequest(`/api/projects/${projectId}`, {}, accessToken),
        apiRequest(`/api/projects/${projectId}/conflicts`, {}, accessToken),
      ]);
      setProject(projectRes.project);
      setConflicts(conflictsRes.conflicts || []);
    } catch (err) {
      setError(err.message || 'Unable to load conflict log.');
    }
  };

  useEffect(() => {
    loadConflicts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, projectId]);

  const resolveConflict = async (conflictId) => {
    if (busyId) return;
    setBusyId(conflictId);
    setActionError('');
    try {
      await apiRequest(`/api/projects/conflicts/${conflictId}/resolve`, { method: 'PATCH' }, accessToken);
      await loadConflicts();
    } catch (err) {
      setActionError(err.message || 'Could not mark that resolved — try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="surface p-8 text-center">
        <h2 className="font-serif text-[2rem] text-ink">Unable to load conflict log</h2>
        <p className="mt-3 text-[14px] text-muted">{error}</p>
        <a href="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-full bg-blueprint px-4 py-2 text-[14px] font-medium text-surface">
          Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        back={{ to: `/project/${projectId}/threads`, label: project?.name || 'Back to thread' }}
        title="Conflict log"
      />

      <ProjectTabs projectId={projectId} />

      {actionError ? (
        <p className="mb-5 text-[13px] text-rust">{actionError}</p>
      ) : null}

      <div className="space-y-6">
        {conflicts.length === 0 && (
          <p className="text-[14px] text-muted">No contradictions have been flagged yet.</p>
        )}

        {conflicts.map((conflict) => (
          <div key={conflict._id} className="conflict-brace py-1">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[13px] text-rust">
                <AlertTriangle size={13} />
                {conflict.resolutionStatus === 'resolved' ? 'Resolved' : 'Unresolved'}
              </span>
            </div>

            <p className="mb-3 font-serif text-[19px] leading-snug text-ink">{conflict.description}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {conflict.conflictingMessageRefs?.filter(Boolean).map((message) => (
                <div key={message._id} className="surface p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px] text-muted">
                    <span className="source-tag">{(message.channel || '').toUpperCase()}</span>
                    <span>{new Date(message.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[13px] font-medium text-ink">{message.sender}</p>
                  <p className="mt-1 text-[14px] leading-6 text-ink">{message.content}</p>
                </div>
              ))}
            </div>

            {conflict.resolutionStatus !== 'resolved' ? (
              <button
                type="button"
                onClick={() => resolveConflict(conflict._id)}
                disabled={busyId === conflict._id}
                className="mt-4 flex items-center gap-1.5 text-[13px] text-blueprint transition hover:text-blueprintDeep disabled:opacity-60"
              >
                <Check size={14} />
                {busyId === conflict._id ? 'Marking resolved…' : 'Mark resolved'}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
