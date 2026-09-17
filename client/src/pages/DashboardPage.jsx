import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, MessageSquareText, Plus, ShieldAlert, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

const channelIcons = {
  whatsapp: MessageSquareText,
  email: Mail,
  site: ShieldAlert,
};

export default function DashboardPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await apiRequest('/api/projects', {}, accessToken);
        setProjects(data.projects || []);
      } catch (error) {
        setProjects([]);

        if (error.message === 'Session expired' || error.message === 'Invalid or expired token.' || error.message === 'User no longer exists.') {
          logout();
          navigate('/login', { replace: true });
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [accessToken, logout, navigate]);

  const handleCreateProject = async (event) => {
    event.preventDefault();

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setFormError('Project name is required.');
      return;
    }

    const parsedEmails = [...new Set(
      memberEmails
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    )];

    const invalidEmails = parsedEmails.filter((email) => !emailPattern.test(email));
    if (invalidEmails.length) {
      setFormError('Please remove invalid email addresses before creating the project.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = await apiRequest(
        '/api/projects',
        {
          method: 'POST',
          body: JSON.stringify({
            name: trimmedName,
            memberEmails: parsedEmails,
          }),
        },
        accessToken
      );

      const nextProjects = [payload.project, ...projects];
      setProjects(nextProjects);
      setProjectName('');
      setMemberEmails('');
      setIsCreating(false);
      navigate(`/project/${payload.project._id}/threads`);
    } catch (error) {
      setFormError(error.message || 'Unable to create this project.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-[14px] text-muted">Loading your projects…</p>;
  }

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Your projects" />

      <div className="mb-6 flex items-center justify-end">
        {!isCreating ? (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 rounded-full border border-blueprint/60 bg-blueprint/10 px-4 py-2 text-[14px] font-medium text-ink transition hover:border-blueprint hover:bg-blueprint/15"
          >
            <Plus size={16} />
            New project
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setFormError('');
            }}
            className="inline-flex items-center gap-2 rounded-full border border-hair bg-transparent px-4 py-2 text-[14px] text-muted transition hover:border-hair/80 hover:text-ink"
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreateProject} className="mb-8 rounded-2xl border border-hair bg-panel/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <div className="mb-4">
            <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-muted">
              Project name
            </label>
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="e.g. Cedar House Annex"
              className="w-full rounded-xl border border-hair bg-surface px-3 py-3 text-[15px] text-ink outline-none transition focus:border-blueprint"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-muted">
              Collaborators (optional)
            </label>
            <textarea
              value={memberEmails}
              onChange={(event) => setMemberEmails(event.target.value)}
              placeholder="name@example.com, another@example.com"
              rows={3}
              className="w-full resize-none rounded-xl border border-hair bg-surface px-3 py-3 text-[15px] text-ink outline-none transition focus:border-blueprint"
            />
            <p className="mt-2 text-[12px] text-muted">Use commas, semicolons or new lines to separate email addresses.</p>
          </div>

          {formError && <p className="mb-4 text-[13px] text-red-400">{formError}</p>}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setFormError('');
              }}
              className="rounded-full border border-hair px-4 py-2 text-[14px] text-muted transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-blueprint px-4 py-2 text-[14px] font-medium text-surface transition hover:bg-blueprint/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-5">
        {projects.length === 0 && !isCreating ? (
          <div className="rounded-2xl border border-dashed border-hair bg-panel/40 p-10 text-center">
            <p className="text-[18px] font-medium text-ink">No projects yet</p>
            <p className="mt-2 text-[14px] text-muted">
              Create a project to start tracking threads, actions, conflicts, and decisions.
            </p>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-blueprint px-4 py-2 text-[14px] font-medium text-surface transition hover:bg-blueprint/90"
            >
              <Plus size={16} />
              Create your first project
            </button>
          </div>
        ) : (
          projects.map((project) => {
            const channels = project.connectedChannels?.length ? project.connectedChannels : ['whatsapp'];
            const conflictCount = project.unresolvedConflictCount || 0;

            return (
              <Link
                key={project._id}
                to={`/project/${project._id}/threads`}
                className="project-card group"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full border border-hair bg-chip px-2 py-1 text-[12px] text-muted">
                        Active
                      </span>
                    </div>
                    <h2 className="font-serif text-[1.8rem] leading-none text-ink transition group-hover:text-blueprint">
                      {project.name}
                    </h2>
                    <p className="mt-2 text-[13px] text-muted">
                      Updated {new Date(project.lastActivity).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="metric-pill">
                      {conflictCount > 0 ? (
                        <span className="mark-open">{conflictCount} unresolved</span>
                      ) : (
                        <span className="text-muted">No conflicts</span>
                      )}
                    </div>
                    <div className="metric-pill">
                      <span className="text-muted">{project.pendingActionItems || 0} open</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-hair pt-4">
                  <div className="flex items-center gap-2 text-muted">
                    {channels.map((channel) => {
                      const Icon = channelIcons[channel] || MessageSquareText;
                      return <Icon key={channel} size={15} className="opacity-90" />;
                    })}
                  </div>

                  <span className="text-[13px] text-muted">Open project</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
