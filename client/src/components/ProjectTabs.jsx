import { NavLink } from 'react-router-dom';

const tabs = [
  { label: 'Thread', segment: 'threads' },
  { label: 'Tasks', segment: 'actions' },
  { label: 'Decisions', segment: 'decisions' },
  { label: 'Conflicts', segment: 'conflicts' },
  { label: 'Memory', segment: 'memory' },
];

export default function ProjectTabs({ projectId }) {
  return (
    <nav className="mb-6 flex gap-6 overflow-x-auto border-b border-hair">
      {tabs.map(({ label, segment }) => (
        <NavLink
          key={segment}
          to={`/project/${projectId}/${segment}`}
          className={({ isActive }) =>
            `whitespace-nowrap border-b-2 pb-3 text-[14px] transition ${
              isActive ? 'border-blueprint text-ink' : 'border-transparent text-muted hover:text-ink'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
