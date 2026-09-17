import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import ProjectTabs from '../components/ProjectTabs';

export default function ProjectDecisionsPage() {
  const { id: projectId } = useParams();
  const { accessToken } = useAuth();
  const [project, setProject] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const [projectRes, decisionsRes] = await Promise.all([
          apiRequest(`/api/projects/${projectId}`, {}, accessToken),
          apiRequest(`/api/projects/${projectId}/decisions`, {}, accessToken),
        ]);
        setProject(projectRes.project);
        setDecisions(decisionsRes.decisions || []);
      } catch (err) {
        setError(err.message || 'Unable to load decisions.');
      }
    };

    load();
  }, [accessToken, projectId]);

  const approve = async (decision) => {
    setBusyId(decision._id);
    setActionError('');
    try {
      const data = await apiRequest(
        `/api/projects/decisions/${decision._id}/approve`,
        { method: 'PATCH' },
        accessToken
      );
      setDecisions((current) =>
        current.map((item) => (item._id === decision._id ? data.decision : item))
      );
    } catch (err) {
      setActionError(err.message || 'Could not sign that off — try again.');
    } finally {
      setBusyId(null);
    }
  };

  const { pending, settled } = useMemo(
    () => ({
      pending: decisions.filter((item) => item.status === 'pending_approval'),
      settled: decisions.filter((item) => item.status !== 'pending_approval'),
    }),
    [decisions]
  );

  const renderRow = (decision) => {
    const isPending = decision.status === 'pending_approval';

    return (
      <div key={decision._id} className="record-row">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[15px] leading-6 text-ink">{decision.description}</p>
            <p className="mt-1 text-[13px] text-muted">
              {decision.decidedBy ? `${decision.decidedBy} · ` : ''}
              {decision.sourceMessage
                ? `said by ${decision.sourceMessage.sender} on ${new Date(
                    decision.sourceMessage.timestamp
                  ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                : 'from project communication'}
              {decision.approvedAt
                ? ` · signed off ${new Date(decision.approvedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}`
                : ''}
            </p>
          </div>

          {isPending ? (
            <button
              type="button"
              onClick={() => approve(decision)}
              disabled={busyId === decision._id}
              className="ghost-button shrink-0 disabled:opacity-60"
            >
              <Check size={14} />
              <span className="hidden sm:inline">Sign off</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="surface p-8 text-center">
        <h2 className="font-serif text-[2rem] text-ink">Unable to load decisions</h2>
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
        title="Decisions"
      />

      <ProjectTabs projectId={projectId} />

      {actionError ? (
        <p className="mb-5 text-[13px] text-rust">{actionError}</p>
      ) : null}

      {decisions.length ? (
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 font-serif text-[1.4rem] text-ink">
              Waiting on approval
              <span className="ml-2 text-[14px] font-sans text-muted">{pending.length}</span>
            </h2>
            <div className="border-t border-hair">
              {pending.length ? (
                pending.map(renderRow)
              ) : (
                <p className="py-6 text-[14px] text-muted">Nothing is waiting on a sign-off.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-[1.4rem] text-ink">
              Settled
              <span className="ml-2 text-[14px] font-sans text-muted">{settled.length}</span>
            </h2>
            <div className="border-t border-hair">
              {settled.length ? (
                settled.map(renderRow)
              ) : (
                <p className="py-6 text-[14px] text-muted">No settled decisions yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <p className="text-[14px] text-muted">
          No decisions found yet. Capture a conversation on the thread and run the analysis.
        </p>
      )}
    </div>
  );
}
