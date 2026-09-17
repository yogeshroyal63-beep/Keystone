import { Mail, MessageSquareText, ShieldAlert, UserCog } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <PageHeader back={{ to: '/dashboard', label: 'All projects' }} title="Channels & account" />

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="surface p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-ink">
            <UserCog size={17} className="text-blueprint" />
            <h2 className="font-serif text-[1.6rem]">Account</h2>
          </div>

          <div className="text-[14px] text-ink">
            <div className="record-row flex items-center justify-between">
              <span className="text-muted">Name</span>
              <strong className="font-medium text-ink">{user?.name}</strong>
            </div>
            <div className="record-row flex items-center justify-between">
              <span className="text-muted">Email</span>
              <strong className="font-medium text-ink">{user?.email}</strong>
            </div>
            <div className="record-row flex items-center justify-between">
              <span className="text-muted">Role</span>
              <strong className="font-medium text-ink">{user?.role || 'member'}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-6 inline-flex items-center rounded-full border border-hair bg-chip px-4 py-2 text-[13px] font-medium text-muted transition hover:border-blueprint hover:text-ink"
          >
            Log out
          </button>
        </section>

        <section className="surface p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-ink">
            <MessageSquareText size={17} className="text-blueprint" />
            <h2 className="font-serif text-[1.6rem]">Connected channels</h2>
          </div>

          <div>
            {[
              { name: 'WhatsApp', status: 'Connected', icon: MessageSquareText },
              { name: 'Email', status: 'Connected', icon: Mail },
              { name: 'Site notes', status: 'Connected', icon: ShieldAlert },
            ].map(({ name, status, icon: Icon }) => (
              <div key={name} className="record-row flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-[14px] text-ink">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-hair bg-chip text-blueprint">
                    <Icon size={15} />
                  </span>
                  <span>{name}</span>
                </div>
                <span className="text-[13px] font-medium text-blueprint">{status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
