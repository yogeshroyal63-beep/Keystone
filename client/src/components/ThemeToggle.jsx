import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === 'dark' ? 'Light' : 'Dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="ghost-button"
      aria-label={`Switch to ${nextLabel.toLowerCase()} mode`}
    >
      {theme === 'dark' ? <SunMedium size={15} /> : <Moon size={15} />}
      {compact ? null : <span>{nextLabel}</span>}
    </button>
  );
}
