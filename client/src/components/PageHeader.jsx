import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({ back, eyebrow, title, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-hair pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back ? (
          <Link to={back.to} className="ghost-button mb-3">
            <ArrowLeft size={14} />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-[13px] text-muted">{eyebrow}</p> : null}
        <h1 className="mt-2 font-serif text-[2.2rem] leading-none text-ink sm:text-[2.7rem]">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
