import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Undo2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import ProjectTabs from '../components/ProjectTabs';

const formatDue = (value) => {
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (days < 0) return { label: `Due ${label} · ${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: `Due today`, overdue: false, soon: true };
  if (days <= 3) return { label: `Due ${label} · in ${days}d`, overdue: false, soon: true };
  return { label: `Due ${label}`, overdue: false };
};

export default function ProjectActionsPage() {
  const { id: projectId } = useParams();
  const { accessToken } = useAuth();
  const [project, setProject] = useState(null);
  const [actions, setActions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const [projectRes, actionsRes] = await Promise.all([
          apiRequest(`/api/projects/${projectId}`, {}, accessToken),
          apiRequest(`/api/projects/${projectId}/actions`, {}, accessToken),
        ]);
        setProject(projectRes.project);
        setActions(actionsRes.actions || []);
      } catch (err) {
        setError(err.message || 'Unable to load project tasks.');
      }
    };

    load();
  }, [accessToken, projectId]);

  const toggleStatus = async (action) => {
    const nextStatus = action.status === 'done' ? 'open' : 'done';
    setBusyId(action._id);
    setActionError('');

    try {
      const data = await apiRequest(
        `/api/projects/actions/${action._id}`,
        { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) },
        accessToken
      );
      setActions((current) => current.map((item) => (item._id === action._id ? data.action : item)));
    } catch (err) {
      setActionError(err.message || 'Could not update that task — try again.');
    } finally {
      setBusyId(null);
    }
  };

  const visibleActions = useMemo(
    () =>
      actions
        .filter((item) => statusFilter === 'all' || item.status === statusFilter)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
          if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        }),
    [actions, statusFilter]
  );

  const openCount = actions.filter((item) => item.status === 'open').length;

  if (error) {
    return (
      <div className="surface p-8 text-center">
        <h2 className="font-serif text-[2rem] text-ink">Unable to load tasks</h2>
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
        title="Tasks"
        actions={
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter tasks by status"
            className="rounded-full border border-hair bg-chip px-3 py-2 text-[13px] text-ink"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
        }
      />

      <ProjectTabs projectId={projectId} />

      <p className="mb-5 text-[14px] text-muted">
        {actions.length
          ? `${openCount} open of ${actions.length} pulled out of the conversation.`
          : 'Nothing pulled out of the conversation yet.'}
      </p>

      {actionError ? (
        <p className="mb-5 text-[13px] text-rust">{actionError}</p>
      ) : null}

      <div className="border-t border-hair">
        {visibleActions.length ? (
          visibleActions.map((item) => {
            const due = item.dueDate ? formatDue(item.dueDate) : null;
            const isDone = item.status === 'done';

            return (
              <div key={item._id} className="record-row">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`text-[15px] leading-6 ${isDone ? 'mark-done' : 'mark-open'}`}>
                      <span className={isDone ? 'text-muted line-through' : 'text-ink'}>
                        {item.description}
                      </span>
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      {item.owner} · from {item.sourceMessage?.sender || 'project message'}
                    </p>
                    {due ? (
                      <p
                        className={`mt-1 text-[13px] ${
                          isDone ? 'text-muted' : due.overdue ? 'text-rust' : due.soon ? 'text-[var(--warning)]' : 'text-muted'
                        }`}
                      >
                        {due.label}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleStatus(item)}
                    disabled={busyId === item._id}
                    className="ghost-button shrink-0 disabled:opacity-60"
                  >
                    {isDone ? <Undo2 size={14} /> : <Check size={14} />}
                    <span className="hidden sm:inline">{isDone ? 'Reopen' : 'Mark done'}</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-8 text-[14px] text-muted">No tasks match this filter.</p>
        )}
      </div>
    </div>
  );
}
